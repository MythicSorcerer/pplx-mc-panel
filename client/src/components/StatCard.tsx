interface Props { label: string; value: string; sub?: string; pct?: number; accent?: "mint"|"amber"|"redstone"; }
export function StatCard({ label, value, sub, pct, accent = "mint" }: Props) {
  const subColor = accent==="amber"?"text-amber":accent==="redstone"?"text-redstone":"text-mint";
  const bar      = accent==="amber"?"from-amber to-yellow-300":accent==="redstone"?"from-redstone to-rose-300":"from-emerald to-mint";
  return (
    <article className="panel-line rounded-3xl p-5">
      <p className="text-[10px] uppercase tracking-[0.3em] text-moss">{label}</p>
      <div className="mt-4 flex items-end justify-between">
        <h2 className="text-4xl font-black tabular-nums">{value}</h2>
        {sub && <span className={`text-sm ${subColor}`}>{sub}</span>}
      </div>
      {pct !== undefined && (
        <div className="mt-4 h-2 rounded-full bg-white/5 overflow-hidden">
          <div className={`h-full rounded-full bg-gradient-to-r ${bar} transition-all duration-700`} style={{width:`${pct}%`}} />
        </div>
      )}
    </article>
  );
}
