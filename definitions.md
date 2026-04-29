# Definitions — Engeletra ERP

Decisões de design de cada módulo. Referência para manutenção e evolução.

---

## Módulos implementados

### Fornecedores
- CRUD completo com categorias: Elétrico, Ferramentas, EPI, Combustível, Transportadora, Serviços, Outros
- Busca por nome, CNPJ ou contato
- Será vinculado a Despesas e Pedidos de Compra por nome (texto), não FK, para simplicidade

### Despesas
- Categorias: Combustível, Material Elétrico, Ferramentas/EPI, Alimentação/Hospedagem, Aluguel, Manutenção, Salários/RH, Impostos/Guias, Telefone/Internet, Outros
- Status: Pendente → Pago (botão rápido "Pago" na tabela)
- Vencidos destacados em vermelho automaticamente (data_vencimento < hoje e status Pendente)
- Vinculável a Obra opcional

### Caixa
- Dashboard sem tabela própria — agrega dados de `invoices` (recebidas) + `despesas` (pagas)
- Bloco escuro superior mostra saldo total dos bancos + projeção (A Receber − A Pagar)
- Navegação por mês com setas
- Receitas = invoices com status 'Recebido' no mês | Despesas = despesas com status 'Pago' no mês

### Contas Bancárias
- CRUD simples: banco, agência, conta, tipo (Corrente/Poupança/Aplicação/Caixa Interno), saldo_atual
- Contas ativas exibidas como cards visuais com saldo em verde/vermelho
- Inativas exibidas em tabela abaixo
- Bancos pré-definidos: BB, BNB, Bradesco, Itaú, Caixa Econômica, Nubank, Outros

### Previsão de Pagamentos
- View read-only — sem tabela própria
- A Receber: faturas pendentes ordenadas por vencimento
- A Pagar: despesas pendentes ordenadas por data_vencimento
- Filtro de horizonte: 30 / 60 / 90 dias
- Vencidos destacados em vermelho

### Relatórios Técnicos
- Lista todos os ensaios elétricos com filtro por resultado
- Clique em "Visualizar" abre laudo formatado em modal
- Botão "Imprimir / PDF" chama window.print() — o navegador gera o PDF
- Seções do laudo: Identificação → Equipamento → Medições (apenas campos preenchidos) → Resultado
- Campos nulos/vazios são omitidos automaticamente

### Cronograma
- Alocações de técnicos por obra/período com tipo: Serviço, Obra, Férias, Atestado, Treinamento, Folga
- Filtro por mês/ano com navegação por setas
- Mostra alocações que iniciam no mês selecionado OU que atravessam o período
- Cores por tipo na tabela

### Controle de Ponto
- Registro diário: técnico + data + entrada/almoço/saída + tipo + horas extras
- Horas trabalhadas calculadas automaticamente no modal (total − almoço)
- Filtro por mês e por técnico
- Tipos: Normal, Hora Extra, Falta, Atestado, Férias, Folga, Viagem
- Para Falta/Férias/Folga, os campos de horário são ocultados

### Folha de Pagamento
- Lançamentos mensais por técnico: salário base + extras + descontos
- Bruto e líquido calculados em tempo real no modal
- Botão rápido "Pago" na tabela
- Filtro por mês/ano com navegação

### Pedidos de Compra
- Código automático PED-XXXX
- Pipeline de status: Rascunho → Aprovado → Comprado → Recebido
- Botão "→ [próximo status]" na tabela para avanço rápido
- Vinculável a Obra
- Descrição/Itens em textarea livre (sem tabela de itens — simplicidade)

### Manutenção de Frota
- Registro por veículo: tipo (Preventiva/Corretiva/Revisão/Pneu/Óleo/Elétrica), data, km, valor
- Filtro rápido por veículo como botões no topo
- Status: Realizada, Pendente, Agendada

---

## Decisões gerais de UI

| Decisão | Motivo |
|---|---|
| Botão de ação rápida (Pago, → Status) diretamente na tabela | Reduz cliques para operações frequentes |
| Campos nulos omitidos no laudo PDF | Laudo limpo mesmo com ensaio parcialmente preenchido |
| Caixa e Previsão sem tabela própria | Evita duplicação — os dados já existem em outras tabelas |
| Filtro por status como botões pill, não select | Mais visual e rápido de usar |
| Vencidos destacados com fundo vermelho na linha | Alerta visual sem precisar abrir o registro |
| Saldo bancário negativo em vermelho | Feedback imediato de problema financeiro |

---

## Fluxo financeiro completo

```
Orçamento aprovado
  → OS gerada automaticamente
  → OS concluída → Fatura criada com impostos
  → Fatura marcada "Recebido" → aparece no Caixa do mês

Despesa lançada (Pendente)
  → aparece em Previsão/A Pagar
  → marcada "Pago" → aparece no Caixa do mês
```

---

## O que ainda não foi implementado (próximas fases)

| Módulo | Complexidade | Dependência |
|---|---|---|
| Geração de PDF real (wkhtmltopdf/Puppeteer) | Alta | window.print() já funciona para casos simples |
| Baixa automática de estoque ao concluir OS | Média | Requer vincular materiais da OS a stock_items |
| Importação de extrato bancário (OFX) | Alta | Requer parsing de OFX |
| Portal do cliente | Muito Alta | Fase SaaS |
| Notificações de vencimento | Média | Electron Notifications API |
