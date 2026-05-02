from __future__ import annotations

import json
from datetime import date, timedelta

from fastapi import APIRouter, Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import connect, init_db, row_to_dict, rows_to_dicts
from .security import create_access_token, hash_password, verify_password, verify_token, require_admin
from .schemas import (
    ClientIn, EquipmentIn, QuoteIn, ServiceOrderIn, StockItemIn,
    ObraIn, TecnicoIn, EnsaioIn, VeiculoIn, FrotaKmIn,
    FornecedorIn, DespesaIn, ContaBancariaIn, PontoIn, FolhaIn,
    PedidoCompraIn, FrotaManutIn, CronogramaIn, InvoiceUpdateIn,
    LoginIn, TokenOut, UserIn, ImpostoItem,
)
from .settings import ALLOWED_ORIGINS, STATIC_DIR

app = FastAPI(title="Engeletra ERP API", version="0.4.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Rotas protegidas — qualquer endpoint aqui exige JWT válido.
protected = APIRouter(dependencies=[Depends(verify_token)])


@app.on_event("startup")
def startup():
    init_db()


_CODE_TABLES = {"quotes", "service_orders", "invoices", "obras", "ensaios", "pedidos_compra"}

def next_code(table: str, prefix: str) -> str:
    if table not in _CODE_TABLES:
        raise ValueError(f"Tabela inválida: {table}")
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


# ─── Público ──────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"ok": True}


@app.post("/auth/login", response_model=TokenOut)
def login(data: LoginIn):
    with connect() as conn:
        row = conn.execute("SELECT * FROM users WHERE username=?", (data.username,)).fetchone()
    if not row or not verify_password(data.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Usuário ou senha incorretos")
    role = row["role"] or "user"
    return TokenOut(access_token=create_access_token(data.username, role), role=role)


# ─── Dashboard ────────────────────────────────────────────────────────────────

@protected.get("/dashboard")
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

@protected.get("/clients")
def list_clients():
    with connect() as conn:
        return rows_to_dicts(conn.execute("SELECT * FROM clients ORDER BY fantasia, razao").fetchall())


@protected.post("/clients")
def create_client(data: ClientIn):
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO clients (razao,fantasia,cnpj,cidade,estado,responsavel,telefone,email,sla,historico) VALUES (?,?,?,?,?,?,?,?,?,?)",
            (data.razao, data.fantasia, data.cnpj, data.cidade, data.estado, data.responsavel, data.telefone, data.email, data.sla, data.historico),
        )
        return row_to_dict(conn.execute("SELECT * FROM clients WHERE id=?", (cur.lastrowid,)).fetchone())


@protected.put("/clients/{client_id}")
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


@protected.delete("/clients/{client_id}")
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

@protected.get("/equipment")
def list_equipment():
    with connect() as conn:
        return rows_to_dicts(conn.execute("SELECT * FROM equipment ORDER BY id DESC").fetchall())


@protected.post("/equipment")
def create_equipment(data: EquipmentIn):
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO equipment (client_id,tipo,serie,potencia,tensao,fabricante,ano,localizacao,ultima_manutencao,proxima_manutencao) VALUES (?,?,?,?,?,?,?,?,?,?)",
            (data.client_id, data.tipo, data.serie, data.potencia, data.tensao, data.fabricante, data.ano, data.localizacao, data.ultima_manutencao, data.proxima_manutencao),
        )
        return row_to_dict(conn.execute("SELECT * FROM equipment WHERE id=?", (cur.lastrowid,)).fetchone())


@protected.put("/equipment/{eq_id}")
def update_equipment(eq_id: int, data: EquipmentIn):
    with connect() as conn:
        if not conn.execute("SELECT id FROM equipment WHERE id=?", (eq_id,)).fetchone():
            raise HTTPException(404, "Equipamento não encontrado")
        conn.execute(
            "UPDATE equipment SET client_id=?,tipo=?,serie=?,potencia=?,tensao=?,fabricante=?,ano=?,localizacao=?,ultima_manutencao=?,proxima_manutencao=? WHERE id=?",
            (data.client_id, data.tipo, data.serie, data.potencia, data.tensao, data.fabricante, data.ano, data.localizacao, data.ultima_manutencao, data.proxima_manutencao, eq_id),
        )
        return row_to_dict(conn.execute("SELECT * FROM equipment WHERE id=?", (eq_id,)).fetchone())


