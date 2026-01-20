# VORA Energia IA - Frontend

Assistente de IA estilo Claude/ChatGPT para gestores de energia, construído com Next.js 14, React 18, TypeScript e Tailwind CSS.

## Tecnologias Utilizadas

- **Next.js 14+** (App Router)
- **React 18+**
- **TypeScript** (strict mode)
- **Tailwind CSS** - Estilização
- **shadcn/ui** - Componentes de UI
- **Zustand** - State management
- **React Query (TanStack Query)** - Data fetching e cache
- **Axios** - HTTP client
- **React Markdown** - Renderização de markdown
- **date-fns** - Manipulação de datas

## Estrutura do Projeto

```
src/
├── app/                          # App Router do Next.js
│   ├── (auth)/                  # Grupo de rotas de autenticação
│   │   ├── login/              # Página de login
│   │   └── layout.tsx          # Layout de autenticação
│   ├── (dashboard)/            # Grupo de rotas protegidas
│   │   ├── chat/              # Chat principal
│   │   ├── history/           # Histórico de conversas
│   │   └── layout.tsx         # Layout do dashboard
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Página inicial (redirect)
│   └── globals.css            # Estilos globais
├── components/
│   ├── ui/                    # Componentes shadcn/ui
│   ├── chat/                  # Componentes de chat
│   │   ├── ChatInterface.tsx
│   │   ├── MessageList.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── ChatInput.tsx
│   │   ├── StreamingMessage.tsx
│   │   └── EmptyState.tsx
│   ├── layout/               # Componentes de layout
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── ConversationHistory.tsx
│   ├── auth/                 # Componentes de autenticação
│   │   └── LoginForm.tsx
│   └── providers.tsx         # Providers (React Query, Theme)
├── lib/
│   ├── api/                  # Serviços de API
│   │   ├── client.ts        # Axios instance configurada
│   │   ├── auth.ts          # API de autenticação
│   │   └── chat.ts          # API de chat
│   ├── hooks/               # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useChat.ts
│   │   └── useConversations.ts
│   ├── stores/              # Zustand stores
│   │   ├── authStore.ts
│   │   └── chatStore.ts
│   └── utils/               # Utilitários
│       ├── auth.ts
│       └── helpers.ts
├── types/                   # Definições TypeScript
│   ├── auth.ts
│   ├── chat.ts
│   └── api.ts
├── config/
│   └── constants.ts        # Constantes da aplicação
└── middleware.ts           # Middleware de autenticação
```

## Funcionalidades Implementadas

### Autenticação
- Login com email/senha
- Armazenamento de JWT no localStorage
- Middleware para proteção de rotas
- Auto-logout em caso de token expirado
- Redirect automático após login/logout

### Interface de Chat
- Input expansível com auto-resize (até 200px)
- Suporte a Shift+Enter para nova linha
- Mensagens do usuário (azul claro, alinhadas à direita)
- Mensagens da IA (cinza claro, alinhadas à esquerda)
- Avatares para usuário e IA
- Suporte a markdown nas respostas da IA
- Preparado para streaming de texto em tempo real (SSE)
- Loading indicators
- Estado vazio com sugestões de perguntas

### Histórico de Conversas
- Sidebar com lista de conversas
- Agrupamento por data (Hoje, Ontem, Últimos 7 dias, etc.)
- Botão "Nova Conversa"
- Renomear conversa (com dialog)
- Deletar conversa (com confirmação)
- Navegação entre conversas

### Layout Responsivo
- Desktop: Sidebar fixa + área de chat
- Mobile: Sidebar colapsável (hamburguer menu)
- Header com menu de usuário
- Design adaptativo para tablets

## Configuração e Instalação

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo de exemplo e configure suas variáveis:

```bash
cp .env.local.example .env.local
```

