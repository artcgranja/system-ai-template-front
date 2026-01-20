# Documentação Docker - VORA Energia Frontend

## Pré-requisitos

- Docker Desktop instalado e rodando
- Arquivo `.env` configurado (opcional, veja seção de variáveis)

## Comandos Rápidos

### Build da Imagem

```bash
docker build -t vora-frontend .
```

### Executar o Container

```bash
docker run --name vora-frontend -p 3000:3000 -e NEXT_PUBLIC_API_URL=https://sua-api.com vora-frontend
```

A aplicação estará disponível em: http://localhost:3000

---

## Variáveis de Ambiente

| Variável | Descrição | Obrigatória |
|----------|-----------|-------------|
| `NEXT_PUBLIC_API_URL` | URL do backend/API | Sim |

### Por que passar variáveis no `docker run`?

Variáveis `NEXT_PUBLIC_*` são embutidas no código JavaScript durante o **build** (não em runtime). Como a imagem Docker é construída uma vez e pode rodar em diferentes ambientes, você precisa:

1. Passar a variável no build (para ambiente fixo), ou
2. Passar no runtime com `-e` (mais flexível)

---

## Comandos Úteis

### Parar o Container

```bash
docker stop vora-frontend
```

### Iniciar Container Existente

```bash
docker start vora-frontend
```

### Ver Logs

```bash
docker logs vora-frontend
```

### Logs em Tempo Real

```bash
docker logs -f vora-frontend
```

### Remover Container

```bash
docker rm vora-frontend
```

### Remover Imagem

```bash
docker rmi vora-frontend
```

### Rebuild (após alterações no código)

```bash
docker build -t vora-frontend . --no-cache
```

---

## Modo Produção com Docker Compose

Crie um arquivo `docker-compose.yml`:

```yaml
version: '3.8'

services:
  frontend:
    build: .
    container_name: vora-frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=https://sua-api.com
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Comandos Docker Compose

```bash
# Subir
docker compose up -d

# Parar
docker compose down

# Rebuild e subir
docker compose up -d --build

# Ver logs
docker compose logs -f
```

---

## Solução de Problemas

### Erro: "Cannot connect to the Docker daemon"

O Docker Desktop não está rodando. Abra o Docker Desktop e tente novamente.

### Erro: "port is already allocated"

A porta 3000 já está em uso. Use outra porta:

```bash
docker run --name vora-frontend -p 3001:3000 -e NEXT_PUBLIC_API_URL=https://sua-api.com vora-frontend
```

### Erro: "name is already in use"

Já existe um container com esse nome. Remova ou use outro nome:

```bash
# Remover container existente
docker rm vora-frontend

# Ou usar outro nome
docker run --name vora-frontend-2 -p 3000:3000 ...
```

### Container para imediatamente

Verifique os logs para identificar o erro:

```bash
docker logs vora-frontend
```

---

## Estrutura da Imagem

A imagem usa multi-stage build otimizado:

1. **deps**: Instala dependências
2. **builder**: Compila a aplicação Next.js
3. **runner**: Imagem final mínima (~150MB)

Configurações de produção incluídas:
- Node.js em modo produção
- Usuário não-root (nextjs)
- Output standalone otimizado
- Security headers configurados
