import { askGrounded } from "@/lib/companydocs/ai.functions";
import { SAMPLE_DOCS } from "@/lib/companydocs/documents";
import { answerFromDocs } from "@/lib/companydocs/engine";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as { question?: unknown; useModel?: unknown } | null;
        const question = typeof body?.question === "string" ? body.question.trim().slice(0, 2000) : "";
        if (!question) return Response.json({ error: "question tələb olunur" }, { status: 400 });
        const grounded = answerFromDocs(SAMPLE_DOCS, question);
        if (body?.useModel === true && grounded.passages.length && !grounded.ambiguous) {
          const model = await askGrounded({
            data: {
              question,
              language: grounded.language,
              passages: grounded.passages,
              history: [],
            },
          });
          if (model.ok) {
            const allowed = new Set(model.usedPassageIndexes);
            const citations = allowed.size
              ? grounded.citations.filter((citation) =>
                  grounded.passages.some(
                    (passage) => passage.chunkId === citation.chunkId && allowed.has(passage.index),
                  ),
                )
              : grounded.citations;
            return Response.json({
              mode: "grok",
              retrieval: grounded.method,
              embeddings: false,
              corpus: "sample-only",
              abstained: model.abstained,
              answer: model.answer,
              citations,
            });
          }
        }
        return Response.json({
          mode: "extractive",
          retrieval: grounded.method,
          embeddings: false,
          corpus: "sample-only",
          abstained: grounded.abstained,
          answer: grounded.answer,
          citations: grounded.citations,
          note: "Yüklənmiş sənədlər brauzerdə qalır. Bu endpoint yalnız nümunə korpusunu görür.",
        });
      },
    },
  },
});
