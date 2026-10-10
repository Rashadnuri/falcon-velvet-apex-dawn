export function ArchPanel() {
  return (
    <section className="h-full overflow-y-auto px-4 py-5 md:px-8">
      <h1 className="font-serif text-3xl">Arxitektura</h1>
      <p className="mt-2 max-w-3xl text-sm text-muted">
        Bu ekran işləyən prototipi tam RAG xidmətindən ayırır. Yaşıl addımlar hazırdır, boz addımlar bu mühitdə
        qoşulmayıb.
      </p>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <article className="surface p-5">
          <h2 className="font-serif text-xl">İndi işləyən axın</h2>
          <ol className="mt-3 space-y-2 text-sm">
            <li>1. Sənəd qəbulu — nümunə korpus və brauzer yükləməsi</li>
            <li>2. Mətn çıxarışı — TXT, Markdown, DOCX, PDF</li>
            <li>3. Parçalama — səhifə və ya mətn hissəsi</li>
            <li>4. BM25 indeksi və AZ–EN termin lüğəti</li>
            <li>5. Əsaslı cavab — Grok 4.5 və ya çıxarış rejimi</li>
            <li>6. Sitat — sənəd adı, kod və səhifə</li>
          </ol>
        </article>
        <article className="surface p-5">
          <h2 className="font-serif text-xl">Hədəf, hələ qoşulmayıb</h2>
          <ol className="mt-3 space-y-2 text-sm text-muted">
            <li>Embedding modeli</li>
            <li>ChromaDB və ya pgvector</li>
            <li>Davamlı obyekt anbarı</li>
            <li>FastAPI xidməti, pytest, Docker Compose</li>
            <li>Ayrı qiymətləndirici model</li>
          </ol>
          <p className="mt-3 text-sm">BM25 semantik RAG kimi təqdim olunmur.</p>
        </article>
      </div>
      <article className="surface mt-4 p-5">
        <h2 className="font-serif text-xl">Bu prototipin API-si</h2>
        <p className="mt-2 text-sm text-muted">
          Söhbət interfeysi server funksiyası ilə Grok-u çağırır. Açar brauzerə çıxmır. Aşağıdakı REST yolları nümunə
          korpus üçündür.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-pine-2 p-4 text-sm text-paper">{`GET  /api/health
POST /api/chat      { "question": "...", "useModel": false }
POST /api/evaluate  nümunə korpusda çıxarış rejimini ölçür`}</pre>
      </article>
      <article className="surface mt-4 p-5">
        <h2 className="font-serif text-xl">Sonrakı FastAPI müqaviləsi</h2>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-paper-2 p-4 text-sm">{`POST /v1/documents     multipart, davamlı anbar
GET  /v1/documents
DELETE /v1/documents/{id}
POST /v1/chat          { "question", "topK" }
POST /v1/evaluate      JSON və Markdown hesabat

Axın: ingest → extract → chunk → embed → retrieve → generate → cite`}</pre>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
          <li>Model yalnız verilən parçalardan danışır və çatışmayan siyasəti imtina edir.</li>
          <li>Sənəd mətni təlimat sayılmır. İnyeksiya parçası kontekstdən çıxarılır.</li>
          <li>Rəqəm mənbədə yoxdursa, cavab xəbərdarlıqla işarələnir.</li>
        </ul>
      </article>
    </section>
  );
}
