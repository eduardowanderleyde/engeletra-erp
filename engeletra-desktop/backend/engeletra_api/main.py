from __future__ import annotations

from datetime import date, timedelta

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import connect, init_db, row_to_dict, rows_to_dicts
from .security import LocalApiTokenMiddleware
from .schemas import ClientIn, EquipmentIn, QuoteIn, ServiceOrderIn, StockItemIn
from .settings import ALLOWED_ORIGINS, STATIC_DIR

app = FastAPI(title="Engeletra ERP API", version="0.2.0")

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
    # Codes are readable business identifiers. The numeric database id remains
    # the canonical key, while ORC/OS/FAT codes are shown to users and clients.
    with connect() as conn:
        row = conn.execute(f"SELECT COUNT(*) AS total FROM {table}").fetchone()
        return f"{prefix}-{int(row['total']) + 1:04d}"


def quote_total(data: QuoteIn) -> float:
    munck = data.munck if data.veiculo == "Munck" else 0
    return (data.pessoas * data.horas * data.valor_hora) + (data.km * data.valor_km) + data.materiais + munck


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/dashboard")
def dashboard():
    with connect() as conn:
        open_os = conn.execute("SELECT COUNT(*) total FROM service_orders WHERE status = 'Aberto'").fetchone()["total"]
        progress_os = conn.execute("SELECT COUNT(*) total FROM service_orders WHERE status = 'Em andamento'").fetchone()["total"]
        revenue = conn.execute("SELECT COALESCE(SUM(valor), 0) total FROM invoices").fetchone()["total"]
        pending_quotes = conn.execute("SELECT COUNT(*) total FROM quotes WHERE status IN ('Rascunho', 'Enviado')").fetchone()["total"]
        return {
            "open_os": open_os,
            "progress_os": progress_os,
            "revenue": revenue,
            "pending_quotes": pending_quotes,
        }


@app.get("/clients")
def list_clients():
    with connect() as conn:
        return rows_to_dicts(conn.execute("SELECT * FROM clients ORDER BY fantasia, razao").fetchall())


