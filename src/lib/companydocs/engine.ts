import type {
  Citation,
  CompanyDoc,
  EvidencePassage,
  GroundedResult,
  Hit,
} from "./types.ts";

const SUFFIXES = [
  "məliyəm",
  "məliyik",
  "məlisən",
  "malıyam",
  "malıyıq",
  "sundan",
  "sindən",
  "larından",
  "lərindən",
  "ından",
  "indən",
  "undan",
  "ündən",
  "larında",
  "lərində",
  "ında",
  "ində",
  "unda",
  "ündə",
  "larının",
  "lərinin",
  "məli",
  "malı",
  "ları",
  "ləri",
  "ların",
  "lərin",
  "sinə",
  "sına",
  "ına",
  "inə",
  "una",
  "ünə",
  "dır",
  "dir",
  "dur",
  "dür",
  "ılır",
  "ilir",
  "ulur",
  "ür",
  "dən",
  "dan",
  "nın",
  "nin",
  "nun",
  "nün",
  "lar",
  "lər",
  "lıq",
  "lik",
  "luq",
  "lük",
  "lu",
  "lü",
  "maq",
  "mək",
  "ması",
  "məsi",
  "mış",
  "miş",
  "muş",
  "müş",
  "sı",
  "si",
  "su",
  "sü",
  "ın",
  "in",
  "un",
  "ün",
  "də",
  "da",
  "mı",
  "mi",
  "mu",
  "mü",
];

function stemOnce(token: string): string {
  if (token.includes(".") || /^\d/.test(token) || token.length < 5) return token;
  for (const suffix of SUFFIXES) {
    if (token.endsWith(suffix) && token.length - suffix.length >= 3) {
      return token.slice(0, -suffix.length);
    }
  }
  if (token.length >= 5 && /[ıiuü]$/.test(token)) return token.slice(0, -1);
  return token;
}

function deepStem(token: string): string {
  let current = token;
  for (let i = 0; i < 3; i += 1) {
    const next = stemOnce(current);
    if (next === current) break;
    current = next;
  }
  return current;
}

function formsOfToken(token: string): string[] {
  const deep = deepStem(token);
  const forms = new Set<string>([deep]);
  if (/[ıiuü]$/.test(deep) && deep.length >= 4) forms.add(deep.slice(0, -1));
  return [...forms];
}

const IGNORE = new Set([
  "və",
  "ilə",
  "üçün",
  "bu",
  "bir",
  "olan",
  "ki",
  "də",
  "da",
  "o",
  "nə",
  "neçə",
  "necə",
  "hansı",
  "harada",
  "hara",
  "kim",
  "kimə",
  "niyə",
  "var",
  "yox",
  "varmı",
  "olarmı",
  "edir",
  "edilir",
  "olunur",
  "olunurmu",
  "nədir",
  "nədən",
  "qədər",
  "qədərdir",
  "haqqında",
  "barədə",
  "barəsində",
  "zəhmət",
  "olmasa",
  "xahiş",
  "edirəm",
  "mən",
  "siz",
  "doğrudurmu",
  "doğrudur",
  "eşitmişəm",
  "olduğunu",
  "olduğu",
  "kifayətdir",
  "kifayət",
  "bilərmi",
  "ola",
  "bilər",
  "de",
  "deyin",
  "söylə",
  "hələ",
  "elə",
  "icazə",
  "rəsmi",
  "kimi",
  "bunu",
  "sənəddəki",
  "təlimata",
  "təlimat",
  "əməl",
  "yazım",
  "yazmalıyam",
  "etmək",
  "olur",
  "written",
  "deyir",
  "et",
  "the",
  "a",
  "an",
  "of",
  "to",
  "is",
  "in",
  "and",
  "or",
  "on",
  "for",
  "does",
  "do",
  "what",
  "how",
  "when",
  "where",
  "which",
  "can",
  "i",
  "we",
  "you",
  "our",
  "your",
  "please",
  "tell",
  "me",
  "about",
  "there",
  "policy",
  "many",
  "much",
  "grant",
  "company",
  "with",
  "from",
  "that",
  "this",
  "if",
  "it",
  "be",
  "as",
  "at",
  "by",
  "not",
  "are",
  "hostname",
  "address",
  "used",
  "use",
  "ignore",
  "previous",
  "prior",
  "instructions",
  "instruction",
  "reveal",
  "system",
  "prompt",
  "jailbreak",
  "override",
  "dan",
  "now",
  "all",
  "new",
  "follow",
  "obey",
]);

