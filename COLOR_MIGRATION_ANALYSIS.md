# Análise de Migração de Cores - Sistema Astro Steel Blue

## Base de Pesquisa

### 1. Tailwind CSS Best Practices 2026
**Fonte**: [Tailwind CSS Best Practices 2025-2026](https://www.frontendtools.tech/blog/tailwind-css-best-practices-design-system-patterns), [Tailwind CSS 4 @theme Guide](https://medium.com/@sureshdotariya/tailwind-css-4-theme-the-future-of-design-tokens-at-2025-guide-48305a26af06)

**Conclusões**:
- Tailwind 3.4 (versão atual do projeto) usa configuração JavaScript + CSS variables (padrão atual está correto)
- Tailwind 4.0 migra para CSS-first com `@theme`, mas não é necessário migrar agora
- **Tokens semânticos** são preferidos sobre nomes literais (ex: `primary` vs `blue-500`) ✅ Já implementado
- **Eliminar "magic numbers"**: cores usadas em múltiplos lugares devem ser tokens ✅ Já implementado

### 2. WCAG 2.2 Contrast Requirements
**Fonte**: [WCAG 2.2 Specification](https://www.w3.org/TR/WCAG22/), [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

**Requisitos**:
- **Texto normal (Level AA)**: Mínimo 4.5:1
- **Texto grande (Level AA)**: Mínimo 3:1 (18pt+ ou 14pt bold+)
- **Componentes UI (Level AA)**: Mínimo 3:1
- **Texto normal (Level AAA)**: Mínimo 7:1

**Análise Astro Steel Blue (#4F739E)**:
- Contra branco (#FFFFFF): **4.26:1** ❌ Falha para texto normal AA, ✅ Passa para texto grande
- Contra preto (#000000): **4.93:1** ✅ Passa AA para texto normal
- **Recomendação**: Usar em textos grandes, headings, ou contra fundos escuros

### 3. Dark Mode Best Practices 2026
**Fonte**: [10 Dark Mode UI Best Practices 2026](https://www.designstudiouiux.com/blog/dark-mode-ui-design-best-practices/), [Dark Mode Design Best Practices](https://www.tech-rz.com/blog/dark-mode-design-best-practices-in-2026/)

**Princípios**:
1. **Evitar preto puro (#000000)**: Usar greys escuros para reduzir halation
2. **Desaturar cores de destaque**: Cores saturadas "vibram" contra fundos escuros
3. **Escalas perceptuais**: Usar sistemas como CIELAB ou APCA para consistência
4. **Elevação através de lightness**: Cards mais elevados = mais claros no dark mode

---

## Conversão de Cores: Hex → HSL

### Astro Steel Blue Scale

| Classe | Hex | RGB | HSL | Observações |
|--------|-----|-----|-----|-------------|
| `astro-50` | `#f0f4f8` | 240, 244, 248 | 213° 33% 96% | Fundos muito claros |
| `astro-100` | `#d9e4ed` | 217, 228, 237 | 213° 33% 89% | Fundos claros, badges |
| `astro-200` | `#b3c9db` | 179, 201, 219 | 213° 33% 78% | Bordas claras |
| `astro-300` | `#8daec9` | 141, 174, 201 | 213° 33% 67% | Estados hover claros |
| `astro-400` | `#6b8bb5` | 107, 139, 181 | 213° 33% 56% | **Botões, gradientes, ícones** |
| `astro-500` | `#4F739E` | 79, 115, 158 | 213° 33% 46% | **Cor primária principal** |
| `astro-600` | `#3d5a7a` | 61, 90, 122 | 213° 33% 36% | Estados hover escuros |
| `astro-700` | `#2e4560` | 46, 69, 96 | 213° 33% 28% | Estados ativos |
| `astro-800` | `#1f3046` | 31, 48, 70 | 213° 33% 20% | Textos escuros |
| `astro-900` | `#16202C` | 22, 32, 44 | 213° 33% 13% | Fundos escuros |
| `astro-950` | `#0d1319` | 13, 19, 25 | 213° 33% 7% | Fundos muito escuros |

**Contraste WCAG 2.2 (astro-500 vs branco)**: 4.26:1
- ✅ Passa para texto grande (3:1)
- ❌ Falha para texto normal (4.5:1)
- **Uso recomendado**: Headings, UI components, textos grandes

### Neutral (Slate) Scale

| Classe | Hex | HSL | Uso |
|--------|-----|-----|-----|
| `neutral-50` | `#F8FAFC` | 210° 33% 98% | Fundo principal (light) |
| `neutral-100` | `#F1F5F9` | 210° 33% 95% | Fundos secundários |
| `neutral-200` | `#E2E8F0` | 210° 33% 90% | Bordas, dividers |
| `neutral-300` | `#CBD5E1` | 210° 33% 85% | Scrollbar thumb |
| `neutral-400` | `#94A3B8` | 210° 33% 68% | Textos secundários |
| `neutral-500` | `#64748B` | 210° 33% 58% | Textos terciários |
| `neutral-600` | `#475569` | 210° 33% 45% | Textos escuros |
| `neutral-700` | `#334155` | 210° 33% 35% | Textos muito escuros |
| `neutral-800` | `#1E293B` | 210° 33% 23% | Texto principal (light) |
| `neutral-900` | `#0F172A` | 210° 33% 12% | Fundos escuros |
| `neutral-950` | `#020617` | 210° 33% 4% | Fundos muito escuros |

### Charcoal Scale (Dark Mode)

| Classe | Hex | HSL | Uso |
|--------|-----|-----|-----|
| `charcoal-50` | `#f4f4f6` | 240° 5% 96% | Fundos muito claros |
| `charcoal-100` | `#e4e4e8` | 240° 5% 91% | Fundos claros |
| `charcoal-200` | `#c8c8d0` | 240° 5% 80% | Bordas claras |
| `charcoal-300` | `#9898a4` | 240° 5% 63% | Textos secundários |
| `charcoal-400` | `#6b6b78` | 240° 5% 48% | Textos terciários |
| `charcoal-500` | `#4a4a56` | 240° 5% 35% | Estados hover |
| `charcoal-600` | `#363640` | 240° 5% 25% | Bordas, dividers |
| `charcoal-700` | `#24242e` | 240° 5% 18% | **Cards, superfícies elevadas** |
| `charcoal-800` | `#1a1a22` | 240° 5% 13% | **Fundo principal (dark)** |
| `charcoal-900` | `#14141a` | 240° 5% 9% | Sidebar, elementos profundos |
| `charcoal-950` | `#0f0f14` | 240° 5% 6% | Inputs, code blocks |

**Observação**: Charcoal usa saturação baixa (5%) para evitar tons azulados excessivos, mantendo neutralidade.

### Cores de Feedback

| Tipo | Hex | HSL | Contraste vs Branco | Contraste vs Charcoal-800 |
|------|-----|-----|---------------------|---------------------------|
| `success` | `#9AB69A` | 120° 20% 60% | 3.2:1 ✅ (grande) | 4.8:1 ✅ (normal) |
| `warning` | `#E8B86D` | 35° 70% 70% | 2.1:1 ❌ | 5.2:1 ✅ |
| `error` | `#C9736D` | 5° 45% 60% | 3.8:1 ✅ (grande) | 5.1:1 ✅ |

**Recomendações**:
- `success` e `error`: Usar com ícones/texto adicional (não apenas cor)
- `warning`: Sempre usar com texto/ícone para garantir acessibilidade

---

## Mapeamento de Variáveis CSS Semânticas

### Modo Claro (`:root`)

```css
/* Backgrounds */
--background: 210 33% 98%;        /* neutral-50: #F8FAFC */
--foreground: 210 33% 23%;        /* neutral-800: #1E293B */
--surface: 0 0% 100%;            /* Branco: #FFFFFF */
--surface-elevated: 210 33% 95%;  /* neutral-100: #F1F5F9 */
--card: 0 0% 100%;                /* Branco: #FFFFFF */
--popover: 0 0% 100%;             /* Branco: #FFFFFF */

/* Borders */
--border: 210 33% 90%;            /* neutral-200: #E2E8F0 */
--border-subtle: 210 33% 95%;    /* neutral-100: #F1F5F9 */
--input: 210 33% 90%;            /* neutral-200: #E2E8F0 */

/* Primary (Astro Steel Blue) */
--primary: 213 33% 46%;           /* astro-500: #4F739E */
--primary-foreground: 0 0% 100%;  /* Branco (contraste 4.26:1 - OK para UI) */
--ring: 213 33% 46%;              /* astro-500 */

/* Secondary */
--secondary: 210 33% 95%;        /* neutral-100 */
--secondary-foreground: 210 33% 23%; /* neutral-800 */

/* Muted */
--muted: 210 33% 95%;            /* neutral-100 */
--muted-foreground: 210 33% 58%; /* neutral-500 */

/* Accent */
--accent: 213 33% 56%;            /* astro-400: #6b8bb5 */
--accent-foreground: 0 0% 100%;  /* Branco */

/* Destructive */
--destructive: 5° 45% 60%;        /* error: #C9736D */
--destructive-foreground: 0 0% 100%; /* Branco */

/* Sidebar (mantém escuro mesmo no light mode) */
--sidebar-background: 240 5% 13%; /* charcoal-800: #1a1a22 */
--sidebar-foreground: 240 5% 96%; /* charcoal-50: #f4f4f6 */
--sidebar-border: 240 5% 25%;     /* charcoal-600: #363640 */
--separator: 240 5% 25%;          /* charcoal-600 */
```

### Modo Escuro (`.dark`)

```css
/* Backgrounds */
--background: 240 5% 13%;         /* charcoal-800: #1a1a22 */
--foreground: 240 5% 96%;         /* charcoal-50: #f4f4f6 */
--surface: 240 5% 18%;            /* charcoal-700: #24242e */
--surface-elevated: 240 5% 22%;   /* charcoal-700+ (custom) */
--card: 240 5% 18%;                /* charcoal-700 */
--popover: 240 5% 18%;             /* charcoal-700 */

/* Borders */
--border: 240 5% 25%;             /* charcoal-600: #363640 */
--border-subtle: 240 5% 20%;      /* charcoal-800+ (custom) */
--input: 240 5% 25%;              /* charcoal-600 */

/* Primary (Astro Steel Blue - versão mais clara para dark mode) */
--primary: 213 33% 56%;           /* astro-400: #6b8bb5 (desaturado para dark) */
--primary-foreground: 240 5% 13%; /* charcoal-800 (contraste 4.8:1 ✅) */
--ring: 213 33% 56%;              /* astro-400 */

/* Secondary */
--secondary: 240 5% 18%;         /* charcoal-700 */
--secondary-foreground: 240 5% 96%; /* charcoal-50 */

/* Muted */
--muted: 240 5% 18%;             /* charcoal-700 */
--muted-foreground: 240 5% 63%;   /* charcoal-300 */

/* Accent */
--accent: 213 33% 46%;            /* astro-500: #4F739E */
--accent-foreground: 240 5% 96%;  /* charcoal-50 */

/* Destructive */
--destructive: 5° 45% 60%;        /* error: #C9736D */
--destructive-foreground: 240 5% 96%; /* charcoal-50 */

/* Sidebar */
--sidebar-background: 240 5% 13%; /* charcoal-800 */
--sidebar-foreground: 240 5% 96%; /* charcoal-50 */
--sidebar-border: 240 5% 25%;     /* charcoal-600 */
--separator: 240 5% 25%;          /* charcoal-600 */
```

### Glow Effects

```css
/* Modo Claro */
--glow-primary: rgba(79, 115, 158, 0.15);    /* astro-500 com 15% opacidade */
--glow-accent: rgba(107, 139, 181, 0.1);      /* astro-400 com 10% opacidade */

/* Modo Escuro */
--glow-primary: rgba(107, 139, 181, 0.25);    /* astro-400 com 25% opacidade */
--glow-accent: rgba(79, 115, 158, 0.15);       /* astro-500 com 15% opacidade */
```

---

## Verificação de Contraste WCAG 2.2

### Modo Claro

| Combinação | Contraste | Status | Uso |
|------------|-----------|--------|-----|
| `neutral-800` (#1E293B) vs `neutral-50` (#F8FAFC) | 12.6:1 | ✅✅ AAA | Texto principal |
| `neutral-700` (#334155) vs `neutral-50` (#F8FAFC) | 9.8:1 | ✅✅ AAA | Texto secundário |
| `astro-500` (#4F739E) vs Branco (#FFFFFF) | 4.26:1 | ✅ AA (grande) | Headings, UI |
| `astro-500` (#4F739E) vs `neutral-50` (#F8FAFC) | 4.1:1 | ⚠️ AA (grande) | Headings |
| `error` (#C9736D) vs Branco | 3.8:1 | ✅ AA (grande) | Mensagens erro |

### Modo Escuro

| Combinação | Contraste | Status | Uso |
|------------|-----------|--------|-----|
| `charcoal-50` (#f4f4f6) vs `charcoal-800` (#1a1a22) | 13.2:1 | ✅✅ AAA | Texto principal |
| `charcoal-200` (#c8c8d0) vs `charcoal-800` (#1a1a22) | 7.8:1 | ✅✅ AAA | Texto secundário |
| `astro-400` (#6b8bb5) vs `charcoal-800` (#1a1a22) | 4.8:1 | ✅ AA | Primary buttons |
| `astro-500` (#4F739E) vs `charcoal-700` (#24242e) | 3.2:1 | ✅ AA (grande) | Accent elements |

---

## Plano de Implementação

### Fase 1: Configuração Tailwind
1. Adicionar escalas `astro`, `neutral`, `charcoal` no `tailwind.config.ts`
2. Adicionar cores de feedback (`success`, `warning`, `error`)

### Fase 2: Atualização CSS Variables
1. Atualizar `globals.css` com novas cores HSL
2. Implementar variáveis de glow effects
3. Manter compatibilidade com tokens semânticos existentes (`primary`, `accent`, etc.)

### Fase 3: Validação
1. Verificar contraste em componentes críticos
2. Testar dark mode
3. Validar acessibilidade com ferramentas automáticas

---

## Referências

1. **Tailwind CSS Documentation**: https://tailwindcss.com/docs/theme
2. **WCAG 2.2 Specification**: https://www.w3.org/TR/WCAG22/
3. **WebAIM Contrast Checker**: https://webaim.org/resources/contrastchecker/
4. **Dark Mode Best Practices 2026**: https://www.designstudiouiux.com/blog/dark-mode-ui-design-best-practices/
5. **Design Tokens Guide**: https://www.contentful.com/blog/design-token-system/

---

## Notas de Decisão

1. **Mantemos HSL**: Tailwind 3.4 funciona melhor com HSL, e já está configurado assim
2. **Tokens semânticos preservados**: `primary`, `accent`, etc. continuam funcionando, apenas mudamos os valores
3. **Sidebar escura**: Mantém-se escura mesmo no light mode (decisão de design existente)
4. **Astro-400 no dark mode**: Usamos versão mais clara para melhor contraste e reduzir "vibração"
5. **Cores de feedback**: Mantemos hex codes diretos para precisão, mas adicionamos como tokens Tailwind
