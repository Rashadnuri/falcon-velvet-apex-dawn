import type { CompanyDoc } from "./types.ts";

function normalize(text: string): string {
  const clean = text.replace(/\u0000/g, "").replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").trim();
  if (!clean.includes("\n")) return clean.replace(/([.!?])\s+/g, "$1\n");
  return clean;
}

function pagesFromText(text: string, origin: CompanyDoc["pageOrigin"]): { page: number; text: string }[] {
  const clean = normalize(text).slice(0, 20000);
  if (!clean) return [];
  const parts = clean.split(/\f+/).map((part) => part.trim()).filter(Boolean);
  const chunks = parts.length > 1 ? parts : splitChunks(clean, 1200);
  return chunks.map((part, index) => ({ page: index + 1, text: part })).filter((part) => part.text.length > 0).map((part) => ({
    ...part,
    text: origin === "split" && parts.length === 1 ? part.text : part.text,
  }));
}

function splitChunks(text: string, size: number): string[] {
  if (text.length <= size) return [text];
  const lines = text.split("\n");
  const chunks: string[] = [];
  let buf: string[] = [];
  let count = 0;
  for (const line of lines) {
    if (count + line.length > size && buf.length) {
      chunks.push(buf.join("\n"));
      buf = [];
      count = 0;
    }
    buf.push(line);
    count += line.length + 1;
  }
  if (buf.length) chunks.push(buf.join("\n"));
  return chunks;
}

export async function parseUpload(file: File): Promise<CompanyDoc> {
  if (file.size > 1_500_000) throw new Error("Fayl 1.5 MB-dan böyükdür.");
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  let text = "";
  let pageOrigin: CompanyDoc["pageOrigin"] = "split";
  if (ext === "txt" || ext === "md" || ext === "markdown") {
    text = await file.text();
  } else if (ext === "docx") {
    const buf = await file.arrayBuffer();
    const mod = await import("mammoth");
    const mammoth = mod.default ?? mod;
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    text = result.value;
  } else if (ext === "pdf") {
    const buf = new Uint8Array(await file.arrayBuffer());
    const { extractText } = await import("unpdf");
    const extracted = await extractText(buf, { mergePages: false });
    const pages = Array.isArray(extracted.text) ? extracted.text : [extracted.text];
    const built = pages
      .map((page) => normalize(page))
      .filter(Boolean)
      .map((page, index) => ({ page: index + 1, text: page.slice(0, 4000) }));
    if (!built.length) throw new Error("PDF-dən mətn çıxarılmadı. Skan edilmiş fayl ola bilər.");
    return uploadedDoc(file.name, built, "pdf");
  } else {
    throw new Error("Bu növ dəstəklənmir. TXT, Markdown, DOCX və ya PDF yükləyin.");
  }
  const pages = pagesFromText(text, pageOrigin);
  if (!pages.length) throw new Error("Fayldan mətn çıxarılmadı.");
  return uploadedDoc(file.name, pages, pageOrigin);
}

function uploadedDoc(
  filename: string,
  pages: { page: number; text: string }[],
  pageOrigin: CompanyDoc["pageOrigin"],
): CompanyDoc {
  const id = `upload-${crypto.randomUUID()}`;
  const title = filename.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
  return {
    id,
    code: "UPLOAD",
    title: title || "Yüklənmiş sənəd",
    filename,
    category: "Yüklənmiş",
    updated: new Date().toLocaleDateString("az-AZ"),
    summary: pageOrigin === "pdf" ? "PDF səhifələrindən çıxarılmış mətn." : "Fayl mətn hissələrinə bölünüb.",
    trusted: true,
    source: "upload",
    pageOrigin,
    pages,
  };
}