@app.post("/clients")
def create_client(data: ClientIn):
    with connect() as conn:
        cur = conn.execute(
            """
            INSERT INTO clients (razao, fantasia, cnpj, cidade, estado, responsavel, telefone, email, sla, historico)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (data.razao, data.fantasia, data.cnpj, data.cidade, data.estado, data.responsavel, data.telefone, data.email, data.sla, data.historico),
        )
        return row_to_dict(conn.execute("SELECT * FROM clients WHERE id = ?", (cur.lastrowid,)).fetchone())


@app.put("/clients/{client_id}")
def update_client(client_id: int, data: ClientIn):
    with connect() as conn:
        conn.execute(
            """
            UPDATE clients
            SET razao=?, fantasia=?, cnpj=?, cidade=?, estado=?, responsavel=?, telefone=?, email=?, sla=?, historico=?
            WHERE id=?
            """,
            (data.razao, data.fantasia, data.cnpj, data.cidade, data.estado, data.responsavel, data.telefone, data.email, data.sla, data.historico, client_id),
        )
        row = conn.execute("SELECT * FROM clients WHERE id = ?", (client_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Cliente não encontrado")
        return row_to_dict(row)


@app.delete("/clients/{client_id}")
def delete_client(client_id: int):
    with connect() as conn:
        checks = {
            "equipamentos": conn.execute("SELECT COUNT(*) total FROM equipment WHERE client_id=?", (client_id,)).fetchone()["total"],
            "orcamentos": conn.execute("SELECT COUNT(*) total FROM quotes WHERE client_id=?", (client_id,)).fetchone()["total"],
            "ordens": conn.execute("SELECT COUNT(*) total FROM service_orders WHERE client_id=?", (client_id,)).fetchone()["total"],
            "faturas": conn.execute("SELECT COUNT(*) total FROM invoices WHERE client_id=?", (client_id,)).fetchone()["total"],
        }
        linked = {key: value for key, value in checks.items() if value}
        if linked:
            raise HTTPException(409, {"message": "Cliente possui vínculos e não pode ser excluído.", "linked": linked})
        conn.execute("DELETE FROM clients WHERE id=?", (client_id,))
        return {"deleted": True}


@app.get("/equipment")
def list_equipment():
    with connect() as conn:
        return rows_to_dicts(conn.execute("SELECT * FROM equipment ORDER BY id DESC").fetchall())


@app.post("/equipment")
def create_equipment(data: EquipmentIn):
    with connect() as conn:
        cur = conn.execute(
            """
            INSERT INTO equipment (client_id, tipo, serie, potencia, tensao, fabricante, ano, localizacao, ultima_manutencao, proxima_manutencao)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (data.client_id, data.tipo, data.serie, data.potencia, data.tensao, data.fabricante, data.ano, data.localizacao, data.ultima_manutencao, data.proxima_manutencao),
        )
        return row_to_dict(conn.execute("SELECT * FROM equipment WHERE id=?", (cur.lastrowid,)).fetchone())


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
            """
            INSERT INTO quotes (code, client_id, pessoas, horas, km, veiculo, valor_hora, valor_km, materiais, munck, total, observacoes, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
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
            """
            INSERT INTO service_orders (code, quote_id, client_id, status, valor_real)
            VALUES (?, ?, ?, 'Aberto', ?)
            """,
            (os_code, quote_id, quote["client_id"], quote["total"]),
        )
        conn.execute(
            "UPDATE quotes SET status='Aprovado', service_order_id=? WHERE id=?",
            (cur.lastrowid, quote_id),
        )
        return row_to_dict(conn.execute("SELECT * FROM quotes WHERE id=?", (quote_id,)).fetchone())


@app.get("/service-orders")
def list_service_orders():
    with connect() as conn:
        return rows_to_dicts(conn.execute("SELECT * FROM service_orders ORDER BY id DESC").fetchall())


@app.post("/service-orders")
def create_service_order(data: ServiceOrderIn):
    code = next_code("service_orders", "OS")
    with connect() as conn:
        cur = conn.execute(
            """
            INSERT INTO service_orders (code, quote_id, client_id, equipment_id, tecnico, status, data_agendada, horas_reais, km_real, valor_real, checklist, materiais)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (code, data.quote_id, data.client_id, data.equipment_id, data.tecnico, data.status, data.data_agendada, data.horas_reais, data.km_real, data.valor_real, data.checklist, data.materiais),
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
            invoice_code = next_code("invoices", "FAT")
            emissao = date.today()
            vencimento = emissao + timedelta(days=15)
            conn.execute(
                """
                INSERT INTO invoices (code, service_order_id, client_id, valor, emissao, vencimento, status)
                VALUES (?, ?, ?, ?, ?, ?, 'Aberto')
                """,
                (invoice_code, order_id, order["client_id"], order["valor_real"] or 0, emissao.isoformat(), vencimento.isoformat()),
            )
        return row_to_dict(conn.execute("SELECT * FROM service_orders WHERE id=?", (order_id,)).fetchone())


@app.get("/invoices")
def list_invoices():
    with connect() as conn:
        return rows_to_dicts(conn.execute("SELECT * FROM invoices ORDER BY id DESC").fetchall())


@app.get("/stock")
def list_stock():
    with connect() as conn:
        return rows_to_dicts(conn.execute("SELECT * FROM stock_items ORDER BY item").fetchall())


@app.post("/stock")
def create_stock_item(data: StockItemIn):
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO stock_items (item, categoria, unidade, saldo, minimo, custo) VALUES (?, ?, ?, ?, ?, ?)",
            (data.item, data.categoria, data.unidade, data.saldo, data.minimo, data.custo),
        )
        return row_to_dict(conn.execute("SELECT * FROM stock_items WHERE id=?", (cur.lastrowid,)).fetchone())


if STATIC_DIR.is_dir():
    app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="spa")
