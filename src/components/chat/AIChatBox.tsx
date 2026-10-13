import { useState, useRef, useEffect, useMemo } from "react";
import { MessageCircle, X, Send, Plus, History, Trash2, Square } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { useAIChat } from "@/hooks/useAIChat";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const DEFAULT_QUESTIONS = [
  "Quais são meus projetos ativos?",
  "Qual o status financeiro geral?",
  "Quais leads estão pendentes?",
  "Quais tarefas estão atrasadas?",
  "Resumo das compras pendentes",
];

const PROJECT_QUESTIONS = [
  "Qual o progresso deste projeto?",
  "Quais atividades estão atrasadas?",
  "Resumo financeiro deste projeto",
  "Quais são as próximas etapas?",
  "Há pendências com fornecedores?",
];

const LEADS_QUESTIONS = [
  "Quais leads preciso acompanhar?",
  "Resumo das propostas enviadas",
  "Qual a taxa de conversão deste mês?",
  "Leads sem follow-up há mais de 7 dias",
];

function getContextFromRoute(pathname: string): {
  questions: string[];
  contextPayload: { route: string; project_id?: string; lead_id?: string };
} {
  const projectMatch = pathname.match(/^\/projects\/([a-f0-9-]+)/);
  if (projectMatch) {
    return {
      questions: PROJECT_QUESTIONS,
      contextPayload: { route: pathname, project_id: projectMatch[1] },
    };
  }

  if (pathname.startsWith("/leads")) {
    return {
      questions: LEADS_QUESTIONS,
      contextPayload: { route: pathname },
    };
  }

  return {
    questions: DEFAULT_QUESTIONS,
    contextPayload: { route: pathname },
  };
}

export function AIChatBox() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [contextLabel, setContextLabel] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const contextLoadedRef = useRef<string | null>(null);
  const location = useLocation();

  const { questions, contextPayload } = useMemo(
    () => getContextFromRoute(location.pathname),
    [location.pathname]
  );

  const {
    messages,
    isStreaming,
    conversations,
    currentConversationId,
    sendMessage,
    stopStreaming,
    loadConversation,
    startNewConversation,
    deleteConversation,
    loadProjectContext,
  } = useAIChat();

  // Auto-load project context when opening chat on a project page
  useEffect(() => {
    if (
      isOpen &&
      contextPayload.project_id &&
      !currentConversationId &&
      messages.length === 0 &&
      contextLoadedRef.current !== contextPayload.project_id
    ) {
      contextLoadedRef.current = contextPayload.project_id;
      loadProjectContext(contextPayload.project_id).then(() => {
        setContextLabel("Retomando conversa sobre este projeto — últimas 5 mensagens carregadas");
      });
    }
  }, [isOpen, contextPayload.project_id, currentConversationId, messages.length, loadProjectContext]);

  // Clear context label after first message sent
  useEffect(() => {
    if (contextLabel && messages.length > 0 && messages[messages.length - 1]?.role === "user") {
      setContextLabel(null);
    }
  }, [messages, contextLabel]);

  // Reset context loaded ref when navigating away
  useEffect(() => {
    if (!contextPayload.project_id) {
      contextLoadedRef.current = null;
    }
  }, [contextPayload.project_id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input, contextPayload);
    setInput("");
  };

  const handleQuestionClick = (q: string) => {
    sendMessage(q, contextPayload);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-accent text-accent-foreground shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center"
            aria-label="Abrir assistente IA"
          >
            <MessageCircle className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat box */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-h-[600px] flex flex-col rounded-2xl border border-border bg-background shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-sidebar">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center">
                  <MessageCircle className="h-4 w-4 text-accent-ink" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Assistente IA</h3>
                  <p className="text-[10px] text-white/70">Quadra Arquitetura</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="p-1.5 rounded-md hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors"
                  title="Histórico"
                >
                  <History className="h-4 w-4" />
                </button>
                <button
                  onClick={() => { startNewConversation(); setShowHistory(false); }}
                  className="p-1.5 rounded-md hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors"
                  title="Nova conversa"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-md hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* History panel */}
            <AnimatePresence>
              {showHistory && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-b border-border overflow-hidden"
                >
                  <div className="max-h-48 overflow-y-auto p-2 space-y-1">
                    {conversations.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-3">Nenhuma conversa salva</p>
                    )}
                    {conversations.map((conv) => (
                      <div
                        key={conv.id}
                        className={cn(
                          "flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs group transition-colors",
                          conv.id === currentConversationId
                            ? "bg-accent/10 text-accent-ink"
                            : "hover:bg-muted text-foreground"
                        )}
                      >
                        <span
                          className="truncate flex-1"
                          onClick={() => { loadConversation(conv.id); setShowHistory(false); }}
                        >
                          {conv.title}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-all"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px]">
              {contextLabel && messages.length > 0 && (
                <div className="text-center">
                  <span className="inline-block text-[10px] text-muted-foreground bg-muted/60 rounded-full px-3 py-1">
                    {contextLabel}
                  </span>
                </div>
              )}
              {messages.length === 0 && !contextLabel && (
                <div className="space-y-4">
                  <div className="text-center py-4">
                    <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                      <MessageCircle className="h-6 w-6 text-accent-ink" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Como posso ajudar?</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Pergunte sobre seus projetos, leads, financeiro e mais
                    </p>
                  </div>
                  <div className="space-y-2">
                    {questions.map((q) => (
                      <button
                        key={q}
                        onClick={() => handleQuestionClick(q)}
                        className="w-full text-left px-3 py-2.5 rounded-xl border border-border hover:border-accent/40 hover:bg-accent/5 text-xs text-foreground transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                      msg.role === "user"
                        ? "bg-accent text-accent-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    )}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-border p-3">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Pergunte algo..."
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent max-h-24"
                />
                {isStreaming ? (
                  <button
                    onClick={stopStreaming}
                    className="h-10 w-10 rounded-xl bg-destructive text-destructive-foreground flex items-center justify-center shrink-0"
                  >
                    <Square className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className="h-10 w-10 rounded-xl bg-accent text-accent-foreground flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
