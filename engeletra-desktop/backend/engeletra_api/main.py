from __future__ import annotations

from datetime import date, timedelta

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import connect, init_db, row_to_dict, rows_to_dicts
from .security import LocalApiTokenMiddleware
from .schemas import (
    ClientIn, EquipmentIn, QuoteIn, ServiceOrderIn, StockItemIn,
    ObraIn, TecnicoIn, EnsaioIn, VeiculoIn, FrotaKmIn,
)
from .settings import ALLOWED_ORIGINS, STATIC_DIR

app = FastAPI(title="Engeletra ERP API", version="0.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(LocalApiTokenMiddleware)


@app.on_event("startup")
def startup():
    init_db()


def next_code(table: str, prefix: str) -> str:
    with connect() as conn:
        row = conn.execute(f"SELECT COUNT(*) AS total FROM {table}").fetchone()
        return f"{prefix}-{int(row['total']) + 1:04d}"


def quote_total(data: QuoteIn) -> float:
    munck = data.munck if data.veiculo == "Munck" else 0
    return (data.pessoas * data.horas * data.valor_hora) + (data.km * data.valor_km) + data.materiais + munck


def calc_impostos(valor: float) -> dict:
    return {
        "inss":   round(valor * 0.1100, 2),
        "iss":    round(valor * 0.0500, 2),
        "pis":    round(valor * 0.0065, 2),
        "cofins": round(valor * 0.0300, 2),
        "csll":   round(valor * 0.0100, 2),
        "irpj":   round(valor * 0.0150, 2),
    }


# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"ok": True}


# ─── Dashboard ────────────────────────────────────────────────────────────────

@app.get("/dashboard")
def dashboard():
    with connect() as conn:
        open_os       = conn.execute("SELECT COUNT(*) total FROM service_orders WHERE status = 'Aberto'").fetchone()["total"]
        progress_os   = conn.execute("SELECT COUNT(*) total FROM service_orders WHERE status = 'Em andamento'").fetchone()["total"]
        revenue       = conn.execute("SELECT COALESCE(SUM(valor), 0) total FROM invoices").fetchone()["total"]
        pending_quotes = conn.execute("SELECT COUNT(*) total FROM quotes WHERE status IN ('Rascunho', 'Enviado')").fetchone()["total"]
        obras_ativas  = conn.execute("SELECT COUNT(*) total FROM obras WHERE status = 'Em andamento'").fetchone()["total"]
        ensaios_mes   = conn.execute(
            "SELECT COUNT(*) total FROM ensaios WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')"
        ).fetchone()["total"]
        return {
            "open_os": open_os,
            "progress_os": progress_os,
            "revenue": revenue,
            "pending_quotes": pending_quotes,
            "obras_ativas": obras_ativas,
            "ensaios_mes": ensaios_mes,
        }


# ─── Clients ──────────────────────────────────────────────────────────────────

@app.get("/clients")
def list_clients():
    with connect() as conn:
        return rows_to_dicts(conn.execute("SELECT * FROM clients ORDER BY fantasia, razao").fetchall())


@app.post("/clients")
def create_client(data: ClientIn):
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO clients (razao,fantasia,cnpj,cidade,estado,responsavel,telefone,email,sla,historico) VALUES (?,?,?,?,?,?,?,?,?,?)",
            (data.razao, data.fantasia, data.cnpj, data.cidade, data.estado, data.responsavel, data.telefone, data.email, data.sla, data.historico),
        )
        return row_to_dict(conn.execute("SELECT * FROM clients WHERE id=?", (cur.lastrowid,)).fetchone())


