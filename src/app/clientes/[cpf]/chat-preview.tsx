import { Send } from "lucide-react";
import { InsightBubble } from "@/components/insight-bubble";

const EXAMPLE_QUESTION = "Esse cliente tem cobertura de vidro no seguro atual?";
const EXAMPLE_ANSWER =
  "Sim, a apólice de auto atual inclui cobertura de vidros. Essa resposta viria dos dados já carregados nesta tela — portfólio, sobreposição e comparação — não de uma busca solta.";

/**
 * Static, non-functional preview - reserves the chat's place in the layout
 * and its visual language (InsightBubble for the AI side) before there is an
 * AI provider to answer anything for real (docs/ARCHITECTURE.md Seção 8).
 * Nothing here is wired up on purpose: no state, no submit handler.
 */
export function ChatPreview() {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md border border-border bg-background px-3.5 py-2.5 text-sm text-foreground">
          {EXAMPLE_QUESTION}
        </div>
      </div>

      <div className="flex justify-start">
        <div className="max-w-[85%]">
          <InsightBubble>{EXAMPLE_ANSWER}</InsightBubble>
        </div>
      </div>

      <div className="mt-1 flex items-center gap-2">
        <input
          disabled
          placeholder="Disponível em breve"
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground placeholder:text-muted-foreground"
        />
        <button
          type="button"
          disabled
          aria-label="Enviar"
          className="flex shrink-0 items-center justify-center rounded-lg bg-accent px-3 py-2 text-accent-foreground opacity-40"
        >
          <Send className="h-4 w-4" strokeWidth={2.25} />
        </button>
      </div>
    </div>
  );
}