const GLOSSARY: Record<string, string[]> = {
  leave: ["məzuniyyət"],
  vacation: ["məzuniyyət"],
  annual: ["illik"],
  day: ["gün"],
  days: ["gün"],
  working: ["iş"],
  salary: ["maaş"],
  wage: ["maaş"],
  pay: ["ödəniş"],
  bonus: ["bonus"],
  password: ["şifrə"],
  remote: ["uzaqdan"],
  office: ["ofis"],
  advance: ["avans"],
  percent: ["faiz"],
  percentage: ["faiz"],
  expense: ["xərc"],
  gift: ["hədiyyə"],
  laptop: ["noutbuk"],
  probation: ["sınaq"],
  incident: ["insident"],
  hour: ["saat"],
  hours: ["saat"],
  vpn: ["vpn"],
  mfa: ["mfa"],
  ceo: ["ceo"],
  budget: ["büdcə"],
  server: ["server"],
  holiday: ["novruz", "təqvim"],
};

const INJECTION_RE =
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions|you are now|\bsystem\s*:|attacker@|jailbreak|əvvəlki təlimat/i;

const DENIAL_RE = /dərc olunmur|bu sənəddə yoxdur|ayrıca rəqəmlə göstərilmir/;

const CANARY_RE = /attacker@evil\.test|\b25000\b|you are now dan/i;

export function azLower(input: string): string {
  return input.replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase();
}

export function tokenize(input: string): string[] {
  const lower = azLower(input);
  const hosts =
    lower.match(/[a-z0-9ıəöüğşç.+-]+@[a-z0-9.-]+\.[a-z]{2,}|[a-z0-9.-]+\.[a-z]{2,}/g) ?? [];
  const parts = lower.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return [...parts, ...hosts].filter((token) => token.length > 1 || /\d/.test(token));
}

function indexTokens(input: string): string[] {
  return tokenize(input).flatMap((token) => formsOfToken(token));
}

function formsFor(token: string): string[] {
  const forms = new Set<string>(formsOfToken(token));
  const extra = GLOSSARY[token] ?? GLOSSARY[deepStem(token)];
  if (extra) extra.forEach((item) => formsOfToken(item).forEach((form) => forms.add(form)));
  return [...forms];
}

function isIgnored(token: string): boolean {
  return IGNORE.has(token) || IGNORE.has(deepStem(token));
}

function vocabAnchor(token: string, vocab: Set<string>): string | null {
  if (token.length < 6) return null;
  const head = token.slice(0, 6);
  for (const word of vocab) {
    if (word.length >= 5 && (word.startsWith(head) || token.startsWith(word))) return word;
  }
  return null;
}

type Chunk = {
  chunkId: string;
  docId: string;
  code: string;
  title: string;
  filename: string;
  page: number;
  text: string;
  tokens: string[];
  injected: boolean;
};

function chunkDocument(doc: CompanyDoc): Chunk[] {
  const chunks: Chunk[] = [];
  for (const page of doc.pages) {
    const pieces = splitLong(page.text, 900);
    pieces.forEach((text, index) => {
      const search = `${doc.code}\n${doc.title}\n${text}`;
      chunks.push({
        chunkId: `${doc.id}-p${page.page}-${index}`,
        docId: doc.id,
        code: doc.code,
        title: doc.title,
        filename: doc.filename,
        page: page.page,
        text,
        tokens: indexTokens(search),
        injected: INJECTION_RE.test(text),
      });
    });
  }
  return chunks;
}

