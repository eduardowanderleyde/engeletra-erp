# Engeletra ERP Desktop

Versao desktop profissional do Engeletra ERP, pensada para gerar instaladores de Windows e macOS.

## Arquitetura

- Backend: Python + FastAPI + SQLite
- Frontend: React + Vite
- Desktop: Electron
- Banco local: `engeletra.db`

O usuario final nao abre navegador. O Electron abre uma janela de aplicativo e conversa com o backend Python local.

As decisões de segurança, banco de dados, escala e custo zero ficam em:

```text
docs/arquitetura-seguranca.md
```

## Estrutura

```text
engeletra-desktop/
  backend/      API Python, banco SQLite e regras de negocio
  frontend/     Interface React
  desktop/      Janela desktop Electron
```

## Rodar em desenvolvimento

Instalar dependencias:

```bash
cd engeletra-desktop/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cd ../frontend
npm install

cd ..
npm install
```

Rodar backend:

```bash
cd backend
source .venv/bin/activate
uvicorn engeletra_api.main:app --reload --port 8787
```

Rodar frontend:

```bash
cd frontend
npm run dev
```

Rodar janela desktop:

```bash
cd engeletra-desktop
npm run desktop
```

## Build Windows/macOS

```bash
npm run dist
```

O build gera instaladores em `dist/`.

## Observacao

Esta base ja separa responsabilidades corretamente:

- Python guarda dados e regras.
- React cuida da interface.
- Electron entrega a experiencia de software desktop.