Edite `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Executar em Desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

### 4. Build para Produção

```bash
npm run build
npm start
```

## Docker

A aplicação está configurada para rodar em containers Docker seguindo as melhores práticas.

### Pré-requisitos

- Docker 20.10+
- Docker Compose 2.0+

### Configuração de Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NODE_ENV=development
```

### Desenvolvimento com Docker

Para rodar a aplicação em modo desenvolvimento com hot-reload:

```bash
# Build e start do container
docker-compose up --build

# Rodar em background
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar containers
docker-compose down
```

A aplicação estará disponível em [http://localhost:3000](http://localhost:3000)

### Produção com Docker

Para build e execução em produção:

```bash
# Build da imagem de produção
docker-compose -f docker-compose.prod.yml build

# Executar em produção
docker-compose -f docker-compose.prod.yml up -d

# Ver logs
docker-compose -f docker-compose.prod.yml logs -f

# Parar containers
docker-compose -f docker-compose.prod.yml down
```

### Build Manual da Imagem

```bash
# Build da imagem
docker build -t vora-ai-frontend:latest .

# Executar container
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://localhost:8000 \
  -e NEXT_PUBLIC_SUPABASE_URL=your_supabase_url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key \
  vora-ai-frontend:latest
```

### Características da Configuração Docker

- **Multi-stage build**: Reduz o tamanho final da imagem (~80% menor)
- **Alpine Linux**: Imagem base minimalista e segura
- **Standalone output**: Next.js otimizado para produção
- **Non-root user**: Execução com usuário não-privilegiado para segurança
- **Health checks**: Monitoramento automático da saúde do container
- **Layer caching**: Builds mais rápidos aproveitando cache do Docker

## Scripts Disponíveis

- `npm run dev` - Inicia servidor de desenvolvimento
- `npm run build` - Cria build de produção
- `npm start` - Inicia servidor de produção
- `npm run lint` - Executa ESLint
- `npm run type-check` - Verifica tipos TypeScript

## API Endpoints Esperados

O frontend espera os seguintes endpoints do backend:

### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Dados do usuário atual
- `POST /api/auth/refresh` - Refresh token

### Conversas
- `GET /api/conversations` - Listar conversas
- `GET /api/conversations/:id` - Obter conversa específica
- `POST /api/conversations` - Criar nova conversa
- `PATCH /api/conversations/:id` - Atualizar conversa
- `DELETE /api/conversations/:id` - Deletar conversa

### Chat
- `GET /api/conversations/:id/messages` - Obter mensagens
- `POST /api/chat` - Enviar mensagem (com streaming via SSE)

## Estrutura de Dados

### User
```typescript
{
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: Date;
}
```

### Conversation
```typescript
{
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: Date;
  createdAt: Date;
  userId: string;
  messageCount: number;
}
```

### Message
```typescript
{
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  conversationId: string;
  isStreaming?: boolean;
}
```

## Próximos Passos

1. **Integração com Backend**: Conectar com API real
2. **Implementar Streaming Real**: Configurar SSE para respostas em tempo real
3. **Testes**: Adicionar testes unitários e de integração
4. **Otimizações**:
   - Implementar virtualização para listas longas
   - Lazy loading de componentes
   - Otimização de imagens
5. **Funcionalidades Adicionais**:
   - Busca no histórico
   - Exportação de conversas
   - Temas personalizados
   - Configurações de usuário
   - Notificações

## Boas Práticas Implementadas

- TypeScript strict mode
- Componentes reutilizáveis
- Custom hooks para lógica compartilhada
- State management centralizado (Zustand)
- Cache e otimização de queries (React Query)
- Interceptors do Axios para tratamento global de erros
- Middleware para proteção de rotas
- Código limpo e bem comentado
- Responsivo em todos os breakpoints
- Acessibilidade (ARIA labels, navegação por teclado)

## Licença

Este projeto é privado e proprietário da VORA Energia.

## Contato

Para dúvidas ou suporte, entre em contato com a equipe de desenvolvimento.
