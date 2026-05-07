import { useState, useEffect } from "react";

type SoftwareType = "paper" | "purpur" | "fabric";

const SOFTWARE = [
  { id: "paper" as SoftwareType, label: "Paper", badge: "Recommended", desc: "Stable survival baseline with full plugin compatibility." },
  { id: "purpur" as SoftwareType, label: "Purpur", badge: "Community", desc: "Flexible gameplay tweaks and additional server options." },
  { id: "fabric" as SoftwareType, label: "Fabric", badge: "Modded", desc: "Lean runtime for modern modpacks and utility mods." },
];

const mono: React.CSSProperties = { background: "rgba(255,255,255,0.07)", padding: "1px 5px", borderRadius: 3, fontFamily: "monospace", fontSize: "0.82em" };

export default function SoftwareView() {
  const [versions, setVersions] = useState<Record<SoftwareType, string[]>>({ paper: [], purpur: [], fabric: [] });
  const [selected, setSelected] = useState<Record<SoftwareType, string>>({ paper: "", purpur: "", fabric: "" });
  const [loading, setLoading] = useState<Record<SoftwareType, boolean>>({ paper: true, purpur: true, fabric: true });
  const [eulaTarget, setEulaTarget] = useState<SoftwareType | null>(null);
  const [installing, setInstalling] = useState<SoftwareType | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    (["paper", "purpur", "fabric"] as SoftwareType[]).forEach((type) => {
      fetch(`/api/software/versions?type=${type}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.ok) {
            setVersions((v) => ({ ...v, [type]: data.versions }));
            setSelected((s) => ({ ...s, [type]: data.versions[0] ?? "" }));
          }
        })
        .finally(() => setLoading((l) => ({ ...l, [type]: false })));
    });
  }, []);

  async function install(type: SoftwareType) {
    setInstalling(type);
    setEulaTarget(null);
    setResult(null);
    try {
      const r = await fetch("/api/software/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, version: selected[type], eulaAccepted: true }),
      });
      const data = await r.json();
      setResult(data);
    } catch (e: any) {
      setResult({ ok: false, message: e.message });
    } finally {
      setInstalling(null);
    }
  }

  return (
    <div style={{ padding: "2rem", maxWidth: 1100 }}>
      <div style={{ marginBottom: "0.5rem", fontSize: "0.7rem", letterSpacing: "0.1em", color: "var(--muted)", textTransform: "uppercase" }}>Minecraft Panel</div>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "2rem" }}>Software</h1>

      {result && (
        <div style={{
          marginBottom: "1.5rem", padding: "0.75rem 1rem",
          background: result.ok ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)",
          border: `1px solid ${result.ok ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}`,
          borderRadius: 8, color: result.ok ? "#4ade80" : "#f87171", fontSize: "0.875rem"
        }}>
          {result.ok ? "✓ " : "✗ "}{result.message}
          {result.ok && " — download running in background, watch Console for progress."}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {SOFTWARE.map((sw) => (
          <div key={sw.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#4ade80", fontWeight: 600 }}>{sw.badge}</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{sw.label}</div>
            <div style={{ fontSize: "0.875rem", color: "var(--muted)", lineHeight: 1.5 }}>{sw.desc}</div>
            <div>
              <label style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Version</label>
              {loading[sw.id] ? (
                <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: 4 }}>Loading versions…</div>
              ) : (
                <select
                  value={selected[sw.id]}
                  onChange={(e) => setSelected((s) => ({ ...s, [sw.id]: e.target.value }))}
                  style={{ width: "100%", marginTop: 4, padding: "0.5rem 0.75rem", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)", fontSize: "0.875rem", cursor: "pointer" }}
                >
                  {versions[sw.id].map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              )}
            </div>
            <button
              disabled={!!installing || loading[sw.id] || !selected[sw.id]}
              onClick={() => setEulaTarget(sw.id)}
              style={{ marginTop: "auto", padding: "0.6rem 1rem", borderRadius: 8, background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.4)", color: "#4ade80", fontWeight: 600, fontSize: "0.875rem", cursor: installing ? "not-allowed" : "pointer", opacity: installing && installing !== sw.id ? 0.5 : 1, transition: "all 0.15s" }}
            >
              {installing === sw.id ? "Installing…" : `Install ${sw.label}`}
            </button>
          </div>
        ))}
      </div>

      <div style={{ padding: "1.25rem 1.5rem", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 }}>
        <div style={{ fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.5rem" }}>How installs work</div>
        <p style={{ fontSize: "0.875rem", color: "var(--muted)", lineHeight: 1.6 }}>
          Clicking Install fetches the latest stable build from the official API (PaperMC / PurpurMC / FabricMC),
          writes <code style={mono}>eula=true</code> to <code style={mono}>eula.txt</code>,
          and atomically replaces <code style={mono}>server.jar</code>.
          Watch the Console tab for download progress. Stop the server before switching software.
        </p>
      </div>

      {eulaTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setEulaTarget(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#1a1a1a", border: "1px solid var(--border)", borderRadius: 16, padding: "2rem", maxWidth: 480, width: "90%" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem" }}>Minecraft End User License Agreement</h2>
            <p style={{ fontSize: "0.875rem", color: "var(--muted)", lineHeight: 1.6, marginBottom: "1rem" }}>
              By installing this server software, you agree to the{" "}
              <a href="https://aka.ms/MinecraftEULA" target="_blank" rel="noopener noreferrer" style={{ color: "#4ade80" }}>Minecraft EULA</a>.
              This will write <code style={mono}>eula=true</code> to <code style={mono}>eula.txt</code>.
            </p>
            <p style={{ fontSize: "0.875rem", color: "var(--muted)", lineHeight: 1.6, marginBottom: "1.5rem" }}>
              Installing: <strong style={{ color: "var(--text)" }}>{SOFTWARE.find(s => s.id === eulaTarget)?.label} {selected[eulaTarget]}</strong>
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button onClick={() => setEulaTarget(null)} style={{ padding: "0.5rem 1rem", borderRadius: 8, background: "transparent", border: "1px solid var(--border)", color: "var(--muted)", cursor: "pointer" }}>Cancel</button>
              <button onClick={() => install(eulaTarget)} style={{ padding: "0.5rem 1.25rem", borderRadius: 8, background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.4)", color: "#4ade80", fontWeight: 700, cursor: "pointer" }}>I agree — Install</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
