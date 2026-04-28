# Empacotamento Windows e macOS

O aplicativo ja possui uma versao local clicavel:

- Windows: `Abrir Engeletra ERP.bat`
- macOS: `Abrir Engeletra ERP.command`

Para gerar instaladores profissionais, use Electron.

## Preparar

```bash
npm install
```

## Rodar em modo aplicativo

```bash
npm start
```

## Gerar instalador para macOS

```bash
npm run dist:mac
```

Saidas esperadas em `dist/`:

- `.dmg`
- `.zip`
- `.app`

## Gerar instalador para Windows

Preferencialmente rode em uma maquina Windows:

```bash
npm run dist:win
```

Saidas esperadas em `dist/`:

- instalador `.exe`
- versao portable `.exe`

## Proximo passo profissional

A versao atual salva dados no navegador local. Para uma versao comercial robusta:

1. Trocar `localStorage` por SQLite.
2. Adicionar login e usuarios.
3. Criar backup local/na nuvem.
4. Adicionar importacao das planilhas da Engeletra.
5. Assinar digitalmente os executaveis para evitar alerta do Windows/macOS.
