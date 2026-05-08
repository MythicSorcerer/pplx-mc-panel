import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "../components/PageHeader";

interface Entry { name: string; type: "file"|"dir"; size: number|null; modified: string; }

function fmt(bytes: number|null) {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes/1024).toFixed(1)} KB`;
  return `${(bytes/1048576).toFixed(1)} MB`;
}

export function FilesView() {
  const [cwd, setCwd]           = useState("/");
  const [entries, setEntries]   = useState<Entry[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string|null>(null);
  const [content, setContent]   = useState<string|null>(null);
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState<string|null>(null);
  const [loading, setLoading]   = useState(false);
  const [newName, setNewName]   = useState("");
  const [showNew, setShowNew]   = useState<"file"|"dir"|null>(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  // Sub-directory entries cache: path → entries
  const [subEntries, setSubEntries] = useState<Record<string, Entry[]>>({});

  const load = useCallback(async (p: string) => {
    setLoading(true); setErr(null);
    const r = await fetch(`/api/files?path=${encodeURIComponent(p)}`, { credentials: "include" });
    const j = await r.json();
    setLoading(false);
    if (!j.ok) { setErr(j.message); return; }
    setCwd(p);
    setEntries(j.entries.sort((a: Entry, b: Entry) => {
      if (a.type !== b.type) return a.type==="dir" ? -1 : 1;
      return a.name.localeCompare(b.name);
    }));
  }, []);

  useEffect(() => { load("/"); }, [load]);

  async function toggleDir(fullPath: string) {
    const next = new Set(expanded);
    if (next.has(fullPath)) {
      next.delete(fullPath);
      setExpanded(next);
      return;
    }
    next.add(fullPath);
    setExpanded(next);
    if (!subEntries[fullPath]) {
      const r = await fetch(`/api/files?path=${encodeURIComponent(fullPath)}`, { credentials: "include" });
      const j = await r.json();
      if (j.ok) {
        setSubEntries(prev => ({
          ...prev,
          [fullPath]: j.entries.sort((a: Entry, b: Entry) => {
            if (a.type !== b.type) return a.type==="dir" ? -1 : 1;
            return a.name.localeCompare(b.name);
          }),
        }));
      }
    }
  }

  async function openFile(fp: string) {
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

  function toggleSelectedPath(fp: string) {
    setSelectedPaths(prev => {
      const next = new Set(prev);
      if (next.has(fp)) next.delete(fp);
      else next.add(fp);
      return next;
    });
  }

  function clearSelection() {
    setSelectedPaths(new Set());
  }

  function getEntryType(fp: string): Entry["type"]|null {
    const queue: { entries: Entry[]; basePath: string }[] = [{ entries, basePath: cwd }];
    while (queue.length) {
      const { entries: list, basePath } = queue.shift()!;
      for (const entry of list) {
        const path = basePath === "/" ? `/${entry.name}` : `${basePath}/${entry.name}`;
        if (path === fp) return entry.type;
        if (entry.type === "dir" && subEntries[path]) {
          queue.push({ entries: subEntries[path], basePath: path });
        }
      }
    }
    return null;
  }

  async function deleteSelected() {
    if (selectedPaths.size === 0) return;
    const message = "Delete selected items? This will remove folders and their contents.";
    if (!confirm(message)) return;
    const paths = Array.from(selectedPaths);
    await Promise.all(paths.map(fp =>
      fetch(`/api/files?path=${encodeURIComponent(fp)}`, { method: "DELETE", credentials: "include" })
    ));
    if (selected && selectedPaths.has(selected)) { setSelected(null); setContent(null); }
    clearSelection();
    setDeleteMode(false);
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

  const breadcrumbs = ["/", ...cwd.split("/").filter(Boolean)];

  function renderRows(entries: Entry[], basePath: string, depth = 0): JSX.Element[] {
    return entries.flatMap(e => {
      const fp = basePath === "/" ? `/${e.name}` : `${basePath}/${e.name}`;
      const isSelected = selected === fp;
      const isExpanded = expanded.has(fp);
      const indent = depth * 16;
      const handleRowActivate = () => {
        if (deleteMode) return;
        if (e.type === "dir") toggleDir(fp);
        else openFile(fp);
      };

      const row = (
        <div
          key={fp}
          className={`group flex items-center gap-2 px-4 py-2 text-sm cursor-pointer transition-colors w-full
            ${isSelected ? "bg-mint/10 text-mint" : "hover:bg-white/5 text-white/70"}`}
          style={{ paddingLeft: `${16 + indent}px` }}
          onClick={handleRowActivate}
        >
          {/* Bulk select */}
          <div className="w-4 flex items-center justify-center flex-shrink-0">
            {deleteMode ? (
              <input
                type="checkbox"
                aria-label={`Select ${e.name}`}
                checked={selectedPaths.has(fp)}
                onChange={() => toggleSelectedPath(fp)}
                onClick={ev => ev.stopPropagation()}
                className="accent-mint"
              />
            ) : (
              <span className="w-4" />
            )}
          </div>
          {/* Expand/collapse arrow for dirs */}
          {e.type === "dir" ? (
            <button
              onClick={ev => { ev.stopPropagation(); toggleDir(fp); }}
              className="w-4 h-4 flex items-center justify-center text-white/40 hover:text-white/80 flex-shrink-0 transition-colors"
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                {isExpanded
                  ? <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                  : <path d="M3 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>}
              </svg>
            </button>
          ) : (
            <span className="w-4 flex-shrink-0" />
          )}

          {/* Icon */}
          <button
            className="text-base leading-none select-none flex-shrink-0"
            onClick={ev => { ev.stopPropagation(); handleRowActivate(); }}
            aria-label={e.type === "dir" ? (isExpanded ? "Collapse folder" : "Expand folder") : "Open file"}
          >
            {e.type === "dir" ? (isExpanded ? "📂" : "📁") : "📄"}
          </button>

          {/* Name — clicks open file or toggle dir */}
          <span
            className="flex-1 truncate font-mono text-xs"
          >
            {e.name}
          </span>

          {/* Size */}
          {e.type === "file" && (
            <span className="text-xs text-white/30 font-mono flex-shrink-0 mr-2">{fmt(e.size)}</span>
          )}

        </div>
      );

      const children = e.type === "dir" && isExpanded && subEntries[fp]
        ? renderRows(subEntries[fp], fp, depth + 1)
        : [];

      return [row, ...children];
    });
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <PageHeader title="Files">
        <div className="flex gap-2">
          {!deleteMode ? (
            <>
              <button onClick={() => setShowNew("file")} className="badge px-3 py-1 rounded-full text-xs hover:bg-white/10 transition-colors">+ File</button>
              <button onClick={() => setShowNew("dir")}  className="badge px-3 py-1 rounded-full text-xs hover:bg-white/10 transition-colors">+ Folder</button>
              <button
                onClick={() => { clearSelection(); setDeleteMode(true); }}
                className="badge px-3 py-1 rounded-full text-xs hover:bg-white/10 transition-colors"
              >
                Delete mode
              </button>
            </>
          ) : (
            <>
              <button
                onClick={deleteSelected}
                className="badge px-3 py-1 rounded-full text-xs hover:bg-white/10 transition-colors"
                disabled={selectedPaths.size === 0}
              >
                Delete selected
              </button>
              <button
                onClick={() => { clearSelection(); setDeleteMode(false); }}
                className="badge px-3 py-1 rounded-full text-xs hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </PageHeader>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 px-4 lg:px-8 py-2 font-mono text-xs text-white/40 border-b border-white/5 flex-wrap">
        {breadcrumbs.map((seg, i) => {
          const path = "/" + breadcrumbs.slice(1, i+1).join("/");
          return (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-white/20">/</span>}
              <button onClick={() => load(i===0 ? "/" : path)} className="hover:text-mint transition-colors">
                {i===0 ? "~" : seg}
              </button>
            </span>
          );
        })}
      </div>

      {showNew && (
        <div className="flex items-center gap-3 px-4 lg:px-8 py-3 my-2 bg-white/5 border-b border-white/5">
          <span className="text-xs text-white/50">New {showNew}:</span>
          <input autoFocus className="flex-1 max-w-xs rounded-lg bg-white/5 border border-white/10 px-3 py-1 text-sm outline-none focus:border-mint/50"
            value={newName} onChange={e=>setNewName(e.target.value)}
            onKeyDown={e=>{ if(e.key==="Enter") createNew(); if(e.key==="Escape") {setShowNew(null);setNewName("");} }}
            placeholder={showNew==="dir" ? "folder-name" : "filename.txt"} />
          <button onClick={createNew} className="text-xs text-mint hover:text-mint/70">Create</button>
          <button onClick={()=>{setShowNew(null);setNewName("");}} className="text-xs text-white/30 hover:text-white/60">Cancel</button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* File tree — full width rows */}
        <div className="w-72 lg:w-80 border-r border-white/5 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto scrollbar-thin">
            {loading && <div className="px-4 py-3 text-xs text-white/30">Loading\u2026</div>}
            {err     && <div className="px-4 py-3 text-xs text-red-400">{err}</div>}
            {renderRows(entries, cwd)}
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
                  {saving ? "Saving\u2026" : "Save"}
                </button>
              </div>
              <textarea
                className="flex-1 bg-transparent p-4 font-mono text-sm text-white/80 resize-none outline-none scrollbar-thin"
                value={content}
                onChange={e => setContent(e.target.value)}
                aria-label={`Edit ${selected}`}
                spellCheck={false}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-white/20 text-sm">
              {selected ? "Loading\u2026" : "Select a file to edit"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
