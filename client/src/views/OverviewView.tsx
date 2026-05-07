import { useServer } from "../context/ServerContext";

function StatCard({ label, value, sub, pct, accent = "emerald" }: {
  label: string; value: string; sub?: string; pct?: number; accent?: string;
}) {
  const color = accent === "amber" ? "bg-amber-400" : "bg-emerald";
  return (
    <div className="panel-line rounded-[28px] p-5 flex flex-col gap-2">
      <p className="text-[10px] uppercase tracking-[0.3em] text-moss">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-white/40">{sub}</p>}
      {pct !== undefined && (
        <div className="h-1 rounded-full bg-white/10 mt-1">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct,100)}%` }} />
        </div>
      )}
    </div>
  );
}

export default function OverviewView() {
  const { status, togglePower, metrics, software } = useServer();
  const isOnline = status === "online";

  const fmtUptime = (secs: number) => {
    if (secs < 60) return `${secs}s`;
    if (secs < 3600) return `${Math.floor(secs/60)}m`;
    return `${Math.floor(secs/3600)}h ${Math.floor((secs%3600)/60)}m`;
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-moss">Minecraft panel</p>
          <h1 className="text-3xl font-bold mt-1">Overview</h1>
        </div>
        <button
          onClick={togglePower}
          className={`rounded-2xl px-6 py-2.5 text-sm font-semibold transition-colors ${
            isOnline ? "bg-redstone/20 text-redstone hover:bg-redstone/30" : "bg-emerald/20 text-emerald hover:bg-emerald/30"
          }`}
        >
          {isOnline ? "Stop Server" : status === "starting" ? "Starting…" : status === "stopping" ? "Stopping…" : "Start Server"}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="CPU" value={metrics ? metrics.cpu+"%" : "--"} sub="" pct={metrics?.cpu ?? 0} />
        <StatCard label="Memory" value={metrics ? metrics.ram+"%" : "--"} sub="" pct={metrics?.ram ?? 0} accent="amber" />
        <StatCard label="Disk" value={metrics ? metrics.disk+"%" : "--"} sub="" pct={metrics?.disk ?? 0} />
        <StatCard label="Uptime" value={metrics ? fmtUptime(metrics.uptime) : "--"} />
      </div>

      <div className="panel-line rounded-[28px] p-6">
        <p className="text-[10px] uppercase tracking-[0.3em] text-moss mb-4">Server status</p>
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${
            isOnline ? "bg-emerald animate-pulse" : status === "starting" || status === "stopping" ? "bg-amber-400 animate-pulse" : "bg-white/20"
          }`} />
          <span className="font-semibold capitalize">{status}</span>
          {software && (
            <span className="ml-auto text-xs text-white/40">
              {software.type.charAt(0).toUpperCase()+software.type.slice(1)} {software.version}
            </span>
          )}
        </div>
        {!isOnline && status === "offline" && (
          <p className="text-sm text-white/40 mt-3">Start the server to see live data.</p>
        )}
      </div>
    </div>
  );
}
