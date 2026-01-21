# Correção: Tool Calls Paralelas Não Finalizando

## 🔍 Problema Identificado

Quando múltiplas tool calls são executadas simultaneamente, algumas não finalizam corretamente - o status continua como "carregando" (`running`) mesmo depois que os resultados já foram retornados via `tool_call_complete`.

### Sintomas
- Tool calls com `call_id` únicos são iniciadas simultaneamente
- Eventos `tool_call_complete` são recebidos com resultados válidos
- Status da UI continua mostrando como "carregando" indefinidamente

## 🎯 Causa Raiz

A função `handleToolCallComplete` tinha duas limitações críticas:

1. **Verificação de status muito restritiva**: Só completava tool calls com status `'running'`, ignorando tool calls com status `'starting'`
   - Problema: Se `tool_call_complete` chegar antes de `tool_call_execution` (ou se houver falha na atualização), tool calls com status `'starting'` nunca são completados

2. **Busca por `call_id` não otimizada**: A busca não priorizava suficientemente o uso de `call_id` para identificar tool calls em cenários paralelos
   - Problema: Em tool calls paralelas com o mesmo `tool_name`, a busca pode encontrar o tool call errado

## ✅ Solução Implementada

### 1. Aceitar múltiplos status na finalização
```typescript
// ANTES: Só completava se status === 'running'
if (toolCall.status === 'running') {
  completeToolCall(...);
}

// DEPOIS: Completa se status é 'starting' ou 'running'
if (toolCall.status === 'running' || toolCall.status === 'starting') {
  completeToolCall(...);
}
```

**Justificativa**: Baseado em pesquisa sobre LangGraph e SSE events, eventos podem chegar fora de ordem, especialmente em execuções paralelas. Tool calls devem ser completados independentemente de terem recebido `tool_call_execution` antes.

### 2. Busca otimizada por `call_id`
```typescript
// Prioriza sempre call_id quando disponível (REQUIRED para parallel calls)
if (callId) {
  toolCall = message.toolCalls.find(tc => tc.id === callId);
  // Se não encontrado, busca em todas as mensagens
  if (!toolCall) {
    for (const msg of messages) {
      toolCall = msg.toolCalls?.find(tc => tc.id === callId);
      if (toolCall) break;
    }
  }
} else {
  // Fallback apenas quando call_id não está disponível (viola contrato)
  console.warn('No call_id provided - using fallback search');
  toolCall = message.toolCalls.find(tc => 
    tc.tool_name === toolName && (tc.status === 'running' || tc.status === 'starting')
  );
}
```

**Justificativa**: 
- Documentação `INTERRUPT_CALL_ID_REQUIREMENT.md` estabelece que `call_id` é REQUIRED
- Pesquisa sobre LangGraph parallel tool calls (GitHub issues #3034, #2610) confirma que `call_id` é essencial para evitar ambiguidade

### 3. Logs melhorados para debug
- Logs mais detalhados mostrando status atual de todos os tool calls
- Warnings quando `call_id` não está presente (viola contrato backend)
- Informações sobre tool calls disponíveis quando busca falha

## 📚 Referências e Pesquisa

### Documentação Interna
- `INTERRUPT_CALL_ID_REQUIREMENT.md`: Estabelece que `call_id` é REQUIRED em eventos de interrupt
- `CLAUDE.md`: Diretrizes de pesquisa-first e uso de documentação oficial

### Pesquisa Externa (2026)
1. **LangGraph Parallel Tool Calls**
   - GitHub Issue #3034: "Tool calls not working as expected when are called in parallel"
   - GitHub Issue #2610: Problemas similares com execução paralela
   - Solução: Usar `call_id` explícito para identificar tool calls

2. **SSE Events e Race Conditions**
   - Eventos SSE podem chegar fora de ordem em execuções paralelas
   - HTTP/2 multiplexing permite múltiplos streams simultâneos
   - Solução: Identificação precisa via `call_id` ao invés de heurísticas

3. **Best Practices para Tool Calling**
   - Sempre usar IDs explícitos para tool calls paralelas
   - Aceitar múltiplos status na finalização (defensive programming)
   - Buscar em todas as mensagens quando necessário (handles wrong messageId)

## 🧪 Testes Recomendados

1. **Teste de tool calls paralelas**: Executar múltiplas tool calls simultaneamente e verificar que todas finalizam corretamente
2. **Teste de eventos fora de ordem**: Simular `tool_call_complete` chegando antes de `tool_call_execution`
3. **Teste sem `call_id`**: Verificar que fallback funciona (mas gera warning)

## 📝 Arquivos Modificados

- `src/lib/hooks/useChat.ts`
  - Função `handleToolCallComplete`: Lógica de busca e finalização melhorada
  - Import adicionado: `ToolCall` type para type safety
  - Documentação inline expandida com referências

## ⚠️ Notas Importantes

1. **Backend Contract**: O backend DEVE sempre enviar `call_id` em eventos `tool_call_complete`. Se não enviar, o frontend usa fallback mas pode falhar em cenários de parallel calls.

2. **Status Transitions**: A solução aceita tool calls com status `'starting'` ou `'running'` para completar, mas ainda valida contra duplicatas (`'completed'` ou `'error'`).

3. **Performance**: A busca em todas as mensagens só acontece quando necessário (messageId incorreto ou tool call não encontrado), minimizando impacto de performance.