# ─── Quotes ───────────────────────────────────────────────────────────────────

@protected.get("/quotes")
def list_quotes():
    with connect() as conn:
        return rows_to_dicts(conn.execute("SELECT * FROM quotes ORDER BY id DESC").fetchall())


@protected.post("/quotes")
def create_quote(data: QuoteIn):
    total = quote_total(data)
    code = next_code("quotes", "ORC")
    impostos_json = json.dumps([i.model_dump() for i in data.impostos]) if data.impostos else None
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO quotes (code,client_id,pessoas,horas,km,veiculo,valor_hora,valor_km,materiais,munck,total,observacoes,status,impostos) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (code, data.client_id, data.pessoas, data.horas, data.km, data.veiculo, data.valor_hora, data.valor_km, data.materiais, data.munck, total, data.observacoes, data.status, impostos_json),
        )
        quote = row_to_dict(conn.execute("SELECT * FROM quotes WHERE id=?", (cur.lastrowid,)).fetchone())
    if data.status == "Aprovado":
        approve_quote(quote["id"])
    return quote


@protected.put("/quotes/{quote_id}")
def update_quote(quote_id: int, data: QuoteIn):
    total = quote_total(data)
    impostos_json = json.dumps([i.model_dump() for i in data.impostos]) if data.impostos else None
    with connect() as conn:
        row = conn.execute("SELECT id FROM quotes WHERE id=?", (quote_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Orçamento não encontrado")
        conn.execute(
            "UPDATE quotes SET client_id=?,pessoas=?,horas=?,km=?,veiculo=?,valor_hora=?,valor_km=?,materiais=?,munck=?,total=?,observacoes=?,status=?,impostos=? WHERE id=?",
            (data.client_id, data.pessoas, data.horas, data.km, data.veiculo, data.valor_hora, data.valor_km, data.materiais, data.munck, total, data.observacoes, data.status, impostos_json, quote_id),
        )
        return row_to_dict(conn.execute("SELECT * FROM quotes WHERE id=?", (quote_id,)).fetchone())


@protected.post("/quotes/{quote_id}/approve")
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

@protected.get("/service-orders")
def list_service_orders():
    with connect() as conn:
        return rows_to_dicts(conn.execute("SELECT * FROM service_orders ORDER BY id DESC").fetchall())


@protected.post("/service-orders")
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


@protected.put("/service-orders/{order_id}")
def update_service_order(order_id: int, data: ServiceOrderIn):
    with connect() as conn:
        row = conn.execute("SELECT id FROM service_orders WHERE id=?", (order_id,)).fetchone()
        if not row:
            raise HTTPException(404, "OS não encontrada")
        conn.execute(
            "UPDATE service_orders SET client_id=?,quote_id=?,equipment_id=?,obra_id=?,tecnico=?,status=?,data_agendada=?,horas_reais=?,km_real=?,valor_real=?,checklist=?,materiais=? WHERE id=?",
            (data.client_id, data.quote_id, data.equipment_id, data.obra_id, data.tecnico, data.status, data.data_agendada, data.horas_reais, data.km_real, data.valor_real, data.checklist, data.materiais, order_id),
        )
        order = row_to_dict(conn.execute("SELECT * FROM service_orders WHERE id=?", (order_id,)).fetchone())
    if data.status == "Concluído":
        finish_service_order(order_id)
    return order


@protected.post("/service-orders/{order_id}/finish")
def finish_service_order(order_id: int):
    with connect() as conn:
        order = conn.execute("SELECT * FROM service_orders WHERE id=?", (order_id,)).fetchone()
        if not order:
            raise HTTPException(404, "OS não encontrada")
        conn.execute("UPDATE service_orders SET status='Concluído' WHERE id=?", (order_id,))
        existing = conn.execute("SELECT * FROM invoices WHERE service_order_id=?", (order_id,)).fetchone()
        if not existing:
            valor = order["valor_real"] or 0

            # Usa impostos do orçamento vinculado; senão aplica os padrões
            impostos_json = None
            if order["quote_id"]:
                q = conn.execute("SELECT impostos FROM quotes WHERE id=?", (order["quote_id"],)).fetchone()
                if q and q["impostos"]:
                    impostos_json = q["impostos"]

            if impostos_json:
                impostos_list = json.loads(impostos_json)
                total_imp = sum(i["valor"] for i in impostos_list)
                liquido = round(valor - total_imp, 2)
                imp_map = {i["nome"].upper(): i["valor"] for i in impostos_list}
                inss   = imp_map.get("INSS", 0)
                iss    = imp_map.get("ISS", 0)
                pis    = imp_map.get("PIS", 0)
                cofins = imp_map.get("COFINS", 0)
                csll   = imp_map.get("CSLL", 0)
                irpj   = imp_map.get("IRPJ", 0)
            else:
                imp = calc_impostos(valor)
                inss, iss, pis, cofins, csll, irpj = imp["inss"], imp["iss"], imp["pis"], imp["cofins"], imp["csll"], imp["irpj"]
                liquido = round(valor - sum(imp.values()), 2)
                impostos_json = json.dumps([
                    {"nome": "INSS",   "percentual": 11.0,  "valor": inss},
                    {"nome": "ISS",    "percentual": 5.0,   "valor": iss},
                    {"nome": "PIS",    "percentual": 0.65,  "valor": pis},
                    {"nome": "COFINS", "percentual": 3.0,   "valor": cofins},
                    {"nome": "CSLL",   "percentual": 1.0,   "valor": csll},
                    {"nome": "IRPJ",   "percentual": 1.5,   "valor": irpj},
                ])

            invoice_code = next_code("invoices", "FAT")
            emissao   = date.today()
            vencimento = emissao + timedelta(days=30)
            conn.execute(
                "INSERT INTO invoices (code,service_order_id,client_id,valor,inss,iss,pis,cofins,csll,irpj,valor_liquido,emissao,vencimento,status,impostos) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'Aberto',?)",
                (invoice_code, order_id, order["client_id"], valor, inss, iss, pis, cofins, csll, irpj, liquido, emissao.isoformat(), vencimento.isoformat(), impostos_json),
            )
        return row_to_dict(conn.execute("SELECT * FROM service_orders WHERE id=?", (order_id,)).fetchone())


# ─── Invoices ─────────────────────────────────────────────────────────────────

@protected.get("/invoices")
def list_invoices():
    with connect() as conn:
        return rows_to_dicts(conn.execute("SELECT * FROM invoices ORDER BY id DESC").fetchall())


@protected.put("/invoices/{invoice_id}")
def update_invoice(invoice_id: int, data: InvoiceUpdateIn):
    with connect() as conn:
        conn.execute(
            "UPDATE invoices SET status=?, numero_nf=?, data_recebimento=? WHERE id=?",
            (data.status, data.numero_nf, data.data_recebimento, invoice_id),
        )
        row = conn.execute("SELECT * FROM invoices WHERE id=?", (invoice_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Fatura não encontrada")
        return row_to_dict(row)


# ─── Stock ────────────────────────────────────────────────────────────────────

@protected.get("/stock")
def list_stock():
    with connect() as conn:
        return rows_to_dicts(conn.execute("SELECT * FROM stock_items ORDER BY item").fetchall())


@protected.post("/stock")
def create_stock_item(data: StockItemIn):
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO stock_items (item,categoria,unidade,saldo,minimo,custo) VALUES (?,?,?,?,?,?)",
            (data.item, data.categoria, data.unidade, data.saldo, data.minimo, data.custo),
        )
        return row_to_dict(conn.execute("SELECT * FROM stock_items WHERE id=?", (cur.lastrowid,)).fetchone())


@protected.put("/stock/{item_id}")
def update_stock_item(item_id: int, data: StockItemIn):
    with connect() as conn:
        if not conn.execute("SELECT id FROM stock_items WHERE id=?", (item_id,)).fetchone():
            raise HTTPException(404, "Item não encontrado")
        conn.execute(
            "UPDATE stock_items SET item=?,categoria=?,unidade=?,saldo=?,minimo=?,custo=? WHERE id=?",
            (data.item, data.categoria, data.unidade, data.saldo, data.minimo, data.custo, item_id),
        )
        return row_to_dict(conn.execute("SELECT * FROM stock_items WHERE id=?", (item_id,)).fetchone())


# ─── Obras ────────────────────────────────────────────────────────────────────

@protected.get("/obras")
def list_obras():
    with connect() as conn:
        return rows_to_dicts(conn.execute("SELECT * FROM obras ORDER BY id DESC").fetchall())


@protected.post("/obras")
def create_obra(data: ObraIn):
    code = next_code("obras", "SERV")
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO obras (code,nome,client_id,status,data_inicio,data_previsao,data_conclusao,valor_contrato,descricao) VALUES (?,?,?,?,?,?,?,?,?)",
            (code, data.nome, data.client_id, data.status, data.data_inicio, data.data_previsao, data.data_conclusao, data.valor_contrato, data.descricao),
        )
        return row_to_dict(conn.execute("SELECT * FROM obras WHERE id=?", (cur.lastrowid,)).fetchone())


@protected.put("/obras/{obra_id}")
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


@protected.delete("/obras/{obra_id}")
def delete_obra(obra_id: int):
    with connect() as conn:
        conn.execute("DELETE FROM obras WHERE id=?", (obra_id,))
        return {"deleted": True}


# ─── Técnicos ─────────────────────────────────────────────────────────────────

@protected.get("/tecnicos")
def list_tecnicos():
    with connect() as conn:
        return rows_to_dicts(conn.execute("SELECT * FROM tecnicos ORDER BY nome").fetchall())


@protected.post("/tecnicos")
def create_tecnico(data: TecnicoIn):
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO tecnicos (nome,codigo,cargo,telefone,email,valor_hora,ativo) VALUES (?,?,?,?,?,?,?)",
            (data.nome, data.codigo, data.cargo, data.telefone, data.email, data.valor_hora, data.ativo),
        )
        return row_to_dict(conn.execute("SELECT * FROM tecnicos WHERE id=?", (cur.lastrowid,)).fetchone())


@protected.put("/tecnicos/{tecnico_id}")
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


@protected.delete("/tecnicos/{tecnico_id}")
def delete_tecnico(tecnico_id: int):
    with connect() as conn:
        conn.execute("DELETE FROM tecnicos WHERE id=?", (tecnico_id,))
        return {"deleted": True}


# ─── Ensaios ──────────────────────────────────────────────────────────────────

@protected.get("/ensaios")
def list_ensaios():
    with connect() as conn:
        return rows_to_dicts(conn.execute("SELECT * FROM ensaios ORDER BY id DESC").fetchall())


@protected.post("/ensaios")
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


@protected.put("/ensaios/{ensaio_id}")
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

@protected.get("/veiculos")
def list_veiculos():
    with connect() as conn:
        return rows_to_dicts(conn.execute("SELECT * FROM veiculos ORDER BY modelo").fetchall())


@protected.post("/veiculos")
def create_veiculo(data: VeiculoIn):
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO veiculos (placa,modelo,tipo,km_atual,ano,cor,ativo) VALUES (?,?,?,?,?,?,?)",
            (data.placa, data.modelo, data.tipo, data.km_atual, data.ano, data.cor, data.ativo),
        )
        return row_to_dict(conn.execute("SELECT * FROM veiculos WHERE id=?", (cur.lastrowid,)).fetchone())


