# README3 — Mapa de Arquivos e Funções

Guia completo de onde cada coisa está e o que faz. Use como referência ao editar o sistema.

---

## Estrutura raiz

```
engeletra-desktop/     Produto principal (app desktop)
engeletra_erp/         Plugin Frappe/ERPNext (versão enterprise, separada)
app-desktop/           Protótipo HTML antigo (localStorage, não usar)
docs/                  Documentação geral
README.md              Visão geral e como rodar
README2.md             Arquitetura e decisões técnicas
README3.md             Este arquivo — mapa de arquivos e funções
```

---

## engeletra-desktop/backend/

```
backend/
  requirements.txt              Dependências Python (fastapi, uvicorn, pydantic)
  engeletra_api/
    __init__.py                 Marca como pacote Python
    settings.py                 Configurações via variáveis de ambiente
    security.py                 Middleware de token local (X-Engeletra-Token)
    database.py                 Banco SQLite: schema, migração e helpers
    schemas.py                  Modelos Pydantic de entrada (validação)
    main.py                     Todas as rotas da API REST
```

### settings.py

Define caminhos e configurações via env vars:

| Variável | Padrão | Descrição |
|---|---|---|
| `ENGELETRA_DATA_DIR` | pasta do projeto | Onde o `.db` é salvo |
| `ENGELETRA_API_HOST` | `127.0.0.1` | Interface de escuta |
| `ENGELETRA_API_PORT` | `8787` | Porta |
| `ENGELETRA_SECRET_KEY` | chave volátil | Chave de assinatura JWT — defina em produção |
| `ENGELETRA_ADMIN_PASSWORD` | `admin` | Senha do usuário admin no primeiro boot |
| `ENGELETRA_JWT_EXPIRE_MINUTES` | `480` | Validade do token JWT (padrão: 8 horas) |
| `ENGELETRA_ALLOWED_ORIGINS` | `127.0.0.1:5177` | CORS permitido |
| `ENGELETRA_STATIC_DIR` | vazio | Pasta do build Vite (Docker/produção) |

### security.py

Autenticação via **JWT (Bearer token)**. Todas as rotas exceto `/health` e `/auth/login` exigem token válido.

- `hash_password(password)` — gera hash bcrypt
- `verify_password(plain, hashed)` — verifica senha contra hash
- `create_access_token(username)` — gera JWT assinado com `SECRET_KEY`
- `verify_token(credentials)` — dependência FastAPI que valida o Bearer token em cada request protegido

Rotas públicas: `/health`, `/auth/login`  
Rotas protegidas: todas as demais (exigem `Authorization: Bearer <token>`)

### database.py — funções principais

| Função | O que faz |
|---|---|
| `connect()` | Abre conexão SQLite com WAL + foreign keys + timeout |
| `init_db()` | Cria as 12 tabelas se não existirem e executa migrações |
| `_migrate(conn)` | Adiciona colunas novas a tabelas existentes sem perder dados |
| `_has_column(conn, table, col)` | Verifica se coluna existe (usado pelo migrate) |
| `row_to_dict(row)` | Converte `sqlite3.Row` em dict Python |
| `rows_to_dicts(rows)` | Converte lista de `sqlite3.Row` em lista de dicts |

**Tabelas criadas por `init_db()`:**
`clients`, `equipment`, `quotes`, `service_orders`, `invoices`, `stock_items`, `obras`, `tecnicos`, `ensaios`, `veiculos`, `frota_km`

### schemas.py — modelos de entrada

Cada classe Pydantic valida o body de um POST/PUT:

| Classe | Uso |
|---|---|
| `ClientIn` | Criar/editar cliente |
| `EquipmentIn` | Criar equipamento |
| `QuoteIn` | Criar orçamento |
| `ServiceOrderIn` | Criar OS |
| `StockItemIn` | Criar item de estoque |
| `ObraIn` | Criar/editar obra |
| `TecnicoIn` | Criar/editar técnico |
| `EnsaioIn` | Criar/editar ensaio elétrico |
| `VeiculoIn` | Criar/editar veículo |
| `FrotaKmIn` | Registrar dia de uso do veículo |

### main.py — rotas da API

#### Funções utilitárias