@app.put("/clients/{client_id}")
def update_client(client_id: int, data: ClientIn):
    with connect() as conn:
        conn.execute(
            "UPDATE clients SET razao=?,fantasia=?,cnpj=?,cidade=?,estado=?,responsavel=?,telefone=?,email=?,sla=?,historico=? WHERE id=?",
            (data.razao, data.fantasia, data.cnpj, data.cidade, data.estado, data.responsavel, data.telefone, data.email, data.sla, data.historico, client_id),
        )
        row = conn.execute("SELECT * FROM clients WHERE id=?", (client_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Cliente não encontrado")
        return row_to_dict(row)


@app.delete("/clients/{client_id}")
def delete_client(client_id: int):
    with connect() as conn:
        checks = {
            "equipamentos": conn.execute("SELECT COUNT(*) total FROM equipment WHERE client_id=?", (client_id,)).fetchone()["total"],
            "orcamentos":   conn.execute("SELECT COUNT(*) total FROM quotes WHERE client_id=?", (client_id,)).fetchone()["total"],
            "ordens":       conn.execute("SELECT COUNT(*) total FROM service_orders WHERE client_id=?", (client_id,)).fetchone()["total"],
            "faturas":      conn.execute("SELECT COUNT(*) total FROM invoices WHERE client_id=?", (client_id,)).fetchone()["total"],
        }
        linked = {k: v for k, v in checks.items() if v}
        if linked:
            raise HTTPException(409, {"message": "Cliente possui vínculos e não pode ser excluído.", "linked": linked})
        conn.execute("DELETE FROM clients WHERE id=?", (client_id,))
        return {"deleted": True}


# ─── Equipment ────────────────────────────────────────────────────────────────

@app.get("/equipment")
def list_equipment():
    with connect() as conn:
        return rows_to_dicts(conn.execute("SELECT * FROM equipment ORDER BY id DESC").fetchall())


@app.post("/equipment")
def create_equipment(data: EquipmentIn):
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO equipment (client_id,tipo,serie,potencia,tensao,fabricante,ano,localizacao,ultima_manutencao,proxima_manutencao) VALUES (?,?,?,?,?,?,?,?,?,?)",
            (data.client_id, data.tipo, data.serie, data.potencia, data.tensao, data.fabricante, data.ano, data.localizacao, data.ultima_manutencao, data.proxima_manutencao),
        )
        return row_to_dict(conn.execute("SELECT * FROM equipment WHERE id=?", (cur.lastrowid,)).fetchone())


# ─── Quotes ───────────────────────────────────────────────────────────────────

@app.get("/quotes")
def list_quotes():
    with connect() as conn:
        return rows_to_dicts(conn.execute("SELECT * FROM quotes ORDER BY id DESC").fetchall())


@app.post("/quotes")
def create_quote(data: QuoteIn):
    total = quote_total(data)
    code = next_code("quotes", "ORC")
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO quotes (code,client_id,pessoas,horas,km,veiculo,valor_hora,valor_km,materiais,munck,total,observacoes,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (code, data.client_id, data.pessoas, data.horas, data.km, data.veiculo, data.valor_hora, data.valor_km, data.materiais, data.munck, total, data.observacoes, data.status),
        )
        quote = row_to_dict(conn.execute("SELECT * FROM quotes WHERE id=?", (cur.lastrowid,)).fetchone())
    if data.status == "Aprovado":
        approve_quote(quote["id"])
    return quote


@app.post("/quotes/{quote_id}/approve")
def approve_quote(quote_id: int):
    with connect() as conn:
        quote = conn.execute("SELECT * FROM quotes WHERE id=?", (quote_id,)).fetchone()
        if not quote:
            raise HTTPException(404, "Orçamento não encontrado")
        if quote["service_order_id"]:
            return row_to_dict(quote)
        os_code = next_code("service_orders", "OS")
        cur = conn.execute(
            "INSERT INTO service_orders (code,quote_id,client_id,status,valor_real) VALUES (?,?,?,'Aberto',?)",
            (os_code, quote_id, quote["client_id"], quote["total"]),
        )
        conn.execute("UPDATE quotes SET status='Aprovado', service_order_id=? WHERE id=?", (cur.lastrowid, quote_id))
        return row_to_dict(conn.execute("SELECT * FROM quotes WHERE id=?", (quote_id,)).fetchone())


# ─── Service Orders ───────────────────────────────────────────────────────────

@app.get("/service-orders")
def list_service_orders():
    with connect() as conn:
        return rows_to_dicts(conn.execute("SELECT * FROM service_orders ORDER BY id DESC").fetchall())


@app.post("/service-orders")
def create_service_order(data: ServiceOrderIn):
    code = next_code("service_orders", "OS")
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO service_orders (code,quote_id,client_id,equipment_id,obra_id,tecnico,status,data_agendada,horas_reais,km_real,valor_real,checklist,materiais) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (code, data.quote_id, data.client_id, data.equipment_id, data.obra_id, data.tecnico, data.status, data.data_agendada, data.horas_reais, data.km_real, data.valor_real, data.checklist, data.materiais),
        )
        order = row_to_dict(conn.execute("SELECT * FROM service_orders WHERE id=?", (cur.lastrowid,)).fetchone())
    if data.status == "Concluído":
        finish_service_order(order["id"])
    return order


