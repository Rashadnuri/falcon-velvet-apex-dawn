export type DocCategory = "HR" | "IT" | "Maliyyə" | "Ümumi" | "Yüklənmiş";

export type PageOrigin = "original" | "pdf" | "split";

export type CompanyDoc = {
  id: string;
  code: string;
  title: string;
  filename: string;
  category: DocCategory;
  updated: string;
  summary: string;
  trusted: boolean;
  source: "sample" | "upload";
  pageOrigin: PageOrigin;
  pages: { page: number; text: string }[];
};

export type Hit = {
  chunkId: string;
  docId: string;
  code: string;
  title: string;
  filename: string;
  page: number;
  text: string;
  score: number;
  coverage: number;
  injected: boolean;
};

export type Citation = {
  chunkId: string;
  docId: string;
  code: string;
  title: string;
  filename: string;
  page: number;
  quote: string;
};

export type EvidencePassage = {
  index: number;
  chunkId: string;
  docId: string;
  title: string;
  filename: string;
  page: number;
  text: string;
};

export type GroundedResult = {
  language: "az" | "en";
  answer: string;
  abstained: boolean;
  ambiguous: boolean;
  citations: Citation[];
  hits: Hit[];
  passages: EvidencePassage[];
  blocked: { docId: string; code: string; title: string }[];
  unresolved: string[];
  canaryRemoved: boolean;
  method: "bm25+glossary";
  embeddings: false;
  retrievalMs: number;
};

export type EvalCategory =
  | "answerable"
  | "multi"
  | "missing"
  | "ambiguous"
  | "numeric"
  | "misleading"
  | "injection";

export type RetrievalExpect = "contain" | "empty" | "broad";

export type EvalCase = {
  id: string;
  category: EvalCategory;
  question: string;
  expectAbstain: boolean;
  expectedDocIds: string[];
  retrieval: RetrievalExpect;
  mustInclude: string[];
  mustNotInclude: string[];
  note: string;
  llmSample?: boolean;
};
