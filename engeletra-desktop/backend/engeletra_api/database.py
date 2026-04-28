from __future__ import annotations

import sqlite3

from .settings import DATA_DIR, DB_PATH


def connect() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA synchronous = NORMAL")
    conn.execute("PRAGMA busy_timeout = 5000")
    return conn


def init_db() -> None:
    with connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS clients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                razao TEXT NOT NULL,
                fantasia TEXT,
                cnpj TEXT,
                cidade TEXT,
                estado TEXT,
                responsavel TEXT,
                telefone TEXT,
                email TEXT,
                sla TEXT DEFAULT 'Normal',
                historico TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS equipment (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
                tipo TEXT NOT NULL,
                serie TEXT,
                potencia TEXT,
                tensao TEXT,
                fabricante TEXT,
                ano INTEGER,
                localizacao TEXT,
                ultima_manutencao TEXT,
                proxima_manutencao TEXT
            );

            CREATE TABLE IF NOT EXISTS quotes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE NOT NULL,
                client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
                pessoas INTEGER DEFAULT 1,
                horas REAL DEFAULT 0,
                km REAL DEFAULT 0,
                veiculo TEXT DEFAULT 'Carro',
                valor_hora REAL DEFAULT 0,
                valor_km REAL DEFAULT 0,
                materiais REAL DEFAULT 0,
                munck REAL DEFAULT 0,
                total REAL DEFAULT 0,
                observacoes TEXT,
                status TEXT DEFAULT 'Rascunho',
                service_order_id INTEGER,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS service_orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE NOT NULL,
                quote_id INTEGER REFERENCES quotes(id) ON DELETE SET NULL,
                client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
                equipment_id INTEGER REFERENCES equipment(id) ON DELETE SET NULL,
                tecnico TEXT,
                status TEXT DEFAULT 'Aberto',
                data_agendada TEXT,
                horas_reais REAL DEFAULT 0,
                km_real REAL DEFAULT 0,
                valor_real REAL DEFAULT 0,
                checklist TEXT,
                materiais TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS invoices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE NOT NULL,
                service_order_id INTEGER NOT NULL REFERENCES service_orders(id) ON DELETE RESTRICT,
                client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
                valor REAL NOT NULL,
                emissao TEXT NOT NULL,
                vencimento TEXT NOT NULL,
                status TEXT DEFAULT 'Aberto'
            );

            CREATE TABLE IF NOT EXISTS stock_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                item TEXT NOT NULL,
                categoria TEXT,
                unidade TEXT DEFAULT 'un',
                saldo REAL DEFAULT 0,
                minimo REAL DEFAULT 0,
                custo REAL DEFAULT 0
            );

            CREATE INDEX IF NOT EXISTS idx_equipment_client_id ON equipment(client_id);
            CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON quotes(client_id);
            CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
            CREATE INDEX IF NOT EXISTS idx_service_orders_client_id ON service_orders(client_id);
            CREATE INDEX IF NOT EXISTS idx_service_orders_status ON service_orders(status);
            CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
            CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
            """
        )


def row_to_dict(row: sqlite3.Row | None):
    return dict(row) if row else None


def rows_to_dicts(rows):
    return [dict(row) for row in rows]
