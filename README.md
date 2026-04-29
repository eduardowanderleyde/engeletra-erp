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
Backend   Python 3.12 + FastAPI 0.136 + SQLite (local)
Frontend  React 18 + Vite 8
Desktop   Electron 41
```

Sem dependência de internet. Banco de dados é um único arquivo `.db` — fácil de fazer backup.

---

## Como rodar

Consulte o **[instruction.md](instruction.md)** para instruções completas de desenvolvimento, Docker e geração de instalador.

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

- `README2.md` — arquitetura e decisões técnicas
- `README3.md` — mapa completo de arquivos e funções
- `instruction.md` — como instalar, rodar e manter

---

## Licença

MIT — pode usar, modificar, hospedar, vender serviços e transformar em SaaS.
