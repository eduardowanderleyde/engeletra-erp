# Engeletra ERP — Guia de Instalação e Operação

---

## Pré-requisitos

| Ferramenta | Versão mínima | Verificar |
|---|---|---|
| Python | 3.12 | `python3 --version` |
| Node.js | 20 LTS | `node --version` |
| npm | 10 | `npm --version` |
| Docker (opcional) | 24 | `docker --version` |

---

## Modo desenvolvimento (3 terminais)

### Terminal 1 — Backend

```bash
cd engeletra-desktop/backend
python3 -m venv .venv3
source .venv3/bin/activate        # Windows: .venv3\Scripts\activate
pip install -r requirements.txt
uvicorn engeletra_api.main:app --host 127.0.0.1 --port 8787 --reload
```

API disponível em `http://127.0.0.1:8787`  
Documentação interativa em `http://127.0.0.1:8787/docs`

### Terminal 2 — Frontend

```bash
cd engeletra-desktop/frontend
npm install
npm run dev
```

Interface disponível em `http://127.0.0.1:5177`

### Terminal 3 — App desktop (opcional)

Junta tudo em uma janela nativa sem precisar abrir o navegador.

```bash
cd engeletra-desktop
npm install
npm run desktop
```

---

## Modo Docker

Sobe backend + frontend buildado numa imagem única. Indicado para servidor ou rede interna.

### Primeira vez

```bash
cd engeletra-desktop

# Gere uma chave secreta para os tokens JWT
python3 -c "import secrets; print(secrets.token_hex(32))"

# Crie o arquivo de variáveis de ambiente
cp .env.example .env   # se existir; caso contrário crie manualmente
```

Edite o `.env`:

```env
ENGELETRA_SECRET_KEY=cole_aqui_a_chave_gerada
ENGELETRA_ADMIN_PASSWORD=senha_do_admin
```

### Subir o serviço

```bash
cd engeletra-desktop
docker compose up -d
```

Acesse em `http://localhost:8787`

### Parar / reiniciar

```bash
docker compose down          # para e remove container (dados preservados no volume)
docker compose restart       # reinicia sem remover
docker compose logs -f       # acompanha logs em tempo real
```

### Reconstruir após atualização

```bash
git pull
cd engeletra-desktop
docker compose build --no-cache
docker compose up -d
```

---

## Gerar instalador desktop

O instalador empacota o backend Python, o frontend buildado e o Electron numa única aplicação.

```bash
cd engeletra-desktop

# Instalar dependências
npm install

# Windows (.exe instalador + portable)
npm run dist:win

# macOS (.dmg + .zip)
npm run dist:mac
```

Saídas geradas em `engeletra-desktop/dist/`.

---

## Variáveis de ambiente

Todas opcionais. Em desenvolvimento os valores padrão funcionam sem configuração.

| Variável | Padrão | Descrição |
|---|---|---|
| `ENGELETRA_SECRET_KEY` | chave volátil | Chave para assinar tokens JWT. Defina em produção ou os tokens expiram ao reiniciar |
| `ENGELETRA_ADMIN_PASSWORD` | `admin` | Senha do usuário admin criado no primeiro boot |
| `ENGELETRA_DATA_DIR` | pasta do projeto | Onde o arquivo `engeletra.db` é salvo |
| `ENGELETRA_API_HOST` | `127.0.0.1` | Interface de escuta do backend |
| `ENGELETRA_API_PORT` | `8787` | Porta do backend |
| `ENGELETRA_ALLOWED_ORIGINS` | `127.0.0.1:5177` | Origens permitidas pelo CORS |
| `ENGELETRA_STATIC_DIR` | vazio | Pasta do build Vite (preenchida automaticamente no Docker) |

---

## Backup do banco de dados

O banco é um único arquivo SQLite. Basta copiá-lo.

```bash
# Localização padrão (desenvolvimento)
cp engeletra-desktop/backend/engeletra.db engeletra_backup_$(date +%Y%m%d).db

# Localização no Docker (volume nomeado)
docker run --rm -v engeletra-data:/data -v $(pwd):/backup alpine \
  cp /data/engeletra.db /backup/engeletra_backup_$(date +%Y%m%d).db
```

---

## Manutenção de segurança

### Auditar dependências Python

```bash
cd engeletra-desktop/backend
source .venv3/bin/activate
pip install pip-audit
pip-audit
```

### Auditar dependências JavaScript (frontend)

```bash
cd engeletra-desktop/frontend
npm audit
npm audit fix        # aplica correções automáticas seguras
```

### Auditar dependências JavaScript (Electron)

```bash
cd engeletra-desktop
npm audit
npm audit fix
```

### Escanear imagem Docker com Trivy

```bash
# Instalar Trivy (macOS)
brew install trivy

# Build e scan
cd engeletra-desktop
docker build -t engeletra-erp:scan .
trivy image --severity HIGH,CRITICAL engeletra-erp:scan
```

### Atualizar imagens base do Docker

Edite `engeletra-desktop/Dockerfile` e atualize as versões fixadas:

```dockerfile
FROM node:20.XX.X-bookworm-slim AS frontend
FROM python:3.12.XX-slim-bookworm
```

Em seguida reconstrua:

```bash
docker compose build --no-cache
docker compose up -d
```

---

## Solução de problemas

### Backend não sobe

- Verifique se a porta 8787 está livre: `lsof -i :8787`
- Confirme que o venv está ativado antes de rodar o uvicorn
- Veja o erro completo no terminal do backend

### Frontend não conecta ao backend

- Confirme que o backend está rodando em `http://127.0.0.1:8787`
- Verifique `ENGELETRA_ALLOWED_ORIGINS` se estiver em rede diferente

### Docker: container reinicia em loop

```bash
docker compose logs engeletra-erp
```

Causa mais comum: `ENGELETRA_SECRET_KEY` não definida ou banco corrompido.

### Banco corrompido

```bash
# Verificar integridade
sqlite3 engeletra.db "PRAGMA integrity_check;"

# Restaurar backup
cp engeletra_backup_YYYYMMDD.db engeletra.db
```

---

## Estrutura de portas

| Porta | Serviço | Quem acessa |
|---|---|---|
| `8787` | FastAPI (backend + static) | Electron, navegador, Docker |
| `5177` | Vite dev server (apenas dev) | Electron em desenvolvimento |
