import { useEffect, useState } from "react";
import { useServer } from "../context/ServerContext";

interface Player { name: string; uuid?: string; ping?: number; }

export default function PlayersView() {
  const { status } = useServer();
  const [players, setPlayers] = useState<Player[]>([]);
  const [search, setSearch] = useState("");
  const isOnline = status === "online";

  useEffect(() => {
    if (!isOnline) { setPlayers([]); return; }
    const load = () =>
      fetch("/api/players", { credentials: "include" })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.players) setPlayers(d.players); })
        .catch(() => {});
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [isOnline]);

  const filtered = players.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-moss">Minecraft panel</p>
        <h1 className="text-3xl font-bold mt-1">Players</h1>
      </div>

      {isOnline ? (
        <>
          <div className="flex items-center gap-4">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search players…"
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-emerald/50"
            />
            <span className="text-sm text-white/40">{players.length} online</span>
          </div>
          {filtered.length === 0 ? (
            <div className="panel-line rounded-[28px] p-10 text-center text-white/30 text-sm">
              No players online
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(p => (
                <div key={p.name} className="panel-line rounded-[28px] p-4 flex items-center gap-4">
                  <img
                    src={`https://mc-heads.net/avatar/${p.name}/32`}
                    alt={p.name}
                    className="w-8 h-8 rounded-lg"
                  />
                  <span className="font-semibold">{p.name}</span>
                  {p.ping !== undefined && (
                    <span className="ml-auto text-xs text-white/40">{p.ping}ms</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="panel-line rounded-[28px] p-10 text-center">
          <p className="text-white/40 text-sm">Server is offline — start the server to see players.</p>
        </div>
      )}
    </div>
  );
}
