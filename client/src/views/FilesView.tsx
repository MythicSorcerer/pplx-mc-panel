import { useState, useEffect, useCallback, useRef } from "react";
import { PageHeader } from "../components/PageHeader";

interface Entry { name: string; type: "file"|"dir"; size: number|null; modified: string; }

export function FilesView() {
  const [entries, setEntries]   = useState<Entry[]>([]);
  const [selected, setSelected] = useState<string|null>(null);
  const [content, setContent]   = useState<string|null>(null);
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState<string|null>(null);
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/files?path=/", { credentials: "include" });
    const j = await r.json();
    setLoading(false);
    if (!j.ok) { setErr(j.message); return; }
    setEntries(j.entries.sort((a: Entry, b: Entry) => {
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      return a.name.localeCompare(b.name);
    }));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function openFile(path: string) {
    setSelected(path); setContent(null);
    const r = await fetch(`/api/files/read?path=${encodeURIComponent(path)}`, { credentials: "include" });
    const j = await r.json();
    if (j.ok) setContent(j.content);
    else setErr(j.message);
  }

  async function saveFile() {
    if (!selected || !content) return;
    setSaving(true);
    await fetch("/api/files/write", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: selected, content }),
    });
    setSaving(false);
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <PageHeader title="Files" />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 border-r border-white/5 overflow-auto">
          {loading && <div className="p-4 text-white/30 text-sm">Loading…</div>}
          {err && <div className="p-4 text-red-400 text-sm">{err}</div>}
          <div className="divide-y divide-white/5">
            {entries.map(e => (
              <div
                key={e.name}
                onClick={() => e.type === "dir" ? null : openFile("/" + e.name)}
                className="flex items-center gap-2 px-4 py-3 hover:bg-white/5 cursor-pointer"
              >
                <span>{e.type === "dir" ? "📁" : "📄"}</span>
                <span className="flex-1 text-sm">{e.name}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 flex flex-col">
          {selected && content !== null ? (
            <>
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
                <span className="font-mono text-xs text-white/40">{selected}</span>
                <button onClick={saveFile} className="text-mint text-xs">{saving ? "Saving…" : "Save"}</button>
              </div>
              <textarea
                ref={textareaRef}
                className="flex-1 bg-transparent p-4 font-mono text-sm resize-none outline-none"
                value={content}
                onChange={e => setContent(e.target.value)}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-white/20 text-sm">
              Select a file to edit
            </div>
          )}
        </div>
      </div>
    </div>
  );
}