| Função | O que faz |
|---|---|
| `next_code(table, prefix)` | Gera código sequencial: `ORC-0001`, `OS-0002`, `ENS-0003`... |
| `quote_total(data)` | Calcula total do orçamento: `(pessoas × horas × valor_hora) + (km × valor_km) + materiais + munck` |
| `calc_impostos(valor)` | Retorna dict com INSS/ISS/PIS/COFINS/CSLL/IRPJ calculados |

#### Endpoints por módulo

**Sistema**
```
GET  /health          Verifica se backend está rodando
GET  /dashboard       Métricas: OS abertas, em andamento, receita, obras ativas, ensaios do mês
```

**Clientes** (`/clients`)
```
GET    /clients           Lista todos
POST   /clients           Cria cliente
PUT    /clients/{id}      Edita cliente
DELETE /clients/{id}      Exclui (verifica vínculos antes)
```

**Equipamentos** (`/equipment`)
```
GET    /equipment          Lista todos
POST   /equipment          Cria equipamento vinculado a cliente
```

**Orçamentos** (`/quotes`)
```
GET    /quotes             Lista todos
POST   /quotes             Cria com cálculo automático de total
POST   /quotes/{id}/approve  Aprova e cria OS automaticamente
```

**Ordens de Serviço** (`/service-orders`)
```
GET    /service-orders           Lista todas
POST   /service-orders           Cria OS
POST   /service-orders/{id}/finish  Conclui: atualiza status + cria fatura com impostos
```

**Faturas** (`/invoices`)
```
GET    /invoices          Lista todas (geradas automaticamente ao concluir OS)
```

**Estoque** (`/stock`)
```
GET    /stock             Lista itens
POST   /stock             Adiciona item
```

**Obras** (`/obras`)
```
GET    /obras             Lista todas
POST   /obras             Cria com código SERV-XXXX automático
PUT    /obras/{id}        Edita
DELETE /obras/{id}        Exclui
```

**Técnicos** (`/tecnicos`)
```
GET    /tecnicos          Lista todos
POST   /tecnicos          Cria técnico
PUT    /tecnicos/{id}     Edita
DELETE /tecnicos/{id}     Exclui
```

**Ensaios** (`/ensaios`)
```
GET    /ensaios           Lista todos
POST   /ensaios           Cria com código ENS-XXXX automático
PUT    /ensaios/{id}      Edita (todos os campos do formulário)
```

**Veículos** (`/veiculos`)
```
GET    /veiculos          Lista todos
POST   /veiculos          Cadastra veículo
PUT    /veiculos/{id}     Edita (atualiza km_atual automaticamente)
```

**Frota KM** (`/frota-km`)
```
GET    /frota-km          Lista registros diários
POST   /frota-km          Registra uso: calcula km_rodado e atualiza km do veículo
```

---

## engeletra-desktop/frontend/

```
frontend/
  index.html              Entry HTML — monta <div id="root"> e carrega main.jsx
  vite.config.js          Config Vite: plugin React, porta 5177
  package.json            Dependências: React 18, Vite 8, @vitejs/plugin-react

  src/
    main.jsx              Entry React — ReactDOM.createRoot → <App />
    App.jsx               Layout principal: sidebar + renderização de páginas
    utils.js              Funções compartilhadas: fmtMoney, fmtDate, statusColor

    api/
      index.js            Cliente HTTP — todas as chamadas ao backend

    styles/
      main.css            CSS completo: variáveis, layout, sidebar, tabelas,
                          botões, formulários, modais, badges, ensaio tabs

    components/
      Modal.jsx           Modal reutilizável (overlay + caixa + header + close)
      ComingSoon.jsx      Placeholder para telas em desenvolvimento

    features/
      Dashboard.jsx       Painel com 6 métricas em tempo real
      Clients.jsx         CRUD completo de clientes
      Quotes.jsx          Orçamentos com cálculo de total ao vivo
      ServiceOrders.jsx   OS com filtros por status + ação Concluir
      Equipment.jsx       Cadastro de equipamentos com cliente vinculado
      Invoices.jsx        Lista de faturas com totais (aberto vs recebido)
      Stock.jsx           Estoque com alerta de saldo mínimo
      Obras.jsx           Obras & Projetos com métricas e filtros
      Tecnicos.jsx        Cadastro de técnicos com cargo e valor/hora
      Ensaios.jsx         Formulário de ensaio em 4 abas com resultado visual
      Veiculos.jsx        Cadastro da frota com KM atual
      FrotaKm.jsx         Registro diário de uso por veículo e obra
```

