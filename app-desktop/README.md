# Engeletra ERP Desktop

Esta e a primeira versao clicavel do Engeletra ERP.

Ela roda localmente no computador, salva dados no navegador via `localStorage` e permite testar os fluxos principais:

- Clientes
- Equipamentos
- Orcamentos tecnicos
- Criacao automatica de OS ao aprovar orcamento
- Conclusao de OS com geracao de cobranca
- Estoque simples
- Dashboard
- Impressao/PDF de proposta e relatorio de OS

## Como abrir

No macOS, use o arquivo:

```text
Abrir Engeletra ERP.command
```

Tambem e possivel abrir diretamente:

```text
app-desktop/index.html
```

## Observacao

Esta versao e local e sem servidor. Para virar executavel instalavel de Windows/macOS, o proximo passo recomendado e empacotar esta interface em Electron ou Tauri, com banco SQLite local.
