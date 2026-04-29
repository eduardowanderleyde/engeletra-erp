# README2 — Arquitetura do Engeletra ERP

Este documento explica como o sistema está estruturado, por que cada decisão foi tomada e como as partes se conectam.

---

## Visão geral

O Engeletra ERP é um **desktop app local-first**. Isso significa:

- Roda na máquina do usuário, sem servidor pago
- Dados ficam num arquivo SQLite local (`engeletra.db`)
- Interface abre numa janela própria (Electron), não no navegador
- Pode funcionar sem internet

```
┌─────────────────────────────────────────────────────┐
│                  Janela Electron                    │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │           Frontend React (porta 5177)        │  │
│  │  Sidebar → Páginas → Modais → Tabelas        │  │
│  └──────────────────────┬───────────────────────┘  │
│                         │ fetch HTTP                │
│  ┌──────────────────────▼───────────────────────┐  │
│  │         Backend FastAPI (porta 8787)         │  │
│  │  Rotas → Schemas → Database → SQLite         │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## Camada 1 — Backend (Python / FastAPI)

### Por que FastAPI?

- Validação automática com Pydantic
- Documentação interativa em `/docs` (útil para debug)
- Performance suficiente para uso local
- Migração futura para PostgreSQL sem reescrever o frontend

### Por que SQLite?

- Custo zero
- Sem instalação de servidor
- Backup = copiar um arquivo
- Suporta milhares de clientes, OS e faturas sem problema
- WAL mode ativo: leitura e escrita simultâneas sem travamento

### Segurança local

O backend escuta **somente em 127.0.0.1** (loopback). Nenhuma máquina da rede consegue acessar diretamente. Em builds empacotados, o Electron gera um token aleatório e envia em `X-Engeletra-Token` em cada requisição.

### Fluxo de dados

```
HTTP Request
    ↓
main.py (rota)
    ↓
schemas.py (valida entrada com Pydantic)
    ↓
database.py (executa SQL no SQLite)
    ↓
HTTP Response (dict do sqlite.Row)
```

---

## Camada 2 — Frontend (React / Vite)

### Por que React?

- Componentes reutilizáveis (Modal, tabelas, formulários)
- Estado local com `useState` e `useEffect` — sem biblioteca extra
- Fácil de expandir com TanStack Query quando crescer

### Por que Vite?

- Build em < 1 segundo
- Hot reload instantâneo em desenvolvimento
- Gera bundle otimizado para empacotar no Electron

### Estrutura de navegação

O `App.jsx` define 6 grupos no sidebar, cada um com seus itens. A navegação é por estado simples — nenhuma URL muda, nenhum roteador externo necessário.

```
App.jsx
  ├── Sidebar (NAV_GROUPS com grupos recolhíveis)
  └── <Page /> (componente ativo renderizado aqui)
```

Quando o usuário clica num item, `setPage(key)` atualiza o estado e o componente correspondente é renderizado no painel direito.

### Comunicação com o backend

Toda comunicação passa por `src/api/index.js`. É um cliente HTTP simples baseado em `fetch`:

```js
// Exemplo de chamada
const clientes = await api.clients.list()
const obra = await api.obras.create({ nome: '...', client_id: 1 })
```

Erros de HTTP são capturados e transformados em mensagens legíveis. O componente usa `alert()` para erros simples — sem biblioteca de toast.

---

## Camada 3 — Desktop (Electron)

O Electron faz três coisas quando o usuário abre o app:

```
1. startBackend()
   → Spawn do processo Python (uvicorn) em segundo plano
   → Escuta na porta 8787

2. setTimeout(createWindow, 1200)
   → Aguarda o backend subir

3. win.loadURL('http://127.0.0.1:5177')
   → Carrega o frontend React na janela
```

O usuário vê apenas a janela. Python e portas são invisíveis.

Em builds de produção, o frontend é buildado com `vite build` e servido como arquivos estáticos pelo próprio FastAPI (via `StaticFiles`), eliminando a dependência do Vite.

---

## Banco de dados — 12 tabelas

```
clients          Clientes (razão, CNPJ, SLA, contato)
equipment        Equipamentos vinculados a clientes
quotes           Orçamentos com cálculo automático de valor
service_orders   Ordens de Serviço vinculadas a orçamentos
invoices         Faturas com 6 impostos calculados
stock_items      Itens de estoque com saldo e custo

obras            Projetos/obras com código SERV-XXXX
tecnicos         Equipe técnica com cargo e valor/hora
ensaios          Ensaios elétricos (Megger, FP, TTR, Resistência)
veiculos         Frota (Strada, Kwids, Munck)
frota_km         Registro diário de quilometragem por veículo
```

### Relacionamentos principais

```
clients ──< equipment
clients ──< quotes ──< service_orders ──< invoices
obras   ──< service_orders
obras   ──< ensaios
obras   ──< frota_km
clients ──< ensaios
veiculos──< frota_km
```

### Automações no backend

| Evento | O que acontece automaticamente |
|---|---|
| Orçamento aprovado | OS criada com status "Aberto" |
| OS concluída | Fatura criada com 6 impostos calculados |
| Registro de KM | `km_atual` do veículo atualizado |

### Cálculo de impostos (NF)

Aplicado sobre o valor bruto ao concluir uma OS:

```
INSS:    11,00%
ISS:      5,00%
PIS:      0,65%
COFINS:   3,00%
CSLL:     1,00%
IRPJ:     1,50%
─────────────────
Total:   22,15%
Líquido: 77,85% do valor bruto
```

---

## Formulário de Ensaio Elétrico (4 abas)

O módulo mais importante do sistema. Baseado no modelo real TESTES 2.xlsx da Engeletra.

```
Aba 1 — Identificação
  Cliente, Obra, Tipo de ensaio, Técnico, Data

Aba 2 — Dados do Equipamento
  Fabricante, Nº série, Potência, Tensão AT/BT,
  Ano, Volume de óleo, Massa total

Aba 3 — Medições
  Megger: AT-Terra, BT-Terra, AT-BT (MΩ)
  FP: Enrolamento AT e BT (%)
  TTR: TAP, Relação teórica vs medida
  Resistência: AT e BT (mΩ)

Aba 4 — Resultado
  Aprovado / Reprovado / Condicional / Pendente
  Observações técnicas
  Conclusão e recomendações
```

---

## Fluxo de evolução planejado

```
Fase 1 (atual)    Desktop local, SQLite, um usuário
Fase 2            Backup automático + exportação
Fase 3            Servidor próprio, PostgreSQL, multiusuário
Fase 4            SaaS multitenant, assinatura, portal do cliente
```

A migração de SQLite para PostgreSQL exige mudar apenas `database.py` — o resto do backend e o frontend inteiro ficam intactos.
