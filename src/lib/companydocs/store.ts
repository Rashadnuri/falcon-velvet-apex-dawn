import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { askGrounded, getAiStatus } from "./ai.functions.ts";
import { EVAL_CASES } from "./cases.ts";
import { SAMPLE_DOCS } from "./documents.ts";
import { answerFromDocs, scrubCanaries, unsupportedNumbers } from "./engine.ts";
import { buildReport, evaluateExtractive, gradeCase, type CaseResult, type EvalReport } from "./evaluate.ts";
import type { Citation, CompanyDoc } from "./types.ts";

export type ViewId = "chat" | "docs" | "eval" | "arch";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: number;
  citations?: Citation[];
  mode?: "grok" | "extractive";
  abstained?: boolean;
  ambiguous?: boolean;
  latencyMs?: number;
  warning?: string;
  error?: string;
  pending?: boolean;
};

type HistoryItem = { role: "user" | "assistant"; content: string };

const memory = {
  getItem: (name: string) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      /* quota or private mode */
    }
  },
  removeItem: (name: string) => {
    try {
      localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};

function visible(hidden: string[], uploads: CompanyDoc[]): CompanyDoc[] {
  return [...SAMPLE_DOCS.filter((doc) => !hidden.includes(doc.id)), ...uploads];
}

function securityNote(language: "az" | "en"): string {
  return language === "az"
    ? "\n\nTəhlükəsizlik qeydi: indekslənmiş sənəddə modeli yönləndirməyə cəhd aşkarlandı və rədd edildi. Həmin mətn mənbə kimi istifadə olunmur."
    : "\n\nSecurity note: a document tried to override the assistant and was rejected. That text is not used as a source.";
}

type State = {
  view: ViewId;
  navOpen: boolean;
  hiddenSampleIds: string[];
  uploads: CompanyDoc[];
  messages: ChatMessage[];
  aiAvailable: boolean | null;
  docQuery: string;
  selectedDocId: string | null;
  evalReport: EvalReport | null;
  llmReport: EvalReport | null;
  llmProgress: string;
  busy: boolean;
  setView: (view: ViewId) => void;
  setNavOpen: (open: boolean) => void;
  setDocQuery: (query: string) => void;
  setSelectedDocId: (id: string | null) => void;
  visibleDocs: () => CompanyDoc[];
  refreshAi: () => Promise<void>;
  send: (question: string) => Promise<void>;
  clearChat: () => void;
  hideDoc: (id: string) => void;
  addUpload: (doc: CompanyDoc) => void;
  restoreSamples: () => void;
  runExtractiveEval: () => void;
  runLlmSample: () => Promise<void>;
};

export const useDocs = create<State>()(
  persist(
    (set, get) => ({
      view: "chat",
      navOpen: false,
      hiddenSampleIds: [],
      uploads: [],
      messages: [],
      aiAvailable: null,
      docQuery: "",
      selectedDocId: null,
      evalReport: null,
      llmReport: null,
      llmProgress: "",
      busy: false,
      setView: (view) => set({ view, navOpen: false }),
      setNavOpen: (navOpen) => set({ navOpen }),
      setDocQuery: (docQuery) => set({ docQuery }),
      setSelectedDocId: (selectedDocId) => set({ selectedDocId }),
      visibleDocs: () => visible(get().hiddenSampleIds, get().uploads),
      refreshAi: async () => {
        try {
          const status = await getAiStatus();
          set({ aiAvailable: status.available });
        } catch {
          set({ aiAvailable: false });
        }
      },
      clearChat: () => set({ messages: [] }),
      hideDoc: (id) => {
        if (id.startsWith("upload-")) {
          set({ uploads: get().uploads.filter((doc) => doc.id !== id), selectedDocId: null });
          return;
        }
        set({ hiddenSampleIds: [...new Set([...get().hiddenSampleIds, id])], selectedDocId: null });
      },
      addUpload: (doc) => {
        const uploads = [...get().uploads, doc].slice(-8);
        set({ uploads, selectedDocId: doc.id });
      },
      restoreSamples: () => set({ hiddenSampleIds: [] }),
      runExtractiveEval: () => {
        const report = evaluateExtractive(get().visibleDocs(), EVAL_CASES);
        set({ evalReport: report });
      },
      runLlmSample: async () => {
        if (!get().aiAvailable || get().busy) return;
        const sample = EVAL_CASES.filter((item) => item.llmSample);
        const docs = get().visibleDocs();
        const graded: CaseResult[] = [];
        set({ busy: true, llmProgress: `0/${sample.length}` });
        for (let index = 0; index < sample.length; index += 1) {
          const test = sample[index];
          if (!test) continue;
          set({ llmProgress: `${index + 1}/${sample.length}` });
          const grounded = answerFromDocs(docs, test.question);
          let result = grounded;
          if (grounded.passages.length && !grounded.ambiguous) {
            const started = performance.now();
            try {
              const response = await askGrounded({
                data: {
                  question: test.question,
                  language: grounded.language,
                  passages: grounded.passages,
                  history: [],
                },
              });
              if (response.ok) {
                const scrubbed = scrubCanaries(response.answer);
                const allowed = new Set(response.usedPassageIndexes);
                const citations = allowed.size
                  ? grounded.citations.filter((citation) =>
                      grounded.passages.some((passage) => passage.chunkId === citation.chunkId && allowed.has(passage.index)),
                    )
                  : grounded.citations;
                result = {
                  ...grounded,
                  answer: scrubbed.text + (grounded.blocked.length ? securityNote(grounded.language) : ""),
                  abstained: response.abstained,
                  citations: citations.length ? citations : grounded.citations,
                  retrievalMs: Math.round(performance.now() - started),
                };
              }
            } catch {
              result = grounded;
            }
          }
          graded.push(gradeCase(test, result));
        }
        set({ busy: false, llmProgress: "", llmReport: buildReport(graded, "grok-sample") });
      },
      send: async (question) => {
        const q = question.trim();
        if (!q || get().busy) return;
        const docs = get().visibleDocs();
        const grounded = answerFromDocs(docs, q);
        const history: HistoryItem[] = get()
          .messages.filter((message) => !message.pending)
          .slice(-6)
          .map((message) => ({ role: message.role, content: message.text.slice(0, 700) }));
        const userMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "user",
          text: q,
          createdAt: Date.now(),
        };
        const pendingId = crypto.randomUUID();
        set({
          busy: true,
          messages: [
            ...get().messages,
            userMessage,
            { id: pendingId, role: "assistant", text: "", createdAt: Date.now(), pending: true },
          ],
        });
        const started = performance.now();
        let text = grounded.answer;
        let mode: "grok" | "extractive" = "extractive";
        let abstained = grounded.abstained;
        let citations = grounded.citations;
        let error: string | undefined;
        let warning: string | undefined;
        const canCall = Boolean(get().aiAvailable) && grounded.passages.length > 0 && !grounded.ambiguous;
        if (canCall) {
          try {
            const response = await askGrounded({
              data: { question: q, language: grounded.language, passages: grounded.passages, history },
            });
            if (response.ok) {
              mode = "grok";
              const scrubbed = scrubCanaries(response.answer);
              text = scrubbed.text;
              if (grounded.blocked.length) text += securityNote(grounded.language);
              abstained = response.abstained || grounded.abstained;
              const allowed = new Set(response.usedPassageIndexes);
              const filtered = grounded.citations.filter((citation) =>
                grounded.passages.some((passage) => passage.chunkId === citation.chunkId && allowed.has(passage.index)),
              );
              if (filtered.length) citations = filtered;
              if (scrubbed.removed) {
                warning = "Zərərli qaralamadan gələn əmr və ya rəqəm cavabdan çıxarıldı.";
              }
              const stray = unsupportedNumbers(text, citations, q);
              if (stray.length) {
                warning = `${warning ? `${warning} ` : ""}Cavabda mənbədə görünməyən rəqəm var: ${stray.join(", ")}.`;
              }
            } else if (response.error !== "unavailable" && response.error !== "no-context") {
              error = "Model çağırışı alınmadı. Çıxarış rejimi göstərilir.";
            }
          } catch {
            error = "Model çağırışı alınmadı. Çıxarış rejimi göstərilir.";
          }
        }
        const finalMessage: ChatMessage = {
          id: pendingId,
          role: "assistant",
          text,
          createdAt: Date.now(),
          citations,
          mode,
          abstained,
          ambiguous: grounded.ambiguous,
          latencyMs: Math.round(performance.now() - started),
          warning,
          error,
        };
        set({
          busy: false,
          messages: get().messages.map((message) => (message.id === pendingId ? finalMessage : message)),
        });
      },
    }),
    {
      name: "companydocs-ai",
      skipHydration: true,
      storage: createJSONStorage(() => memory),
      partialize: (state) => ({
        view: state.view,
        hiddenSampleIds: state.hiddenSampleIds,
        uploads: state.uploads,
        messages: state.messages.filter((message) => !message.pending).slice(-40),
        docQuery: state.docQuery,
        evalReport: state.evalReport,
        llmReport: state.llmReport,
      }),
    },
  ),
);

export function useVisibleDocs(): CompanyDoc[] {
  const hidden = useDocs((state) => state.hiddenSampleIds);
  const uploads = useDocs((state) => state.uploads);
  return visible(hidden, uploads);
}