@app.post("/service-orders/{order_id}/finish")
def finish_service_order(order_id: int):
    with connect() as conn:
        order = conn.execute("SELECT * FROM service_orders WHERE id=?", (order_id,)).fetchone()
        if not order:
            raise HTTPException(404, "OS não encontrada")
        conn.execute("UPDATE service_orders SET status='Concluído' WHERE id=?", (order_id,))
        existing = conn.execute("SELECT * FROM invoices WHERE service_order_id=?", (order_id,)).fetchone()
        if not existing:
            valor = order["valor_real"] or 0
            imp = calc_impostos(valor)
            liquido = round(valor - sum(imp.values()), 2)
            invoice_code = next_code("invoices", "FAT")
            emissao = date.today()
            vencimento = emissao + timedelta(days=30)
            conn.execute(
                "INSERT INTO invoices (code,service_order_id,client_id,valor,inss,iss,pis,cofins,csll,irpj,valor_liquido,emissao,vencimento,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'Aberto')",
                (invoice_code, order_id, order["client_id"], valor, imp["inss"], imp["iss"], imp["pis"], imp["cofins"], imp["csll"], imp["irpj"], liquido, emissao.isoformat(), vencimento.isoformat()),
            )
        return row_to_dict(conn.execute("SELECT * FROM service_orders WHERE id=?", (order_id,)).fetchone())


# ─── Invoices ─────────────────────────────────────────────────────────────────

@app.get("/invoices")
def list_invoices():
    with connect() as conn:
        return rows_to_dicts(conn.execute("SELECT * FROM invoices ORDER BY id DESC").fetchall())


# ─── Stock ────────────────────────────────────────────────────────────────────

@app.get("/stock")
def list_stock():
    with connect() as conn:
        return rows_to_dicts(conn.execute("SELECT * FROM stock_items ORDER BY item").fetchall())


@app.post("/stock")
def create_stock_item(data: StockItemIn):
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO stock_items (item,categoria,unidade,saldo,minimo,custo) VALUES (?,?,?,?,?,?)",
            (data.item, data.categoria, data.unidade, data.saldo, data.minimo, data.custo),
        )
        return row_to_dict(conn.execute("SELECT * FROM stock_items WHERE id=?", (cur.lastrowid,)).fetchone())


# ─── Obras ────────────────────────────────────────────────────────────────────

@app.get("/obras")
def list_obras():
    with connect() as conn:
        return rows_to_dicts(conn.execute("SELECT * FROM obras ORDER BY id DESC").fetchall())


@app.post("/obras")
def create_obra(data: ObraIn):
    code = next_code("obras", "SERV")
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO obras (code,nome,client_id,status,data_inicio,data_previsao,data_conclusao,valor_contrato,descricao) VALUES (?,?,?,?,?,?,?,?,?)",
            (code, data.nome, data.client_id, data.status, data.data_inicio, data.data_previsao, data.data_conclusao, data.valor_contrato, data.descricao),
        )
        return row_to_dict(conn.execute("SELECT * FROM obras WHERE id=?", (cur.lastrowid,)).fetchone())


