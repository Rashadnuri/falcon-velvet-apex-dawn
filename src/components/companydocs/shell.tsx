import { ClipboardCheck, Files, Menu, MessageSquare, Network, X } from "lucide-react";
import { useEffect } from "react";
import { ArchPanel } from "./arch-panel";
import { ChatPanel } from "./chat-panel";
import { DocsPanel } from "./docs-panel";
import { EvalPanel } from "./eval-panel";
import { useDocs, useVisibleDocs, type ViewId } from "@/lib/companydocs/store";

const NAV: { id: ViewId; label: string; icon: typeof MessageSquare }[] = [
  { id: "chat", label: "Söhbət", icon: MessageSquare },
  { id: "docs", label: "Sənədlər", icon: Files },
  { id: "eval", label: "Qiymətləndirmə", icon: ClipboardCheck },
  { id: "arch", label: "Arxitektura", icon: Network },
];

export function Shell() {
  const view = useDocs((state) => state.view);
  const setView = useDocs((state) => state.setView);
  const navOpen = useDocs((state) => state.navOpen);
  const setNavOpen = useDocs((state) => state.setNavOpen);
  const refreshAi = useDocs((state) => state.refreshAi);
  const aiAvailable = useDocs((state) => state.aiAvailable);
  const docs = useVisibleDocs();

  useEffect(() => {
    void useDocs.persist.rehydrate();
    void refreshAi();
  }, [refreshAi]);

  return (
    <div className="flex h-dvh bg-paper text-ink">
      <aside className="hidden w-72 shrink-0 flex-col bg-pine-2 text-paper md:flex">
        <Brand />
        <Nav view={view} onSelect={setView} />
        <SidebarMeta count={docs.length} ai={aiAvailable} />
      </aside>
      {navOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button className="absolute inset-0 bg-pine-2/70" aria-label="Menyunu bağla" onClick={() => setNavOpen(false)} />
          <aside className="relative flex h-full w-72 flex-col bg-pine-2 text-paper">
            <div className="flex justify-end p-3">
              <button className="btn btn-ghost" onClick={() => setNavOpen(false)} aria-label="Bağla">
                <X />
              </button>
            </div>
            <Brand />
            <Nav view={view} onSelect={setView} />
          </aside>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-line px-4 py-3 md:hidden">
          <button className="btn btn-quiet" onClick={() => setNavOpen(true)} aria-label="Menyu">
            <Menu />
          </button>
          <div>
            <p className="font-serif text-lg leading-none">CompanyDocs</p>
            <p className="text-sm text-muted">XəzərSoft MMC</p>
          </div>
        </header>
        <main className="min-h-0 flex-1">
          {view === "chat" ? <ChatPanel /> : null}
          {view === "docs" ? <DocsPanel /> : null}
          {view === "eval" ? <EvalPanel /> : null}
          {view === "arch" ? <ArchPanel /> : null}
        </main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="px-5 pt-6 pb-4">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-pine font-serif text-lg text-paper">XS</span>
        <div>
          <p className="font-serif text-xl leading-tight">CompanyDocs</p>
          <p className="text-sm text-paper/70">AI sənəd köməkçisi</p>
        </div>
      </div>
    </div>
  );
}

function Nav({ view, onSelect }: { view: ViewId; onSelect: (view: ViewId) => void }) {
  return (
    <nav className="flex flex-col gap-1 px-3" aria-label="Əsas">
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = view === item.id;
        return (
          <button
            key={item.id}
            className="btn btn-ghost justify-start"
            data-active={active}
            onClick={() => onSelect(item.id)}
          >
            <Icon aria-hidden="true" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

function SidebarMeta({ count, ai }: { count: number; ai: boolean | null }) {
  return (
    <div className="mt-auto space-y-2 px-5 py-5 text-sm text-paper/75">
      <p className="tabular-nums">{count} sənəd indeksdə</p>
      <p>{ai === null ? "Model yoxlanılır…" : ai ? "Grok 4.5 hazırdır" : "Çıxarış rejimi"}</p>
      <p>Axtarış: BM25, embedding yoxdur</p>
    </div>
  );
}
