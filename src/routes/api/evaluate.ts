import { EVAL_CASES } from "@/lib/companydocs/cases";
import { SAMPLE_DOCS } from "@/lib/companydocs/documents";
import { evaluateExtractive } from "@/lib/companydocs/evaluate";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/evaluate")({
  server: {
    handlers: {
      POST: async () => {
        const report = evaluateExtractive(SAMPLE_DOCS, EVAL_CASES);
        return Response.json(report);
      },
    },
  },
});