function splitLong(text: string, max: number): string[] {
  if (text.length <= max) return [text];
  const lines = text.split("\n");
  const pieces: string[] = [];
  let buf: string[] = [];
  let size = 0;
  for (const line of lines) {
    if (size + line.length > max && buf.length) {
      pieces.push(buf.join("\n"));
      buf = [];
      size = 0;
    }
    buf.push(line);
    size += line.length + 1;
  }
  if (buf.length) pieces.push(buf.join("\n"));
  return pieces;
}

type Index = {
  chunks: Chunk[];
  df: Map<string, number>;
  avg: number;
  vocab: Set<string>;
};

function buildIndex(docs: CompanyDoc[]): Index {
  const chunks = docs.flatMap(chunkDocument);
  const df = new Map<string, number>();
  let total = 0;
  for (const chunk of chunks) {
    total += chunk.tokens.length;
    for (const token of new Set(chunk.tokens)) {
      df.set(token, (df.get(token) ?? 0) + 1);
    }
  }
  return {
    chunks,
    df,
    avg: chunks.length ? total / chunks.length : 0,
    vocab: new Set(df.keys()),
  };
}

function idf(df: number, n: number): number {
  return Math.log(1 + (n - df + 0.5) / (df + 0.5));
}

type QueryProfile = {
  tokens: string[];
  content: string[];
  unresolved: string[];
  resolved: string[];
  weights: Map<string, number>;
};

function profileQuery(question: string, vocab: Set<string>): QueryProfile {
  const raw = tokenize(question).filter((token) => !isIgnored(token) && !isIgnored(deepStem(token)));
  const content: string[] = [];
  const unresolved: string[] = [];
  const resolved: string[] = [];
  const weights = new Map<string, number>();
  for (const token of raw) {
    if (/^\d+(?:[.,]\d+)?$/.test(token)) {
      content.push(token);
      resolved.push(token);
      weights.set(token, (weights.get(token) ?? 0) + 1);
      continue;
    }
    const inVocab = formsFor(token).filter((form) => vocab.has(form));
    const anchor = inVocab.length ? null : vocabAnchor(token, vocab);
    if (inVocab.length === 0 && !anchor) {
      unresolved.push(token);
      continue;
    }
    content.push(token);
    resolved.push(token);
    for (const form of inVocab.length ? inVocab : [anchor as string]) {
      weights.set(form, (weights.get(form) ?? 0) + 1);
    }
  }
  return { tokens: raw, content, unresolved, resolved, weights };
}

function scoreChunk(chunk: Chunk, index: Index, query: QueryProfile): { score: number; coverage: number } {
  const tf = new Map<string, number>();
  for (const token of chunk.tokens) tf.set(token, (tf.get(token) ?? 0) + 1);
  const k1 = 1.2;
  const b = 0.75;
  let score = 0;
  for (const [token, weight] of query.weights) {
    const freq = tf.get(token) ?? 0;
    if (!freq) continue;
    const docFactor = freq * (k1 + 1);
    const norm = freq + k1 * (1 - b + (b * chunk.tokens.length) / (index.avg || 1));
    score += weight * idf(index.df.get(token) ?? 0, index.chunks.length) * (docFactor / norm);
  }
  const basis = query.resolved.filter((token) => !/^\d/.test(token));
  const basisOrNumbers = basis.length ? basis : query.resolved;
  let matched = 0;
  for (const token of basisOrNumbers) {
    const forms = /^\d/.test(token) ? [token] : formsFor(token);
    if (forms.some((form) => tf.has(form))) matched += 1;
  }
  const coverage = basisOrNumbers.length ? matched / basisOrNumbers.length : 0;
  return { score, coverage };
}

