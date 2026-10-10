import { Search, Trash2, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { rankChunks } from "@/lib/companydocs/engine";
import { parseUpload } from "@/lib/companydocs/parse-upload";
import { useDocs, useVisibleDocs } from "@/lib/companydocs/store";
import type { CompanyDoc } from "@/lib/companydocs/types";

export function DocsPanel() {
  const docs = useVisibleDocs();
  const query = useDocs((state) => state.docQuery);
  const setQuery = useDocs((state) => state.setDocQuery);
  const selectedId = useDocs((state) => state.selectedDocId);
  const setSelected = useDocs((state) => state.setSelectedDocId);
  const hideDoc = useDocs((state) => state.hideDoc);
  const addUpload = useDocs((state) => state.addUpload);
  const restoreSamples = useDocs((state) => state.restoreSamples);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const selected = docs.find((doc) => doc.id === selectedId) ?? docs[0] ?? null;
  const hits = useMemo(() => (query.trim() ? rankChunks(docs, query, 6).filter((hit) => !hit.injected) : []), [docs, query]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setStatus("Mətn çıxarılır…");
    try {
      const doc = await parseUpload(file);
      addUpload(doc);
      setStatus(`${doc.filename} indeksləndi · ${doc.pages.length} hissə`);
    } catch (reason) {
      setStatus("");
      setError(reason instanceof Error ? reason.message : "Fayl oxunmadı.");
    }
  }

  return (
    <section className="h-full overflow-y-auto px-4 py-5 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">Sənədlər</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Nümunə siyasətlər hazırdır. TXT, Markdown, DOCX və PDF brauzerdə oxunur — server diskinə yazılmır.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="btn btn-primary">
            <Upload />
            Fayl yüklə
            <input
              className="sr-only"
              type="file"
              accept=".txt,.md,.markdown,.pdf,.docx,text/plain"
              onChange={(event) => {
                void onFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
          <button className="btn btn-quiet" type="button" onClick={restoreSamples}>
            Nümunələri bərpa et
          </button>
        </div>
      </div>
      {status ? <p className="mt-3 text-sm text-pine">{status}</p> : null}
      {error ? <p className="mt-3 text-sm text-clay">{error}</p> : null}
      <label className="mt-5 block">
        <span className="mb-1 flex items-center gap-2 text-sm font-semibold">
          <Search className="size-4" /> Parça axtarışı (BM25)
        </span>
        <input
          className="field"
          value={query}
          placeholder="Məsələn: vpn, məzuniyyət, bonus"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {query.trim() ? (
        <div className="mt-3 grid gap-2">
          {hits.length === 0 ? (
            <p className="surface p-4 text-sm text-muted">Bu sorğu üçün kifayət qədər uyğun parça tapılmadı.</p>
          ) : (
            hits.map((hit) => (
              <button
                key={hit.chunkId}
                className="surface p-4 text-left"
                type="button"
                onClick={() => setSelected(hit.docId)}
              >
                <span className="text-sm font-semibold">
                  {hit.title} · səh. {hit.page}
                </span>
                <span className="ml-2 text-xs text-muted tabular-nums">BM25 {hit.score}</span>
                <span className="mt-1 block text-sm text-muted">{hit.text.split("\n").slice(0, 2).join(" ")}</span>
              </button>
            ))
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">Sorğu yazın — uyğun parçalar sitatla açılacaq. Bu, semantik oxşarlıq deyil.</p>
      )}
      {docs.length === 0 ? (
        <p className="surface mt-5 p-6 text-muted">İndeks boşdur. Nümunə sənədləri bərpa edin və ya fayl yükləyin.</p>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-[18rem_1fr]">
          <ul className="space-y-2">
            {docs.map((doc) => (
              <li key={doc.id}>
                <button
                  className={`w-full rounded-xl px-3 py-3 text-left ${selected?.id === doc.id ? "bg-pine text-paper" : "bg-card"}`}
                  type="button"
                  onClick={() => setSelected(doc.id)}
                >
                  <span className="block text-sm font-semibold">{doc.code}</span>
                  <span className="block text-sm">{doc.title}</span>
                  <span className={`block text-xs ${selected?.id === doc.id ? "text-paper/75" : "text-muted"}`}>
                    {doc.category} · {doc.pages.length} səh. · indekslənib
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {selected ? <DocDetail doc={selected} confirm={confirmId === selected.id} onAsk={() => setConfirmId(selected.id)} onCancel={() => setConfirmId(null)} onDelete={() => hideDoc(selected.id)} /> : null}
        </div>
      )}
    </section>
  );
}

function DocDetail({
  doc,
  confirm,
  onAsk,
  onCancel,
  onDelete,
}: {
  doc: CompanyDoc;
  confirm: boolean;
  onAsk: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{doc.filename}</p>
          <h2 className="font-serif text-2xl">{doc.title}</h2>
          <p className="mt-1 text-sm text-muted">
            {doc.summary} Yenilənmə: {doc.updated}. Status: indekslənib.
            {doc.pageOrigin === "pdf" ? " Səhifə nömrəsi PDF-dən götürülüb." : ""}
            {doc.pageOrigin === "split" ? " Səhifə nömrəsi mətn hissəsidir, orijinal səhifə deyil." : ""}
          </p>
          {doc.trusted ? null : (
            <p className="mt-2 rounded-lg bg-clay-soft px-3 py-2 text-sm text-clay">
              Etibarsız qaralama. İçində təlimat inyeksiyası var və cavablarda mənbə kimi istifadə olunmur.
            </p>
          )}
        </div>
        {confirm ? (
          <div className="flex gap-2">
            <button className="btn btn-danger" type="button" onClick={onDelete}>
              Silinsin
            </button>
            <button className="btn btn-quiet" type="button" onClick={onCancel}>
              Ləğv
            </button>
          </div>
        ) : (
          <button className="btn btn-quiet" type="button" onClick={onAsk}>
            <Trash2 /> Sil
          </button>
        )}
      </div>
      <div className="mt-4 space-y-4">
        {doc.pages.map((page) => (
          <section key={page.page}>
            <h3 className="text-sm font-semibold text-muted">Səhifə {page.page}</h3>
            <p className="mt-1 whitespace-pre-wrap leading-relaxed">{page.text}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
