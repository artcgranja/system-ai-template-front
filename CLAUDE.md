# CLAUDE.md - VORA Energia Frontend Guidelines

## Research-First Directive (CRITICAL)

**ALWAYS research before acting.** Claude Code must:

1. **Get the current date from the system** - We are in 2026. Use `date` command or system context to verify the current date before any time-sensitive research.
2. **Search for the newest references** - Before implementing or suggesting any solution, search for:
   - Latest documentation (2025-2026)
   - Current best practices
   - Updated library versions
   - Breaking changes in recent releases
3. **Verify before implementing** - Never assume knowledge is current. APIs, libraries, and frameworks evolve rapidly.
4. **Cite sources when possible** - Reference official docs, GitHub releases, or authoritative sources.
5. **Prioritize official documentation** - Always check the official docs of technologies in our stack first.

**Example workflow:**
```
User: "Add dark mode toggle"
Claude:
  1. Check current date (2026)
  2. Search "next-themes 2026 latest version"
  3. Search "shadcn/ui dark mode 2026 best practices"
  4. Verify our current next-themes version in package.json
  5. Research any breaking changes since our version
  6. Then implement with verified, current approach
```

---

## Project Overview

**Company:** VORA Energia
**Segment:** Energy Sector - Intelligent virtual assistant platform for managers
**Year:** 2026

**Core Philosophy:** Research-grounded, fact-based implementations with current best practices. No outdated patterns.

---

## Architecture

### Tech Stack
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15 | App Router, Server Components |
| React | 19 | UI Library |
| TypeScript | 5 | Type Safety (strict mode) |
| Tailwind CSS | + shadcn/ui | Styling & Components |
| Zustand | Latest | State Management |
| TanStack Query | v5 | Server State & Caching |
| SSE | Native | Real-time Streaming |
| Recharts | v3 | Data Visualization |
| Framer Motion | v12 | Subtle Animations |
| Axios | v1.6+ | HTTP Client |

### Project Structure
```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Login route group
│   ├── (dashboard)/       # Protected routes with sidebar
│   │   ├── chat/          # Chat conversation pages
│   │   ├── admin/         # Admin management
│   │   ├── feedback/      # User feedback
│   │   ├── wiki/          # Knowledge base
│   │   └── profile/       # User profile
│   └── layout.tsx         # Root layout with providers
├── components/
│   ├── ui/               # Base shadcn/ui components
│   ├── chat/             # Chat interface (MessageBubble, ChatInterface)
│   ├── layout/           # Sidebar, Header
│   ├── admin/            # Admin panel
│   ├── auth/             # Authentication
│   └── [feature]/        # Feature-specific components
├── lib/
│   ├── api/              # API layer
│   │   ├── factory/      # CRUD API factory pattern
│   │   ├── chat.ts       # Chat API with SSE streaming
│   │   ├── client.ts     # Axios with auth interceptors
│   │   └── [resource].ts # Resource-specific APIs
│   ├── stores/           # Zustand stores
│   │   ├── chatStore.ts  # Conversations, messages, planning
│   │   └── authStore.ts  # Authentication state
│   ├── hooks/            # Custom hooks
│   │   ├── useChat.ts    # Main chat hook with streaming
│   │   ├── useAuth.ts    # Auth operations
│   │   └── usePlanningTools.ts # Plan approval workflow
│   ├── utils/            # Utilities
│   │   ├── transformers.ts # snake_case ↔ camelCase
│   │   └── auth.ts       # Token management
│   └── config/           # Configuration constants
└── types/                # TypeScript interfaces
    ├── chat.ts           # Chat domain types
    ├── planning.ts       # Planning tools types
    └── [domain].ts       # Domain-specific types
```

---

## Core Patterns

### 1. API Factory Pattern
```typescript
createCrudApi<Frontend, Backend, CreateInput, UpdateInput>({
  endpoint: '/api/resource',
  transformer: transformer,
  customOperations: { /* extensions */ }
})
```

### 2. Transformer Pattern
- Automatic snake_case ↔ camelCase conversion
- Used for all backend ↔ frontend data flow
- Custom field mappings supported

### 3. State Management (Zustand)
- Persistent stores with middleware
- Shallow comparison for performance (`useShallow`)
- Getter pattern for fresh state access

### 4. SSE Streaming
- Server-Sent Events for real-time chat
- Batched updates (50-100ms) to prevent UI lag
- Event types: `assistant_message_chunk`, `tool_call_start`, `tool_content_chunk`, etc.

### 5. Planning Tools (LangGraph Interrupt)
- Plan approval workflow: `plan_awaiting_approval` → user action → continue
- Stored in `activePlan` state
- Actions: approve, reject, comment

---

## Coding Standards

### TypeScript
- **Strict mode enabled** - no `any`
- Explicit return types for functions
- Interface over type when possible
- Use `@/` path aliases for imports

### React Patterns
- Functional components only
- `'use client'` only when needed (interactivity, hooks)
- Server Components by default
- Small, focused components (Single Responsibility)

### Styling
- Tailwind CSS with shadcn/ui components
- Dark/light mode via next-themes
- CSS variables for theme colors
- Subtle Framer Motion animations (don't overdo)

### Naming Conventions
- Components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Utils/Lib: `camelCase.ts`
- Types: `camelCase.ts`
- Variables/functions: English, descriptive

---

## Authentication

- JWT tokens with refresh rotation
- Access token in localStorage + cookie (for middleware)
- Automatic refresh before expiration
- Protected routes via Next.js middleware
- API interceptors handle 401 → refresh → retry

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `chatStore.ts` | Central chat state management |
| `useChat.ts` | SSE streaming and message handling |
| `chat.ts` (lib/api) | Chat endpoints and event processing |
| `client.ts` | Axios instance with interceptors |
| `middleware.ts` | Auth validation and routing |
| `ChatInterface.tsx` | Main chat UI component |
| `transformers.ts` | Data transformation factory |
| `constants.ts` | Routes and configuration |

---

## Commands

```bash
npm run dev     # Development server (localhost:3000)
npm run build   # Production build
npm run start   # Start production server
npm run lint    # ESLint
```

---

## Git Conventions

### Branch Names
- `feature/description`
- `fix/description`
- `refactor/description`
- `sprint-N` (sprint branches)

### Commit Messages
Use conventional commits with tags:
- `[FEAT]` - New feature
- `[FIX]` - Bug fix
- `[REFACTOR]` - Code refactoring
- `[PERF]` - Performance improvement
- `[DOCS]` - Documentation
- `[STYLE]` - Code style/formatting

---

## UI/UX Principles

1. **Clean Design** - Professional interface for energy sector executives
2. **Responsive** - Mobile-first, works on all screen sizes
3. **Accessible** - WCAG 2.1 compliance, ARIA labels, keyboard navigation
4. **Fast** - Streaming responses, optimistic updates, skeleton states
5. **Clear Feedback** - Loading states, confirmations, actionable error messages

---

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Important Reminders

1. **Research first** - Always verify current best practices before implementing
2. **Check dates** - Use system date to ensure you're referencing 2025-2026 resources
3. **Official docs** - Prioritize official documentation over Stack Overflow
4. **Test changes** - Run build and lint before committing
5. **Keep it simple** - Avoid over-engineering, match existing patterns
6. **Portuguese UX** - User-facing text should be in Portuguese (pt-BR)