@protected.put("/veiculos/{veiculo_id}")
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

@protected.get("/frota-km")
def list_frota_km():
    with connect() as conn:
        return rows_to_dicts(conn.execute("SELECT * FROM frota_km ORDER BY data DESC, id DESC").fetchall())


@protected.post("/frota-km")
def create_frota_km(data: FrotaKmIn):
    km_rodado = max(0.0, data.km_final - data.km_inicial)
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO frota_km (veiculo_id,data,km_inicial,km_final,km_rodado,motorista,obra_id,abastecimento,observacao) VALUES (?,?,?,?,?,?,?,?,?)",
            (data.veiculo_id, data.data, data.km_inicial, data.km_final, km_rodado, data.motorista, data.obra_id, data.abastecimento, data.observacao),
        )
        conn.execute("UPDATE veiculos SET km_atual=? WHERE id=? AND km_atual < ?", (data.km_final, data.veiculo_id, data.km_final))
        return row_to_dict(conn.execute("SELECT * FROM frota_km WHERE id=?", (cur.lastrowid,)).fetchone())


# ─── Fornecedores ─────────────────────────────────────────────────────────────

@protected.get("/fornecedores")
def list_fornecedores():
    with connect() as conn:
        return rows_to_dicts(conn.execute("SELECT * FROM fornecedores ORDER BY fantasia, razao").fetchall())


