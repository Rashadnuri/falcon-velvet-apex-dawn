import { Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EVAL_CASES } from "@/lib/companydocs/cases";
import { reportMarkdown, type EvalReport } from "@/lib/companydocs/evaluate";
import { useDocs } from "@/lib/companydocs/store";
import type { EvalCategory } from "@/lib/companydocs/types";

const LABELS: Record<EvalCategory, string> = {
  answerable: "Birbaşa",
  multi: "Çoxmənbəli",
  missing: "Çatışmayan",
  ambiguous: "Qeyri-müəyyən",
  numeric: "Rəqəm və tarix",
  misleading: "Yanıltıcı",
  injection: "İnyeksiya",
};

export function EvalPanel() {
  const report = useDocs((state) => state.evalReport);
  const llmReport = useDocs((state) => state.llmReport);
  const run = useDocs((state) => state.runExtractiveEval);
  const runLlm = useDocs((state) => state.runLlmSample);
  const ai = useDocs((state) => state.aiAvailable);
  const busy = useDocs((state) => state.busy);
  const progress = useDocs((state) => state.llmProgress);
  const send = useDocs((state) => state.send);
  const setView = useDocs((state) => state.setView);
  const [filter, setFilter] = useState<EvalCategory | "all">("all");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const rows = useMemo(
    () => (report ? report.cases.filter((item) => filter === "all" || item.category === filter) : []),
    [report, filter],
  );

  return (
    <section className="h-full overflow-y-auto px-4 py-5 md:px-8">
      <h1 className="font-serif text-3xl">Qiymətləndirmə</h1>
      <p className="mt-2 max-w-3xl text-sm text-muted">
        {EVAL_CASES.length} sual: birbaşa cavab, çoxmənbəli, çatışmayan məlumat, qeyri-müəyyən, rəqəm və tarix,
        yanıltıcı fərziyyə və təlimat inyeksiyası. Bal yalnız düyməyə basılandan sonra ölçülür. Əvvəlcədən doldurulmuş
        və ya simulyasiya edilmiş faiz yoxdur. Dəst nümunə sənədlərlə birlikdə yazılıb — kənar benchmark deyil.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn btn-primary" type="button" onClick={run}>
          Çıxarış rejimində {EVAL_CASES.length} testi ölç
        </button>
        <button className="btn btn-soft" type="button" disabled={!ai || busy} onClick={() => void runLlm()}>
          {busy ? `Grok ${progress}` : "Grok ilə 5 nümunə sualı ölç"}
        </button>
      </div>
      {!ai ? <p className="mt-2 text-sm text-muted">Grok nümunəsi üçün model bu mühitdə açılmayıb.</p> : null}
      {!report ? (
        <div className="surface mt-6 p-6">
          <h2 className="font-serif text-2xl">Hələ icra olunmayıb</h2>
          <p className="mt-2 text-sm text-muted">
            Keçid faizi, axtarış tutumu, sitat dəqiqliyi, imtina dəqiqliyi, əsassız rəqəm və gecikmə burada boş qalır
            ki, təxmini rəqəm real ölçmə kimi görünməsin.
          </p>
        </div>
      ) : (
        <>
          <Metrics report={report} />
          {mounted ? <CategoryChart report={report} /> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <FilterChip active={filter === "all"} label="Hamısı" onClick={() => setFilter("all")} />
            {(Object.keys(LABELS) as EvalCategory[]).map((category) => (
              <FilterChip
                key={category}
                active={filter === category}
                label={LABELS[category]}
                onClick={() => setFilter(category)}
              />
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button className="btn btn-quiet" type="button" onClick={() => download("companydocs-eval.json", JSON.stringify(report, null, 2), "application/json")}>
              <Download /> JSON
            </button>
            <button className="btn btn-quiet" type="button" onClick={() => download("companydocs-eval.md", reportMarkdown(report), "text/markdown")}>
              <Download /> Markdown
            </button>
          </div>
          <ul className="mt-4 space-y-2">
            {rows.map((item) => (
              <li key={item.id} className="surface p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <span className={item.pass ? "text-pine" : "text-clay"}>{item.pass ? "Keçdi" : "Qaldı"}</span>
                  <span className="text-muted">{LABELS[item.category]}</span>
                  <span className="text-muted tabular-nums">{item.latencyMs} ms</span>
                </div>
                <p className="mt-1 font-medium">{item.question}</p>
                <p className="mt-1 text-sm text-muted">{item.note}</p>
                <button
                  className="btn btn-quiet mt-2 px-0"
                  type="button"
                  onClick={() => {
                    setView("chat");
                    void send(item.question);
                  }}
                >
                  Söhbətdə aç
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {llmReport ? (
        <div className="mt-8">
          <h2 className="font-serif text-2xl">Grok nümunəsi</h2>
          <p className="mt-1 text-sm text-muted">
            Bu, bütün dəstin balı deyil. Yalnız seçilmiş {llmReport.total} sualın ölçülmüş nəticəsidir. Hər sual bir
            model çağırışıdır.
          </p>
          <Metrics report={llmReport} />
        </div>
      ) : null}
    </section>
  );
}

function Metrics({ report }: { report: EvalReport }) {
  const items = [
    ["Keçid faizi", percent(report.passRate), `${report.passed}/${report.total}`],
    ["Axtarış tutumu", percent(report.retrievalHitRate), "gözlənilən sənəd və ya düzgün imtina"],
    ["Sitat dəqiqliyi", percent(report.citationAccuracy), "mənbə çoxluğu"],
    ["İmtina dəqiqliyi", percent(report.abstentionAccuracy), "çatışmayan sualda susmaq"],
    ["Əsassız rəqəm", percent(report.unsupportedClaimRate), "mənbədə olmayan rəqəm"],
    ["Gecikmə p50", `${report.latency.p50} ms`, `orta ${report.latency.avg} ms`],
  ] as const;
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map(([label, value, hint]) => (
        <div key={label} className="surface p-4">
          <p className="text-sm text-muted">{label}</p>
          <p className="mt-1 font-serif text-3xl tabular-nums">{value}</p>
          <p className="text-xs text-muted">{hint}</p>
        </div>
      ))}
    </div>
  );
}

function CategoryChart({ report }: { report: EvalReport }) {
  const data = report.byCategory.map((item) => ({
    name: LABELS[item.category],
    keçid: Math.round(item.passRate * 100),
  }));
  return (
    <div className="surface mt-4 p-4">
      <h2 className="font-serif text-xl">Kateqoriya üzrə keçid</h2>
      <p className="mb-2 text-xs text-muted">Bu qrafik yuxarıdakı ölçülmüş icradandır.</p>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="name" tick={{ fill: "var(--color-muted)", fontSize: 12 }} interval={0} angle={-20} height={56} />
            <YAxis domain={[0, 100]} tick={{ fill: "var(--color-muted)", fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="keçid" fill="var(--color-pine)" radius={6} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function FilterChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button className={active ? "btn btn-primary" : "btn btn-soft"} type="button" onClick={onClick}>
      {label}
    </button>
  );
}

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function download(name: string, body: string, type: string) {
  const blob = new Blob([body], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
