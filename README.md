# Engeletra ERP

ERP vertical para empresas de manutenção elétrica industrial — transformadores, subestações, SPDA, obras técnicas e serviços externos.

Desenvolvido como software **desktop local-first**: abre como qualquer aplicativo Windows ou macOS, sem navegador, sem mensalidade de nuvem, sem instalação de servidor.

---

## O que o sistema faz

O Engeletra ERP digitaliza o fluxo completo da operação:

```
Cliente solicita serviço
→ Engeletra emite orçamento com cálculo automático
→ Cliente aprova → OS gerada automaticamente
→ Técnico executa o serviço
→ Ensaio elétrico lançado no sistema (Megger, FP, TTR, Resistência)
→ Relatório técnico gerado em PDF
→ NF emitida com 6 impostos calculados automaticamente
→ Fatura registrada → Financeiro atualizado
```

---

## Módulos disponíveis

| Módulo | Telas funcionais |
|---|---|
| **Operacional** | Painel, Orçamentos, Ordens de Serviço, Obras & Projetos, Ensaios Elétricos |
| **Cadastros** | Clientes, Equipamentos, Técnicos, Estoque |
| **Frota** | Veículos, Controle Diário de KM |
| **Financeiro** | Faturamento com NF |
| **Em desenvolvimento** | Relatórios PDF, Caixa, Contas Bancárias, Previsão de Pagamentos, Despesas, Cronograma, Ponto, Folha, Pedidos de Compra |

---

## Stack tecnológica

```
Backend   Python 3.11 + FastAPI + SQLite (local)
Frontend  React 18 + Vite
Desktop   Electron 30
```

Sem dependência de internet. Banco de dados é um único arquivo `.db` — fácil de fazer backup.

---

## Rodar em desenvolvimento

### 1. Backend

```bash
cd engeletra-desktop/backend
python3 -m venv .venv3
source .venv3/bin/activate        # Windows: .venv3\Scripts\activate
pip install -r requirements.txt
uvicorn engeletra_api.main:app --host 127.0.0.1 --port 8787 --reload
```

### 2. Frontend

```bash
cd engeletra-desktop/frontend
npm install
npm run dev
# Abre em http://127.0.0.1:5177
```

### 3. App desktop (opcional, junta tudo numa janela)

```bash
cd engeletra-desktop
npm install
npm run desktop
```

---

## Gerar instalador

```bash
cd engeletra-desktop

# Windows (.exe instalador + portable)
npm run dist:win

# macOS (.dmg + .zip)
npm run dist:mac
```

Saídas em `dist/`.

---

## Estrutura do projeto

```
engeletra-desktop/        Produto principal
  backend/                API Python + banco SQLite
  frontend/               Interface React
  desktop/                Janela Electron
  docs/                   Documentação técnica

engeletra_erp/            Plugin Frappe/ERPNext (versão enterprise)
app-desktop/              Protótipo HTML (localStorage, descontinuado)
docs/                     Documentação geral
```

Para entender a arquitetura detalhada, leia `README2.md`.
Para entender cada arquivo e função, leia `README3.md`.

---

## Licença

MIT — pode usar, modificar, hospedar, vender serviços e transformar em SaaS.