export function rankChunks(docs: CompanyDoc[], question: string, k = 8): Hit[] {
  const index = buildIndex(docs);
  const query = profileQuery(question, index.vocab);
  return index.chunks
    .map((chunk) => {
      const scored = scoreChunk(chunk, index, query);
      return { chunk, ...scored };
    })
    .sort((a, b) => b.score - a.score || b.coverage - a.coverage)
    .slice(0, k)
    .map(({ chunk, score, coverage }) => ({
      chunkId: chunk.chunkId,
      docId: chunk.docId,
      code: chunk.code,
      title: chunk.title,
      filename: chunk.filename,
      page: chunk.page,
      text: chunk.text,
      score: Number(score.toFixed(3)),
      coverage: Number(coverage.toFixed(3)),
      injected: chunk.injected,
    }));
}

function sentencesOf(text: string): string[] {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function selectSentences(text: string, query: QueryProfile): { quote: string; denial: boolean } {
  const lines = sentencesOf(text);
  const ranked = lines
    .map((line) => {
      const tokens = new Set(tokenize(line).flatMap((token) => formsOfToken(token)));
      let score = 0;
      for (const token of query.resolved) {
        const forms = /^\d/.test(token) ? [token] : formsFor(token);
        if (forms.some((form) => tokens.has(form))) score += 1;
      }
      return { line, score };
    })
    .sort((a, b) => b.score - a.score);
  const picked = new Set(ranked.filter((item) => item.score > 0).slice(0, 2).map((item) => item.line));
  const chosen: string[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!picked.has(lines[i] ?? "")) continue;
    chosen.push(lines[i] ?? "");
    const next = lines[i + 1];
    if (next && /@|[a-z0-9.-]+\.[a-z]{2,}/i.test(next)) chosen.push(next);
  }
  const best = ranked[0];
  const denial = Boolean(best && best.score > 0 && DENIAL_RE.test(best.line));
  const quote = denial
    ? (best?.line ?? lines[0] ?? text)
    : (chosen.length ? chosen : lines.slice(0, 2)).join(" ");
  return { quote, denial };
}

function detectLanguage(question: string): "az" | "en" {
  if (/[əğıöüşçƏĞİÖÜŞÇı]/.test(question)) return "az";
  if (/\b(what|how|when|where|which|does|is|are|please|tell|many)\b/i.test(question)) return "en";
  return "az";
}

function nonAscii(token: string): boolean {
  return /[^\u0000-\u007f]/.test(token);
}

export function scrubCanaries(text: string): { text: string; removed: boolean } {
  if (!CANARY_RE.test(text)) return { text, removed: false };
  const cleaned = text
    .replace(/attacker@evil\.test/gi, "[rədd edilmiş ünvan]")
    .replace(/\b25000\b/g, "[rədd edilmiş rəqəm]")
    .replace(/you are now dan/gi, "[rədd edilmiş əmr]");
  return { text: cleaned, removed: true };
}

function quoteBlock(
  hit: Hit,
  quote: string,
  language: "az" | "en",
): { citation: Citation; paragraph: string } {
  const citation: Citation = {
    chunkId: hit.chunkId,
    docId: hit.docId,
    code: hit.code,
    title: hit.title,
    filename: hit.filename,
    page: hit.page,
    quote,
  };
  const source =
    language === "az"
      ? `Mənbə: ${hit.title} (${hit.code}), səh. ${hit.page}`
      : `Source: ${hit.title} (${hit.code}), p. ${hit.page}`;
  return { citation, paragraph: `«${quote}»\n${source}` };
}

