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


def _has_column(conn, table: str, column: str) -> bool:
    rows = conn.execute(f"PRAGMA table_info({table})").fetchall()
    return any(r["name"] == column for r in rows)


def _migrate(conn) -> None:
    """Add columns introduced after the initial schema without destroying data."""
    migrations = [
        ("service_orders", "obra_id",       "INTEGER REFERENCES obras(id) ON DELETE SET NULL"),
        ("invoices",       "numero_nf",      "TEXT"),
        ("invoices",       "inss",           "REAL DEFAULT 0"),
        ("invoices",       "iss",            "REAL DEFAULT 0"),
        ("invoices",       "pis",            "REAL DEFAULT 0"),
        ("invoices",       "cofins",         "REAL DEFAULT 0"),
        ("invoices",       "csll",           "REAL DEFAULT 0"),
        ("invoices",       "irpj",           "REAL DEFAULT 0"),
        ("invoices",       "valor_liquido",  "REAL DEFAULT 0"),
        ("invoices",       "data_recebimento", "TEXT"),
    ]
    for table, col, definition in migrations:
        if not _has_column(conn, table, col):
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {col} {definition}")
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_so_obra ON service_orders(obra_id)"
    )


def init_db() -> None:
    with connect() as conn:
        conn.executescript(
            """
            -- ─── Clientes ─────────────────────────────────────────────
            CREATE TABLE IF NOT EXISTS clients (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                razao       TEXT NOT NULL,
                fantasia    TEXT,
                cnpj        TEXT,
                cidade      TEXT,
                estado      TEXT,
                responsavel TEXT,
                telefone    TEXT,
                email       TEXT,
                sla         TEXT DEFAULT 'Normal',
                historico   TEXT,
                created_at  TEXT DEFAULT CURRENT_TIMESTAMP
            );

            -- ─── Equipamentos ─────────────────────────────────────────
            CREATE TABLE IF NOT EXISTS equipment (
                id                  INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id           INTEGER NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
                tipo                TEXT NOT NULL,
                serie               TEXT,
                potencia            TEXT,
                tensao              TEXT,
                fabricante          TEXT,
                ano                 INTEGER,
                localizacao         TEXT,
                ultima_manutencao   TEXT,
                proxima_manutencao  TEXT
            );

            -- ─── Orçamentos ───────────────────────────────────────────
            CREATE TABLE IF NOT EXISTS quotes (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                code             TEXT UNIQUE NOT NULL,
                client_id        INTEGER NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
                pessoas          INTEGER DEFAULT 1,
                horas            REAL DEFAULT 0,
                km               REAL DEFAULT 0,
                veiculo          TEXT DEFAULT 'Carro',
                valor_hora       REAL DEFAULT 0,
                valor_km         REAL DEFAULT 0,
                materiais        REAL DEFAULT 0,
                munck            REAL DEFAULT 0,
                total            REAL DEFAULT 0,
                observacoes      TEXT,
                status           TEXT DEFAULT 'Rascunho',
                service_order_id INTEGER,
                created_at       TEXT DEFAULT CURRENT_TIMESTAMP
            );

            -- ─── Ordens de Serviço ────────────────────────────────────
            CREATE TABLE IF NOT EXISTS service_orders (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                code         TEXT UNIQUE NOT NULL,
                quote_id     INTEGER REFERENCES quotes(id) ON DELETE SET NULL,
                client_id    INTEGER NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
                equipment_id INTEGER REFERENCES equipment(id) ON DELETE SET NULL,
                obra_id      INTEGER REFERENCES obras(id) ON DELETE SET NULL,
                tecnico      TEXT,
                status       TEXT DEFAULT 'Aberto',
                data_agendada TEXT,
                horas_reais  REAL DEFAULT 0,
                km_real      REAL DEFAULT 0,
                valor_real   REAL DEFAULT 0,
                checklist    TEXT,
                materiais    TEXT,
                created_at   TEXT DEFAULT CURRENT_TIMESTAMP
            );

            -- ─── Faturas ──────────────────────────────────────────────
            CREATE TABLE IF NOT EXISTS invoices (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                code             TEXT UNIQUE NOT NULL,
                service_order_id INTEGER NOT NULL REFERENCES service_orders(id) ON DELETE RESTRICT,
                client_id        INTEGER NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
                numero_nf        TEXT,
                valor            REAL NOT NULL,
                inss             REAL DEFAULT 0,
                iss              REAL DEFAULT 0,
                pis              REAL DEFAULT 0,
                cofins           REAL DEFAULT 0,
                csll             REAL DEFAULT 0,
                irpj             REAL DEFAULT 0,
                valor_liquido    REAL DEFAULT 0,
                emissao          TEXT NOT NULL,
                vencimento       TEXT NOT NULL,
                data_recebimento TEXT,
                status           TEXT DEFAULT 'Aberto'
            );

            -- ─── Estoque ──────────────────────────────────────────────
            CREATE TABLE IF NOT EXISTS stock_items (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                item      TEXT NOT NULL,
                categoria TEXT,
                unidade   TEXT DEFAULT 'un',
                saldo     REAL DEFAULT 0,
                minimo    REAL DEFAULT 0,
                custo     REAL DEFAULT 0
            );

            -- ─── Obras & Projetos ──────────────────────────────────────
            CREATE TABLE IF NOT EXISTS obras (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                code            TEXT UNIQUE NOT NULL,
                nome            TEXT NOT NULL,
                client_id       INTEGER REFERENCES clients(id) ON DELETE SET NULL,
                status          TEXT DEFAULT 'Em andamento',
                data_inicio     TEXT,
                data_previsao   TEXT,
                data_conclusao  TEXT,
                valor_contrato  REAL DEFAULT 0,
                descricao       TEXT,
                created_at      TEXT DEFAULT CURRENT_TIMESTAMP
            );

            -- ─── Técnicos ─────────────────────────────────────────────
            CREATE TABLE IF NOT EXISTS tecnicos (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                nome        TEXT NOT NULL,
                codigo      TEXT,
                cargo       TEXT,
                telefone    TEXT,
                email       TEXT,
                valor_hora  REAL DEFAULT 0,
                ativo       INTEGER DEFAULT 1,
                created_at  TEXT DEFAULT CURRENT_TIMESTAMP
            );

            -- ─── Ensaios Elétricos ────────────────────────────────────
            CREATE TABLE IF NOT EXISTS ensaios (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                code             TEXT UNIQUE NOT NULL,
                client_id        INTEGER NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
                obra_id          INTEGER REFERENCES obras(id) ON DELETE SET NULL,
                service_order_id INTEGER REFERENCES service_orders(id) ON DELETE SET NULL,
                equipment_id     INTEGER REFERENCES equipment(id) ON DELETE SET NULL,
                tecnico          TEXT,
                data_ensaio      TEXT,
                tipo_ensaio      TEXT,
                -- dados do equipamento
                fabricante       TEXT,
                numero_serie     TEXT,
                potencia         TEXT,
                tensao_at        TEXT,
                tensao_bt        TEXT,
                ano_fabricacao   INTEGER,
                volume_oleo      REAL,
                massa_total      REAL,
                -- ensaio de isolamento (Megger) em MΩ
                megger_at_terra  REAL,
                megger_bt_terra  REAL,
                megger_at_bt     REAL,
                -- fator de potência em %
                fp_at            REAL,
                fp_bt            REAL,
                -- relação de transformação
                ttr_tap          TEXT,
                ttr_relacao_teorica REAL,
                ttr_relacao_medida  REAL,
                -- resistência de enrolamento em mΩ
                resistencia_at   REAL,
                resistencia_bt   REAL,
                -- resultado geral
                resultado        TEXT DEFAULT 'Pendente',
                observacoes      TEXT,
                conclusao        TEXT,
                created_at       TEXT DEFAULT CURRENT_TIMESTAMP
            );

            -- ─── Veículos ─────────────────────────────────────────────
            CREATE TABLE IF NOT EXISTS veiculos (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                placa      TEXT UNIQUE NOT NULL,
                modelo     TEXT NOT NULL,
                tipo       TEXT DEFAULT 'Carro',
                km_atual   REAL DEFAULT 0,
                ano        INTEGER,
                cor        TEXT,
                ativo      INTEGER DEFAULT 1
            );

            -- ─── Controle Diário de Frota ─────────────────────────────
            CREATE TABLE IF NOT EXISTS frota_km (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                veiculo_id   INTEGER NOT NULL REFERENCES veiculos(id) ON DELETE RESTRICT,
                data         TEXT NOT NULL,
                km_inicial   REAL DEFAULT 0,
                km_final     REAL DEFAULT 0,
                km_rodado    REAL DEFAULT 0,
                motorista    TEXT,
                obra_id      INTEGER REFERENCES obras(id) ON DELETE SET NULL,
                abastecimento REAL DEFAULT 0,
                observacao   TEXT,
                created_at   TEXT DEFAULT CURRENT_TIMESTAMP
            );

            -- ─── Índices ──────────────────────────────────────────────
            CREATE INDEX IF NOT EXISTS idx_equipment_client      ON equipment(client_id);
            CREATE INDEX IF NOT EXISTS idx_quotes_client         ON quotes(client_id);
            CREATE INDEX IF NOT EXISTS idx_quotes_status         ON quotes(status);
            CREATE INDEX IF NOT EXISTS idx_so_client             ON service_orders(client_id);
            CREATE INDEX IF NOT EXISTS idx_so_status             ON service_orders(status);
            -- idx_so_obra criado na migração após obra_id ser adicionado
            CREATE INDEX IF NOT EXISTS idx_invoices_client       ON invoices(client_id);
            CREATE INDEX IF NOT EXISTS idx_invoices_status       ON invoices(status);
            CREATE INDEX IF NOT EXISTS idx_obras_client          ON obras(client_id);
            CREATE INDEX IF NOT EXISTS idx_obras_status          ON obras(status);
            CREATE INDEX IF NOT EXISTS idx_ensaios_client        ON ensaios(client_id);
            CREATE INDEX IF NOT EXISTS idx_ensaios_obra          ON ensaios(obra_id);
            CREATE INDEX IF NOT EXISTS idx_frota_km_veiculo      ON frota_km(veiculo_id);
            CREATE INDEX IF NOT EXISTS idx_frota_km_data         ON frota_km(data);
            """
        )
        _migrate(conn)


def row_to_dict(row: sqlite3.Row | None):
    return dict(row) if row else None


def rows_to_dicts(rows):
    return [dict(row) for row in rows]
