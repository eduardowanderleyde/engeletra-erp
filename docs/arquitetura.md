# Arquitetura Funcional

## Principio

O Engeletra ERP deve reaproveitar o maximo possivel do ERPNext:

- `Customer` para clientes.
- `Item`, `Warehouse` e `Stock Entry` para estoque.
- `Sales Invoice` e `Payment Entry` para financeiro.
- `Employee` e `User` para tecnicos e equipe.
- `File` para fotos, documentos e anexos.

DocTypes personalizados ficam restritos ao dominio vertical da Engeletra.

## Fluxo principal

```mermaid
flowchart TD
    A[Cliente solicita servico] --> B[Orcamento Tecnico]
    B --> C{Aprovado?}
    C -->|Sim| D[Ordem de Servico]
    C -->|Nao| E[Reprovado]
    D --> F[Execucao em campo]
    F --> G[Checklist, fotos, horas, KM, materiais]
    G --> H{OS concluida?}
    H -->|Sim| I[Baixa de estoque]
    I --> J[Faturamento]
    J --> K[Recebimento]
    H -->|Nao| F
```

## Extensoes planejadas

- Gestao de obras contratadas.
- Centro de custo por obra.
- Frota, manutencao e motoristas.
- Relatorios tecnicos de transformadores.
- Ensaios eletricos estruturados.
- Migracao de planilhas legadas.
- Portal do cliente.
- Aplicativo/PWA para tecnico em campo.