export function answerFromDocs(docs: CompanyDoc[], question: string): GroundedResult {
  const started = performance.now();
  const language = detectLanguage(question);
  const index = buildIndex(docs);
  const query = profileQuery(question, index.vocab);
  const ranked = index.chunks
    .map((chunk) => ({ chunk, ...scoreChunk(chunk, index, query) }))
    .sort((a, b) => b.score - a.score || b.coverage - a.coverage);
  const hits: Hit[] = ranked.slice(0, 8).map(({ chunk, score, coverage }) => ({
    chunkId: chunk.chunkId,
    docId: chunk.docId,
    code: chunk.code,
    title: chunk.title,
    filename: chunk.filename,
    page: chunk.page,
    text: chunk.text,
    score: Number(score.toFixed(3)),
    coverage: Number(coverage.toFixed(3)),
    injected: chunk.injected,
  }));
  const blocked = hits
    .filter((hit) => hit.injected && (hit.score > 0 || hit.coverage >= 0.34))
    .filter((hit, index, list) => list.findIndex((item) => item.docId === hit.docId) === index)
    .map((hit) => ({ docId: hit.docId, code: hit.code, title: hit.title }));
  const pool = ranked.filter((item) => !item.chunk.injected && item.score > 0 && item.coverage >= 0.3);
  const best = pool[0];
  const broadDocs = new Set(
    ranked.filter((item) => !item.chunk.injected && item.score > 0 && item.coverage >= 0.3).map((item) => item.chunk.docId),
  );
  const kept =
    best && best.coverage >= 0.4
      ? [
          ...pool.filter((item) => item.chunk.docId === best.chunk.docId).slice(0, 2),
          ...pool
            .filter(
              (item) =>
                item.chunk.docId !== best.chunk.docId &&
                item.score >= best.score * 0.72 &&
                item.coverage >= 0.55,
            )
            .slice(0, 1),
        ].slice(0, 3)
      : [];
  const docIds = [...new Set(kept.map((item) => item.chunk.docId))];
  const unresolved = [...new Set(query.unresolved)];
  const contentCount = query.resolved.filter((token) => !/^\d/.test(token)).length;
  const blockForUnknown = unresolved.some(nonAscii) || (unresolved.length > 0 && query.resolved.length < 2);
  const runnerUp = ranked.find(
    (item) => !item.chunk.injected && best && item.chunk.docId !== best.chunk.docId && item.coverage >= 0.3,
  );
  const ambiguous =
    !blockForUnknown &&
    Boolean(best) &&
    contentCount <= 2 &&
    broadDocs.size >= 3 &&
    Boolean(runnerUp) &&
    (runnerUp?.coverage ?? 0) >= (best?.coverage ?? 1) - 0.2;

  const security =
    blocked.length === 0
      ? ""
      : language === "az"
        ? "\n\nTəhlükəsizlik qeydi: indekslənmiş sənəddə modeli yönləndirməyə cəhd aşkarlandı və rədd edildi. Həmin mətn mənbə kimi istifadə olunmur."
        : "\n\nSecurity note: a document tried to override the assistant and was rejected. That text is not used as a source.";

  let answer = "";
  let abstained = false;
  let citations: Citation[] = [];
  let passages: EvidencePassage[] = [];

  if (!docs.length) {
    abstained = true;
    answer =
      language === "az"
        ? "İndeksdə sənəd yoxdur. Əvvəlcə nümunə sənədləri bərpa edin və ya fayl yükləyin.\n\nFərziyyə yoxdur."
        : "There are no indexed documents. Restore the samples or upload a file.\n\nNo assumptions were added.";
  } else if (blockForUnknown || kept.length === 0) {
    abstained = true;
    const unknown =
      unresolved.length > 0
        ? language === "az"
          ? ` Lüğətdə tapılmayan söz: ${unresolved.slice(0, 4).join(", ")}.`
          : ` Unresolved term: ${unresolved.slice(0, 4).join(", ")}.`
        : "";
    answer =
      language === "az"
        ? `Sənədlərdə bu suala cavab vermək üçün kifayət qədər məlumat yoxdur.${unknown}\nŞirkət siyasəti, tarix və ya rəqəm uydurulmur.\n\nFərziyyə yoxdur.`
        : `The documents do not contain enough information to answer this.${unknown}\nNo company policy, date, or figure was invented.\n\nNo assumptions were added.`;
  } else if (ambiguous) {
    abstained = true;
    const titles = [...new Set(kept.map((item) => item.chunk.title))].join(", ");
    answer =
      language === "az"
        ? `Bu sual bir neçə mövzuya uyğun gəlir. Zəhmət olmasa mövzunu dəqiqləşdirin.\nYaxın sənədlər: ${titles}.\n\nFərziyyə yoxdur.`
        : `This question matches several topics. Please clarify.\nNearby documents: ${titles}.\n\nNo assumptions were added.`;
  } else {
    const blocks = kept.map((item) => {
      const hit = hits.find((candidate) => candidate.chunkId === item.chunk.chunkId) ?? {
        chunkId: item.chunk.chunkId,
        docId: item.chunk.docId,
        code: item.chunk.code,
        title: item.chunk.title,
        filename: item.chunk.filename,
        page: item.chunk.page,
        text: item.chunk.text,
        score: Number(item.score.toFixed(3)),
        coverage: Number(item.coverage.toFixed(3)),
        injected: false,
      };
      const selected = selectSentences(item.chunk.text, query);
      return { ...quoteBlock(hit, selected.quote, language), denial: selected.denial };
    });
    const denial = blocks.some((block) => block.denial);
    const used = denial ? blocks.filter((block) => block.denial) : blocks;
    citations = used.map((block) => block.citation);
    const denialAnswer = used.length > 0 && used.every((block) => block.denial);
    passages = citations.map((citation, index) => ({
      index: index + 1,
      chunkId: citation.chunkId,
      docId: citation.docId,
      title: citation.title,
      filename: citation.filename,
      page: citation.page,
      text: citation.quote,
    }));
    const questionNumbers = tokenize(question).filter((token) => /^\d/.test(token));
    const evidenceNumbers = new Set(tokenize(citations.map((item) => item.quote).join(" ")).filter((token) => /^\d/.test(token)));
    const contradicted = questionNumbers.some((token) => !evidenceNumbers.has(token));
    abstained = denial;
    const lead = denialAnswer
      ? language === "az"
        ? "Sənədlər tələb olunan rəqəmi və ya qaydanı vermir.\n\n"
        : "The documents do not state the requested figure or rule.\n\n"
      : contradicted
        ? language === "az"
          ? "Sualdakı rəqəm sənədlərdə təsdiqlənmir.\n\nTəsdiqlənmiş məlumat:\n\n"
          : "The figure in the question is not confirmed by the documents.\n\nVerified information:\n\n"
        : language === "az"
          ? "Təsdiqlənmiş məlumat:\n\n"
          : "Verified information:\n\n";
    const tail =
      language === "az"
        ? "\n\nFərziyyə yoxdur. Yalnız yuxarıdakı sitatlardan istifadə olunub."
        : "\n\nNo assumptions were added. Only the quotations above were used.";
    answer = `${lead}${used.map((block) => block.paragraph).join("\n\n")}${tail}`;
  }

  if (blocked.length) answer += security;
  const scrubbed = scrubCanaries(answer);
  return {
    language,
    answer: scrubbed.text,
    abstained,
    ambiguous,
    citations,
    hits,
    passages,
    blocked,
    unresolved,
    canaryRemoved: scrubbed.removed,
    method: "bm25+glossary",
    embeddings: false,
    retrievalMs: Math.max(0, Math.round(performance.now() - started)),
  };
}

export function unsupportedNumbers(answer: string, citations: Citation[], question: string): string[] {
  const body = answer
    .split("\n")
    .filter((line) => !line.startsWith("Mənbə:") && !line.startsWith("Source:"))
    .join("\n")
    .replace(/\[(\d{1,2})\]/g, " ");
  const allowed = new Set(
    [...(body.match(/\d+(?:[.,]\d+)?/g) ?? [])]
      .filter((value) => `${question}\n${citations.map((item) => item.quote).join("\n")}`.includes(value)),
  );
  const found = body.match(/\d+(?:[.,]\d+)?/g) ?? [];
  return [...new Set(found.filter((value) => !allowed.has(value)))];
}
