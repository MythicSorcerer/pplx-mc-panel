import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "../components/PageHeader";

interface Entry { name: string; type: "file"|"dir"; size: number|null; modified: string; }

const EXT_LANG: Record<string,string> = {
  json:"json", yml:"yaml", yaml:"yaml", toml:"toml",
  properties:"properties", txt:"text", log:"text",
  js:"javascript", ts:"typescript", sh:"bash",
};

function fmt(bytes: number|null) {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes/1024).toFixed(1)} KB`;
  return `${(bytes/1048576).toFixed(1)} MB`;
}

export function FilesView() {
  const [cwd, setCwd]           = useState("/");
  const [entries, setEntries]   = useState<Entry[]>([]);
  const [selected, setSelected] = useState<string|null>(null);
  const [content, setContent]   = useState<string|null>(null);
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState<string|null>(null);
  const [loading, setLoading]   = useState(false);
  const [newName, setNewName]   = useState("");
  const [showNew, setShowNew]   = useState<"file"|"dir"|null>(null);

  const load = useCallback(async (p: string) => {
    setLoading(true); setErr(null);
    const r = await fetch(`/api/files?path=${encodeURIComponent(p)}`, { credentials: "include" });
    const j = await r.json();
    setLoading(false);
    if (!j.ok) { setErr(j.message); return; }
    setCwd(p);
    setEntries(j.entries.sort((a:Entry,b:Entry) => {
      if (a.type !== b.type) return a.type==="dir"?-1:1;
      return a.name.localeCompare(b.name);
    }));
  }, []);

  useEffect(() => { load("/"); }, [load]);

  async function openFile(name: string) {
    const fp = cwd === "/" ? `/${name}` : `${cwd}/${name}`;
    setSelected(fp); setContent(null);
    const r = await fetch(`/api/files/read?path=${encodeURIComponent(fp)}`, { credentials: "include" });
    const j = await r.json();
    if (!j.ok) { setErr(j.message); return; }
    setContent(j.content);
  }

  async function saveFile() {
    if (selected === null || content === null) return;
    setSaving(true);
    await fetch("/api/files/write", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: selected, content }),
    });
    setSaving(false);
  }

  async function deleteEntry(name: string, type: string) {
    if (!confirm(`Delete ${name}?`)) return;
    const fp = cwd === "/" ? `/${name}` : `${cwd}/${name}`;
    await fetch(`/api/files?path=${encodeURIComponent(fp)}`, { method: "DELETE", credentials: "include" });
    if (selected === fp) { setSelected(null); setContent(null); }
    load(cwd);
  }

  async function createNew() {
    if (!newName) return;
    const fp = cwd === "/" ? `/${newName}` : `${cwd}/${newName}`;
    if (showNew === "dir") {
      await fetch("/api/files/mkdir", { method:"POST", credentials:"include", headers:{"Content-Type":"application/json"}, body: JSON.stringify({path:fp}) });
    } else {
      await fetch("/api/files/write", { method:"POST", credentials:"include", headers:{"Content-Type":"application/json"}, body: JSON.stringify({path:fp, content:""}) });
    }
    setShowNew(null); setNewName(""); load(cwd);
  }

  function navigate(name: string) {
    const next = cwd === "/" ? `/${name}` : `${cwd}/${name}`;
    setSelected(null); setContent(null); load(next);
  }

  function goUp() {
    if (cwd === "/") return;
    const parts = cwd.split("/").filter(Boolean);
    parts.pop();
    load(parts.length ? "/" + parts.join("/") : "/");
  }

  const breadcrumbs = ["/", ...cwd.split("/").filter(Boolean)];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <PageHeader title="Files">
        <div className="flex gap-2">
          <button onClick={() => setShowNew("file")} className="badge px-3 py-1 rounded-full text-xs hover:bg-white/10 transition-colors">+ File</button>
          <button onClick={() => setShowNew("dir")}  className="badge px-3 py-1 rounded-full text-xs hover:bg-white/10 transition-colors">+ Folder</button>
        </div>
      </PageHeader>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 px-4 lg:px-8 py-2 font-mono text-xs text-white/40 border-b border-white/5 flex-wrap">
        {breadcrumbs.map((seg, i) => {
          const path = "/" + breadcrumbs.slice(1, i+1).join("/");
          return (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-white/20">/</span>}
              <button onClick={() => load(i===0?"/" : path)} className="hover:text-mint transition-colors">
                {i===0 ? "~" : seg}
              </button>
            </span>
          );
        })}
      </div>

      {showNew && (
        <div className="flex items-center gap-2 px-4 lg:px-8 py-2 bg-white/5 border-b border-white/5">
          <span className="text-xs text-white/50">New {showNew}:</span>
          <input autoFocus className="flex-1 max-w-xs rounded-lg bg-white/5 border border-white/10 px-3 py-1 text-sm outline-none focus:border-mint/50"
            value={newName} onChange={e=>setNewName(e.target.value)}
            onKeyDown={e=>{ if(e.key==="Enter") createNew(); if(e.key==="Escape") {setShowNew(null);setNewName("");} }}
            placeholder={showNew==="dir"?"folder-name":"filename.txt"} />
          <button onClick={createNew} className="text-xs text-mint hover:text-mint/70">Create</button>
          <button onClick={()=>{setShowNew(null);setNewName("");}} className="text-xs text-white/30 hover:text-white/60">Cancel</button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* File tree */}
        <div className="w-64 lg:w-72 border-r border-white/5 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto scrollbar-thin">
            {cwd !== "/" && (
              <button onClick={goUp} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors font-mono">
                ↑ ..
              </button>
            )}
            {loading && <div className="px-4 py-3 text-xs text-white/30">Loading…</div>}
            {err    && <div className="px-4 py-3 text-xs text-red-400">{err}</div>}
            {entries.map(e => (
              <div key={e.name}
                className={`group flex items-center gap-2 px-4 py-2 text-sm cursor-pointer transition-colors
                  ${selected === (cwd==="/"?`/${e.name}`:`${cwd}/${e.name}`) ? "bg-mint/10 text-mint" : "hover:bg-white/5 text-white/70"}`}
                onClick={() => e.type==="dir" ? navigate(e.name) : openFile(e.name)}>
                <span className="text-base leading-none select-none">{e.type==="dir"?"📁":"📄"}</span>
                <span className="flex-1 truncate font-mono text-xs">{e.name}</span>
                <button onClick={ev=>{ ev.stopPropagation(); deleteEntry(e.name, e.type); }}
                  className="opacity-0 group-hover:opacity-100 text-red-400/60 hover:text-red-400 text-xs transition-opacity px-1">✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selected && content !== null ? (
            <>
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
                <span className="font-mono text-xs text-white/40">{selected}</span>
                <button onClick={saveFile}
                  className="rounded-full bg-mint/20 text-mint border border-mint/30 px-4 py-1 text-xs font-bold hover:bg-mint/30 transition-colors">
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
              <textarea
                className="flex-1 bg-transparent p-4 font-mono text-sm text-white/80 resize-none outline-none scrollbar-thin"
                value={content}
                onChange={e => setContent(e.target.value)}
                spellCheck={false}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-white/20 text-sm">
              {selected ? "Loading…" : "Select a file to edit"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