@app.put("/obras/{obra_id}")
def update_obra(obra_id: int, data: ObraIn):
    with connect() as conn:
        conn.execute(
            "UPDATE obras SET nome=?,client_id=?,status=?,data_inicio=?,data_previsao=?,data_conclusao=?,valor_contrato=?,descricao=? WHERE id=?",
            (data.nome, data.client_id, data.status, data.data_inicio, data.data_previsao, data.data_conclusao, data.valor_contrato, data.descricao, obra_id),
        )
        row = conn.execute("SELECT * FROM obras WHERE id=?", (obra_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Obra não encontrada")
        return row_to_dict(row)


@app.delete("/obras/{obra_id}")
def delete_obra(obra_id: int):
    with connect() as conn:
        conn.execute("DELETE FROM obras WHERE id=?", (obra_id,))
        return {"deleted": True}


# ─── Técnicos ─────────────────────────────────────────────────────────────────

@app.get("/tecnicos")
def list_tecnicos():
    with connect() as conn:
        return rows_to_dicts(conn.execute("SELECT * FROM tecnicos ORDER BY nome").fetchall())


@app.post("/tecnicos")
def create_tecnico(data: TecnicoIn):
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO tecnicos (nome,codigo,cargo,telefone,email,valor_hora,ativo) VALUES (?,?,?,?,?,?,?)",
            (data.nome, data.codigo, data.cargo, data.telefone, data.email, data.valor_hora, data.ativo),
        )
        return row_to_dict(conn.execute("SELECT * FROM tecnicos WHERE id=?", (cur.lastrowid,)).fetchone())


@app.put("/tecnicos/{tecnico_id}")
def update_tecnico(tecnico_id: int, data: TecnicoIn):
    with connect() as conn:
        conn.execute(
            "UPDATE tecnicos SET nome=?,codigo=?,cargo=?,telefone=?,email=?,valor_hora=?,ativo=? WHERE id=?",
            (data.nome, data.codigo, data.cargo, data.telefone, data.email, data.valor_hora, data.ativo, tecnico_id),
        )
        row = conn.execute("SELECT * FROM tecnicos WHERE id=?", (tecnico_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Técnico não encontrado")
        return row_to_dict(row)


@app.delete("/tecnicos/{tecnico_id}")
def delete_tecnico(tecnico_id: int):
    with connect() as conn:
        conn.execute("DELETE FROM tecnicos WHERE id=?", (tecnico_id,))
        return {"deleted": True}


# ─── Ensaios ──────────────────────────────────────────────────────────────────

@app.get("/ensaios")
def list_ensaios():
    with connect() as conn:
        return rows_to_dicts(conn.execute("SELECT * FROM ensaios ORDER BY id DESC").fetchall())


@app.post("/ensaios")
def create_ensaio(data: EnsaioIn):
    code = next_code("ensaios", "ENS")
    with connect() as conn:
        cur = conn.execute(
            """INSERT INTO ensaios
            (code,client_id,obra_id,service_order_id,equipment_id,tecnico,data_ensaio,tipo_ensaio,
            fabricante,numero_serie,potencia,tensao_at,tensao_bt,ano_fabricacao,volume_oleo,massa_total,
            megger_at_terra,megger_bt_terra,megger_at_bt,fp_at,fp_bt,
            ttr_tap,ttr_relacao_teorica,ttr_relacao_medida,resistencia_at,resistencia_bt,
            resultado,observacoes,conclusao)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (code, data.client_id, data.obra_id, data.service_order_id, data.equipment_id,
             data.tecnico, data.data_ensaio, data.tipo_ensaio,
             data.fabricante, data.numero_serie, data.potencia, data.tensao_at, data.tensao_bt,
             data.ano_fabricacao, data.volume_oleo, data.massa_total,
             data.megger_at_terra, data.megger_bt_terra, data.megger_at_bt,
             data.fp_at, data.fp_bt,
             data.ttr_tap, data.ttr_relacao_teorica, data.ttr_relacao_medida,
             data.resistencia_at, data.resistencia_bt,
             data.resultado, data.observacoes, data.conclusao),
        )
        return row_to_dict(conn.execute("SELECT * FROM ensaios WHERE id=?", (cur.lastrowid,)).fetchone())


@app.put("/ensaios/{ensaio_id}")
def update_ensaio(ensaio_id: int, data: EnsaioIn):
    with connect() as conn:
        conn.execute(
            """UPDATE ensaios SET
            client_id=?,obra_id=?,service_order_id=?,equipment_id=?,tecnico=?,data_ensaio=?,tipo_ensaio=?,
            fabricante=?,numero_serie=?,potencia=?,tensao_at=?,tensao_bt=?,ano_fabricacao=?,volume_oleo=?,massa_total=?,
            megger_at_terra=?,megger_bt_terra=?,megger_at_bt=?,fp_at=?,fp_bt=?,
            ttr_tap=?,ttr_relacao_teorica=?,ttr_relacao_medida=?,resistencia_at=?,resistencia_bt=?,
            resultado=?,observacoes=?,conclusao=?
            WHERE id=?""",
            (data.client_id, data.obra_id, data.service_order_id, data.equipment_id,
             data.tecnico, data.data_ensaio, data.tipo_ensaio,
             data.fabricante, data.numero_serie, data.potencia, data.tensao_at, data.tensao_bt,
             data.ano_fabricacao, data.volume_oleo, data.massa_total,
             data.megger_at_terra, data.megger_bt_terra, data.megger_at_bt,
             data.fp_at, data.fp_bt,
             data.ttr_tap, data.ttr_relacao_teorica, data.ttr_relacao_medida,
             data.resistencia_at, data.resistencia_bt,
             data.resultado, data.observacoes, data.conclusao, ensaio_id),
        )
        row = conn.execute("SELECT * FROM ensaios WHERE id=?", (ensaio_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Ensaio não encontrado")
        return row_to_dict(row)


# ─── Veículos ─────────────────────────────────────────────────────────────────

@app.get("/veiculos")
def list_veiculos():
    with connect() as conn:
        return rows_to_dicts(conn.execute("SELECT * FROM veiculos ORDER BY modelo").fetchall())


@app.post("/veiculos")
def create_veiculo(data: VeiculoIn):
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO veiculos (placa,modelo,tipo,km_atual,ano,cor,ativo) VALUES (?,?,?,?,?,?,?)",
            (data.placa, data.modelo, data.tipo, data.km_atual, data.ano, data.cor, data.ativo),
        )
        return row_to_dict(conn.execute("SELECT * FROM veiculos WHERE id=?", (cur.lastrowid,)).fetchone())


@app.put("/veiculos/{veiculo_id}")
def update_veiculo(veiculo_id: int, data: VeiculoIn):
    with connect() as conn:
        conn.execute(
            "UPDATE veiculos SET placa=?,modelo=?,tipo=?,km_atual=?,ano=?,cor=?,ativo=? WHERE id=?",
            (data.placa, data.modelo, data.tipo, data.km_atual, data.ano, data.cor, data.ativo, veiculo_id),
        )
        row = conn.execute("SELECT * FROM veiculos WHERE id=?", (veiculo_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Veículo não encontrado")
        return row_to_dict(row)


# ─── Frota KM Diário ──────────────────────────────────────────────────────────

@app.get("/frota-km")
def list_frota_km():
    with connect() as conn:
        return rows_to_dicts(conn.execute("SELECT * FROM frota_km ORDER BY data DESC, id DESC").fetchall())


@app.post("/frota-km")
def create_frota_km(data: FrotaKmIn):
    km_rodado = max(0.0, data.km_final - data.km_inicial)
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO frota_km (veiculo_id,data,km_inicial,km_final,km_rodado,motorista,obra_id,abastecimento,observacao) VALUES (?,?,?,?,?,?,?,?,?)",
            (data.veiculo_id, data.data, data.km_inicial, data.km_final, km_rodado, data.motorista, data.obra_id, data.abastecimento, data.observacao),
        )
        conn.execute("UPDATE veiculos SET km_atual=? WHERE id=? AND km_atual < ?", (data.km_final, data.veiculo_id, data.km_final))
        return row_to_dict(conn.execute("SELECT * FROM frota_km WHERE id=?", (cur.lastrowid,)).fetchone())


if STATIC_DIR.is_dir():
    app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="spa")