@protected.post("/fornecedores")
def create_fornecedor(data: FornecedorIn):
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO fornecedores (razao,fantasia,cnpj,categoria,telefone,email,contato,observacao) VALUES (?,?,?,?,?,?,?,?)",
            (data.razao, data.fantasia, data.cnpj, data.categoria, data.telefone, data.email, data.contato, data.observacao),
        )
        return row_to_dict(conn.execute("SELECT * FROM fornecedores WHERE id=?", (cur.lastrowid,)).fetchone())


@protected.put("/fornecedores/{forn_id}")
def update_fornecedor(forn_id: int, data: FornecedorIn):
    with connect() as conn:
        conn.execute(
            "UPDATE fornecedores SET razao=?,fantasia=?,cnpj=?,categoria=?,telefone=?,email=?,contato=?,observacao=? WHERE id=?",
            (data.razao, data.fantasia, data.cnpj, data.categoria, data.telefone, data.email, data.contato, data.observacao, forn_id),
        )
        row = conn.execute("SELECT * FROM fornecedores WHERE id=?", (forn_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Fornecedor não encontrado")
        return row_to_dict(row)


@protected.delete("/fornecedores/{forn_id}")
def delete_fornecedor(forn_id: int):
    with connect() as conn:
        conn.execute("DELETE FROM fornecedores WHERE id=?", (forn_id,))
        return {"deleted": True}


# ─── Despesas ─────────────────────────────────────────────────────────────────

@protected.get("/despesas")
def list_despesas():
    with connect() as conn:
        return rows_to_dicts(conn.execute("SELECT * FROM despesas ORDER BY data DESC, id DESC").fetchall())


@protected.post("/despesas")
def create_despesa(data: DespesaIn):
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO despesas (descricao,categoria,valor,data,data_vencimento,data_pagamento,status,obra_id,fornecedor,documento,observacao) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            (data.descricao, data.categoria, data.valor, data.data, data.data_vencimento, data.data_pagamento, data.status, data.obra_id, data.fornecedor, data.documento, data.observacao),
        )
        return row_to_dict(conn.execute("SELECT * FROM despesas WHERE id=?", (cur.lastrowid,)).fetchone())


@protected.put("/despesas/{desp_id}")
def update_despesa(desp_id: int, data: DespesaIn):
    with connect() as conn:
        conn.execute(
            "UPDATE despesas SET descricao=?,categoria=?,valor=?,data=?,data_vencimento=?,data_pagamento=?,status=?,obra_id=?,fornecedor=?,documento=?,observacao=? WHERE id=?",
            (data.descricao, data.categoria, data.valor, data.data, data.data_vencimento, data.data_pagamento, data.status, data.obra_id, data.fornecedor, data.documento, data.observacao, desp_id),
        )
        row = conn.execute("SELECT * FROM despesas WHERE id=?", (desp_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Despesa não encontrada")
        return row_to_dict(row)


@protected.delete("/despesas/{desp_id}")
def delete_despesa(desp_id: int):
    with connect() as conn:
        conn.execute("DELETE FROM despesas WHERE id=?", (desp_id,))
        return {"deleted": True}


# ─── Contas Bancárias ─────────────────────────────────────────────────────────

@protected.get("/contas-bancarias")
def list_contas():
    with connect() as conn:
        return rows_to_dicts(conn.execute("SELECT * FROM contas_bancarias ORDER BY banco").fetchall())


@protected.post("/contas-bancarias")
def create_conta(data: ContaBancariaIn):
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO contas_bancarias (banco,agencia,conta,tipo,saldo_atual,ativo) VALUES (?,?,?,?,?,?)",
            (data.banco, data.agencia, data.conta, data.tipo, data.saldo_atual, data.ativo),
        )
        return row_to_dict(conn.execute("SELECT * FROM contas_bancarias WHERE id=?", (cur.lastrowid,)).fetchone())


@protected.put("/contas-bancarias/{conta_id}")
def update_conta(conta_id: int, data: ContaBancariaIn):
    with connect() as conn:
        conn.execute(
            "UPDATE contas_bancarias SET banco=?,agencia=?,conta=?,tipo=?,saldo_atual=?,ativo=? WHERE id=?",
            (data.banco, data.agencia, data.conta, data.tipo, data.saldo_atual, data.ativo, conta_id),
        )
        row = conn.execute("SELECT * FROM contas_bancarias WHERE id=?", (conta_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Conta não encontrada")
        return row_to_dict(row)


@protected.delete("/contas-bancarias/{conta_id}")
def delete_conta(conta_id: int):
    with connect() as conn:
        conn.execute("DELETE FROM contas_bancarias WHERE id=?", (conta_id,))
        return {"deleted": True}


# ─── Ponto ────────────────────────────────────────────────────────────────────

@protected.get("/ponto")
def list_ponto():
    with connect() as conn:
        return rows_to_dicts(conn.execute("SELECT * FROM ponto ORDER BY data DESC, id DESC").fetchall())


@protected.post("/ponto")
def create_ponto(data: PontoIn):
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO ponto (tecnico_id,data,entrada,almoco_saida,almoco_volta,saida,tipo,horas_extras,observacao) VALUES (?,?,?,?,?,?,?,?,?)",
            (data.tecnico_id, data.data, data.entrada, data.almoco_saida, data.almoco_volta, data.saida, data.tipo, data.horas_extras, data.observacao),
        )
        return row_to_dict(conn.execute("SELECT * FROM ponto WHERE id=?", (cur.lastrowid,)).fetchone())


@protected.put("/ponto/{ponto_id}")
def update_ponto(ponto_id: int, data: PontoIn):
    with connect() as conn:
        conn.execute(
            "UPDATE ponto SET tecnico_id=?,data=?,entrada=?,almoco_saida=?,almoco_volta=?,saida=?,tipo=?,horas_extras=?,observacao=? WHERE id=?",
            (data.tecnico_id, data.data, data.entrada, data.almoco_saida, data.almoco_volta, data.saida, data.tipo, data.horas_extras, data.observacao, ponto_id),
        )
        row = conn.execute("SELECT * FROM ponto WHERE id=?", (ponto_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Registro não encontrado")
        return row_to_dict(row)


@protected.delete("/ponto/{ponto_id}")
def delete_ponto(ponto_id: int):
    with connect() as conn:
        conn.execute("DELETE FROM ponto WHERE id=?", (ponto_id,))
        return {"deleted": True}


# ─── Folha de Pagamento ───────────────────────────────────────────────────────

@protected.get("/folha")
def list_folha():
    with connect() as conn:
        return rows_to_dicts(conn.execute("SELECT * FROM folha ORDER BY ano DESC, mes DESC, id").fetchall())


@protected.post("/folha")
def create_folha(data: FolhaIn):
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO folha (tecnico_id,mes,ano,salario_base,horas_extras,valor_extras,total_bruto,descontos,total_liquido,status,observacao) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            (data.tecnico_id, data.mes, data.ano, data.salario_base, data.horas_extras, data.valor_extras, data.total_bruto, data.descontos, data.total_liquido, data.status, data.observacao),
        )
        return row_to_dict(conn.execute("SELECT * FROM folha WHERE id=?", (cur.lastrowid,)).fetchone())


@protected.put("/folha/{folha_id}")
def update_folha(folha_id: int, data: FolhaIn):
    with connect() as conn:
        conn.execute(
            "UPDATE folha SET tecnico_id=?,mes=?,ano=?,salario_base=?,horas_extras=?,valor_extras=?,total_bruto=?,descontos=?,total_liquido=?,status=?,observacao=? WHERE id=?",
            (data.tecnico_id, data.mes, data.ano, data.salario_base, data.horas_extras, data.valor_extras, data.total_bruto, data.descontos, data.total_liquido, data.status, data.observacao, folha_id),
        )
        row = conn.execute("SELECT * FROM folha WHERE id=?", (folha_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Registro não encontrado")
        return row_to_dict(row)


@protected.delete("/folha/{folha_id}")
def delete_folha(folha_id: int):
    with connect() as conn:
        conn.execute("DELETE FROM folha WHERE id=?", (folha_id,))
        return {"deleted": True}


# ─── Pedidos de Compra ────────────────────────────────────────────────────────

@protected.get("/pedidos-compra")
def list_pedidos():
    with connect() as conn:
        return rows_to_dicts(conn.execute("SELECT * FROM pedidos_compra ORDER BY id DESC").fetchall())


@protected.post("/pedidos-compra")
def create_pedido(data: PedidoCompraIn):
    code = next_code("pedidos_compra", "PED")
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO pedidos_compra (code,fornecedor,data,data_entrega,status,obra_id,descricao,valor_total,observacao) VALUES (?,?,?,?,?,?,?,?,?)",
            (code, data.fornecedor, data.data, data.data_entrega, data.status, data.obra_id, data.descricao, data.valor_total, data.observacao),
        )
        return row_to_dict(conn.execute("SELECT * FROM pedidos_compra WHERE id=?", (cur.lastrowid,)).fetchone())


@protected.put("/pedidos-compra/{pedido_id}")
def update_pedido(pedido_id: int, data: PedidoCompraIn):
    with connect() as conn:
        conn.execute(
            "UPDATE pedidos_compra SET fornecedor=?,data=?,data_entrega=?,status=?,obra_id=?,descricao=?,valor_total=?,observacao=? WHERE id=?",
            (data.fornecedor, data.data, data.data_entrega, data.status, data.obra_id, data.descricao, data.valor_total, data.observacao, pedido_id),
        )
        row = conn.execute("SELECT * FROM pedidos_compra WHERE id=?", (pedido_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Pedido não encontrado")
        return row_to_dict(row)


@protected.delete("/pedidos-compra/{pedido_id}")
def delete_pedido(pedido_id: int):
    with connect() as conn:
        conn.execute("DELETE FROM pedidos_compra WHERE id=?", (pedido_id,))
        return {"deleted": True}


# ─── Manutenção de Frota ──────────────────────────────────────────────────────

@protected.get("/frota-manutencao")
def list_frota_manut():
    with connect() as conn:
        return rows_to_dicts(conn.execute("SELECT * FROM frota_manutencao ORDER BY data DESC, id DESC").fetchall())


@protected.post("/frota-manutencao")
def create_frota_manut(data: FrotaManutIn):
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO frota_manutencao (veiculo_id,tipo,data,km,descricao,valor,status,observacao) VALUES (?,?,?,?,?,?,?,?)",
            (data.veiculo_id, data.tipo, data.data, data.km, data.descricao, data.valor, data.status, data.observacao),
        )
        return row_to_dict(conn.execute("SELECT * FROM frota_manutencao WHERE id=?", (cur.lastrowid,)).fetchone())


@protected.put("/frota-manutencao/{manut_id}")
def update_frota_manut(manut_id: int, data: FrotaManutIn):
    with connect() as conn:
        conn.execute(
            "UPDATE frota_manutencao SET veiculo_id=?,tipo=?,data=?,km=?,descricao=?,valor=?,status=?,observacao=? WHERE id=?",
            (data.veiculo_id, data.tipo, data.data, data.km, data.descricao, data.valor, data.status, data.observacao, manut_id),
        )
        row = conn.execute("SELECT * FROM frota_manutencao WHERE id=?", (manut_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Registro não encontrado")
        return row_to_dict(row)


@protected.delete("/frota-manutencao/{manut_id}")
def delete_frota_manut(manut_id: int):
    with connect() as conn:
        conn.execute("DELETE FROM frota_manutencao WHERE id=?", (manut_id,))
        return {"deleted": True}


# ─── Cronograma ───────────────────────────────────────────────────────────────

@protected.get("/cronograma")
def list_cronograma():
    with connect() as conn:
        return rows_to_dicts(conn.execute("SELECT * FROM cronograma ORDER BY data_inicio DESC, id DESC").fetchall())


@protected.post("/cronograma")
def create_cronograma(data: CronogramaIn):
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO cronograma (tecnico_id,obra_id,data_inicio,data_fim,tipo,descricao) VALUES (?,?,?,?,?,?)",
            (data.tecnico_id, data.obra_id, data.data_inicio, data.data_fim, data.tipo, data.descricao),
        )
        return row_to_dict(conn.execute("SELECT * FROM cronograma WHERE id=?", (cur.lastrowid,)).fetchone())


@protected.put("/cronograma/{cron_id}")
def update_cronograma(cron_id: int, data: CronogramaIn):
    with connect() as conn:
        conn.execute(
            "UPDATE cronograma SET tecnico_id=?,obra_id=?,data_inicio=?,data_fim=?,tipo=?,descricao=? WHERE id=?",
            (data.tecnico_id, data.obra_id, data.data_inicio, data.data_fim, data.tipo, data.descricao, cron_id),
        )
        row = conn.execute("SELECT * FROM cronograma WHERE id=?", (cron_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Registro não encontrado")
        return row_to_dict(row)


@protected.delete("/cronograma/{cron_id}")
def delete_cronograma(cron_id: int):
    with connect() as conn:
        conn.execute("DELETE FROM cronograma WHERE id=?", (cron_id,))
        return {"deleted": True}


# ─── Gerenciamento de usuários (somente admin) ────────────────────────────────
admin_router = APIRouter(prefix="/admin", dependencies=[Depends(require_admin)])


@admin_router.get("/users")
def list_users():
    with connect() as conn:
        rows = conn.execute("SELECT id, username, role, created_at FROM users ORDER BY id").fetchall()
    return rows_to_dicts(rows)


@admin_router.post("/users", status_code=201)
def create_user(data: UserIn):
    with connect() as conn:
        if conn.execute("SELECT id FROM users WHERE username=?", (data.username,)).fetchone():
            raise HTTPException(400, "Usuário já existe")
        conn.execute(
            "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
            (data.username, hash_password(data.password), "user"),
        )
    return {"ok": True}


@admin_router.delete("/users/{user_id}")
def delete_user(user_id: int, current_user: str = Depends(require_admin)):
    with connect() as conn:
        row = conn.execute("SELECT username FROM users WHERE id=?", (user_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Usuário não encontrado")
        if row["username"] == current_user:
            raise HTTPException(400, "Não é possível excluir sua própria conta")
        conn.execute("DELETE FROM users WHERE id=?", (user_id,))
    return {"ok": True}


# ─── Registrar routers ────────────────────────────────────────────────────────
app.include_router(protected)
app.include_router(admin_router)

if STATIC_DIR.is_dir():
    app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="spa")
