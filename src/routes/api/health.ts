import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () =>
        Response.json({
          ok: true,
          service: "companydocs-ai",
          retrieval: "bm25+glossary",
          embeddings: false,
          modelConfigured: Boolean(process.env.XAI_API_KEY),
        }),
    },
  },
});