### App.jsx — como funciona a navegação

```js
// NAV_GROUPS define os 6 grupos do sidebar com seus itens
const NAV_GROUPS = [
  { id: 'operacional', label: 'OPERACIONAL', items: [...] },
  { id: 'cadastros',   label: 'CADASTROS',   items: [...] },
  ...
]

// PAGES mapeia cada key para seu componente
const PAGES = {
  'dashboard': Dashboard,
  'obras':     Obras,
  ...
}

// Estado controla qual página está ativa e quais grupos estão abertos
const [page, setPage]           = useState('dashboard')
const [openGroups, setOpenGroups] = useState(new Set([...todos abertos...]))
```

Não há roteador externo. Clicar num item do sidebar chama `setPage(key)` e o componente correspondente é renderizado.

### api/index.js — estrutura do cliente

```js
// Função base — trata erros e retorna JSON
async function req(method, path, body) { ... }

// Organizado por módulo para clareza no uso
export const api = {
  clients:      { list, create, update, delete },
  quotes:       { list, create, approve },
  serviceOrders:{ list, create, finish },
  obras:        { list, create, update, delete },
  ensaios:      { list, create, update },
  veiculos:     { list, create, update },
  frotaKm:      { list, create },
  ...
}
```

### utils.js — funções de formatação

| Função | Retorna |
|---|---|
| `fmtMoney(valor)` | `R$ 35.300,00` (formato pt-BR) |
| `fmtDate(valor)` | `28/04/2026` (dd/mm/aaaa) |
| `statusColor(status)` | Nome da classe CSS do badge: `green`, `blue`, `yellow`, `red`, `gray` |

### Padrão de componente de feature

Todos os componentes de feature seguem o mesmo padrão:

```jsx
export default function MinhaFeature() {
  // 1. Estado
  const [items, setItems] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm]   = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  // 2. Carga inicial
  useEffect(() => { load() }, [])
  async function load() { setItems(await api.modulo.list()) }

  // 3. Ações
  async function save() { ... await api.modulo.create(form); load() }
  async function remove(item) { ... await api.modulo.delete(item.id); load() }

  // 4. Render: métricas → filtros → tabela → modal com formulário
  return (
    <div>
      <div className="page-header"> ... </div>
      <div className="metrics-grid"> ... </div>
      <div className="table-wrap"><table>...</table></div>
      {modal && <Modal>...</Modal>}
    </div>
  )
}
```

---

## engeletra-desktop/desktop/

```
desktop/
  main.js     Processo principal do Electron
```

### main.js — o que faz

```js
startBackend()
// → spawn do Python com .venv3/bin/python -m uvicorn ...
// → cwd: pasta backend/

setTimeout(createWindow, 1200)
// → aguarda 1,2s para o uvicorn subir
// → cria janela 1440×920
// → carrega http://127.0.0.1:5177 (dev) ou build estático (produção)

app.on('window-all-closed', () => {
  backendProcess.kill()  // mata o Python ao fechar
})
```

---

## engeletra-desktop/docs/

```
docs/
  arquitetura-seguranca.md    Decisões de segurança, banco, escala e roadmap SaaS
```

---

## Onde adicionar coisas novas

| O que adicionar | Onde mexer |
|---|---|
| Nova tabela | `database.py` → `init_db()` executescript + índices |
| Coluna em tabela existente | `database.py` → `_migrate()` |
| Novo endpoint | `schemas.py` (modelo) + `main.py` (rota) |
| Nova tela | `features/NovaTela.jsx` + registrar em `App.jsx` (PAGES e NAV_GROUPS) + `api/index.js` |
| Novo campo no formulário | Feature JSX (estado EMPTY + label + input) + schema Pydantic + INSERT/UPDATE SQL |
| Nova variável de ambiente | `settings.py` |

---

## Convenções do projeto

- **Código em inglês**, **interface em português**
- Nomes de variáveis e funções: `camelCase` (JS) / `snake_case` (Python)
- Validação de entrada: apenas nos schemas Pydantic e no frontend antes do submit
- Exclusão com vínculos: verificar antes de deletar (ver `delete_client`)
- Automações devem ser idempotentes: verificar se já existe antes de criar
- SQL direto no `main.py` para rotas simples; extrair função quando o SQL for longo
