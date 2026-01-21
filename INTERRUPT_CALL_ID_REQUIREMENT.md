# Requisito: `call_id` em Eventos de Interrupt

## 📋 Resumo

Para garantir que múltiplos interrupts paralelos funcionem corretamente, **o backend DEVE incluir o campo `call_id` em todos os eventos de interrupt**.

## ✅ Eventos que Requerem `call_id`

### 1. `clarification_needed`
```json
{
  "event": "clarification_needed",
  "data": {
    "type": "clarification_questions",
    "context": "...",
    "questions": [...],
    "call_id": "call_06630522"  // ← REQUIRED
  }
}
```

### 2. `plan_awaiting_approval`
```json
{
  "event": "plan_awaiting_approval",
  "data": {
    "plan_id": "...",
    "markdown": "...",
    "version": 1,
    "thread_id": "...",
    "message": "...",
    "call_id": "call_33370639"  // ← REQUIRED
  }
}
```

## 🔍 Por que isso é necessário?

Quando múltiplas tool calls executam em paralelo e geram interrupts simultaneamente:

1. **Sem `call_id`**: O frontend não consegue identificar qual tool call específico gerou cada interrupt
2. **Com `call_id`**: O frontend pode mapear corretamente cada interrupt ao seu tool call correspondente

### Exemplo do Problema

```
tool_call_start: ask_clarifying_questions, call_id: "call_001"
tool_call_start: ask_clarifying_questions, call_id: "call_002"
clarification_needed: (sem call_id) ← Qual tool call? call_001 ou call_002?
clarification_needed: (sem call_id) ← Qual tool call? call_001 ou call_002?
```

### Solução

```
tool_call_start: ask_clarifying_questions, call_id: "call_001"
tool_call_start: ask_clarifying_questions, call_id: "call_002"
clarification_needed: call_id: "call_001" ← Completa call_001 ✅
clarification_needed: call_id: "call_002" ← Completa call_002 ✅
```

## 📝 Implementação no Backend

O `call_id` deve ser o **mesmo** enviado no evento `tool_call_start` correspondente:

```python
# Exemplo Python/LangGraph
def ask_clarifying_questions(context: str, questions: List[Question], call_id: str):
    # ... lógica da tool ...
    
    # Quando gerar o interrupt, inclua o call_id
    interrupt({
        "type": "clarification_questions",
        "context": context,
        "questions": questions,
        "call_id": call_id  # ← Mesmo call_id do tool_call_start
    })
```

## 🎯 Benefícios

1. **Código mais limpo**: Removemos ~30 linhas de código de rastreamento
2. **Mais confiável**: Identificação direta via `call_id` ao invés de heurísticas
3. **Melhor performance**: Sem necessidade de manter Map de rastreamento
4. **Mais fácil de debugar**: Cada interrupt tem seu `call_id` explícito

## ⚠️ Fallback (Temporário)

Se o `call_id` não estiver presente, o frontend ainda funciona usando `tool_name` como fallback, mas:
- ❌ Pode completar o tool call errado em casos de múltiplos interrupts paralelos
- ⚠️ Gera warnings no console
- ✅ Funciona corretamente quando há apenas um interrupt por vez

## 📚 Referências

- [LangGraph Interrupts Documentation](https://docs.langchain.com/langgraph/interrupts)
- [LangGraph Issue #6626 - Identical IDs in Parallel Interrupts](https://github.com/langchain-ai/langgraph/issues/6626)
