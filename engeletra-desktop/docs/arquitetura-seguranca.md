# Arquitetura, segurança e escala

Este documento define a direção técnica do Engeletra ERP Desktop.

## Objetivo

Criar um software profissional, instalável em Windows e macOS, com custo inicial zero de infraestrutura, código organizado e caminho claro para crescer.

## Decisão principal

O produto será **desktop local-first**:

- Python no backend.
- SQLite como banco local.
- React no frontend.
- Electron como janela desktop.
- Sem servidor pago obrigatório.
- Sem dependência de navegador para o usuário final.

Essa decisão mantém o custo em zero na primeira fase e permite vender/usar o sistema sem mensalidade de cloud.

## Por que não começar com nuvem?

Nuvem traz custo, manutenção, autenticação remota, LGPD, backup centralizado, monitoramento e suporte mais complexo. Para a primeira versão, a Engeletra precisa validar fluxo, telas, relatórios, cadastros e operação.

Quando o produto amadurecer, o backend Python poderá migrar para PostgreSQL e servidor web sem reescrever o frontend.

## Banco de dados

### Escolha inicial: SQLite

Vantagens:

- Custo zero.
- Não exige instalação de servidor.
- É confiável para uso local.
- Fácil backup: um arquivo `.db`.
- Ideal para desktop e pequenos times.

Configurações aplicadas:

- `PRAGMA foreign_keys = ON`
- `PRAGMA journal_mode = WAL`
- `PRAGMA synchronous = NORMAL`
- `PRAGMA busy_timeout = 5000`
- índices em campos de busca e relacionamento

### Limite esperado

SQLite atende bem:

- milhares de clientes
- milhares de OS
- milhares de faturas
- uso em uma máquina por vez
- operação local

Quando houver vários usuários simultâneos em rede ou SaaS, migrar para PostgreSQL.

## Segurança

### API local

O backend deve escutar apenas em:

```text
127.0.0.1
```

Isso impede acesso direto pela rede local.

### CORS

A API não deve aceitar qualquer origem. O projeto já restringe para:

```text
http://127.0.0.1:5177
http://localhost:5177
```

Em produção, Electron deve usar origem controlada.

### Token local

Existe suporte a `ENGELETRA_API_TOKEN`.

No desenvolvimento, pode ficar vazio. Na versão empacotada, o Electron deve gerar um token local e enviar em:

```text
X-Engeletra-Token
```

Isso evita que outro programa local acesse a API sem permissão.

### Dados sensíveis

O banco terá dados de clientes, CNPJ, contatos, faturas e histórico técnico. Regras:

- nunca subir `.db` para o Git
- nunca commitar `.env`
- criar backup local automático
- futuramente oferecer criptografia do banco
- controlar permissões por usuário antes de uso multiusuário

## Frontend

React deve ficar organizado por domínio:

```text
src/
  api/
  components/
  features/
    clients/
    quotes/
    service-orders/
    equipment/
    stock/
    finance/
  styles/
```

Estado global deve ser mínimo. Primeiro usar `useState/useEffect`; quando crescer, adotar TanStack Query para cache de API.

## Backend

Python deve ficar organizado por camadas:

```text
engeletra_api/
  main.py
  settings.py
  security.py
  database.py
  schemas.py
  routers/
  services/
  repositories/
```

Regra:

- router recebe HTTP
- service contém regra de negócio
- repository fala com SQLite
- schema valida entrada/saída

## Escalabilidade

### Fase 1: Desktop local

- SQLite
- uma empresa
- uso local
- backup manual ou automático
- custo zero

### Fase 2: Desktop com sincronização

- SQLite local
- exportação/importação
- backup em pasta escolhida pelo usuário
- sincronização opcional futura

### Fase 3: Servidor próprio

- FastAPI em servidor
- PostgreSQL
- login de usuários
- permissões por perfil
- múltiplos computadores

### Fase 4: SaaS

- multiempresa
- assinatura
- backups automáticos
- auditoria
- monitoramento
- integração WhatsApp/email

## Organização de código

Regras do projeto:

- comentários apenas onde a regra não for óbvia
- funções pequenas
- nomes em inglês no código e português na interface
- cada módulo do negócio deve ter pasta própria
- evitar lógica de negócio dentro do React
- evitar SQL espalhado em componentes
- toda exclusão importante deve validar vínculos
- toda ação automática deve ser idempotente

## Custo zero

Ferramentas sem custo inicial:

- Python
- FastAPI
- SQLite
- React
- Vite
- Electron
- GitHub

Custos futuros possíveis:

- assinatura de certificado para instalador
- hospedagem se virar SaaS
- serviço de WhatsApp
- backup em nuvem
- assinatura digital

## Próximas prioridades técnicas

1. Separar backend em routers/services/repositories.
2. Criar autenticação local simples.
3. Criar tela de backup/restauração.
4. Criar importadores das planilhas.
5. Criar relatórios PDF profissionais.
6. Criar instalador Windows primeiro.
7. Depois criar instalador macOS.
