import { StatCard } from "../components/StatCard";
import { PageHeader } from "../components/PageHeader";
import { useServer } from "../context/ServerContext";
const TIMELINE = [
  { color:"bg-mint",     title:"Backup completed",      desc:"Nightly snapshot → backups/2026-05-06.zip",  ago:"2m"  },
  { color:"bg-amber",    title:"Plugin update pending",  desc:"ViaVersion can be upgraded after restart.",  ago:"26m" },
  { color:"bg-redstone", title:"Player report filed",    desc:"Griefing report added to moderation queue.", ago:"58m" },
];
const ACTIONS = ["Create backup","Open live console","Edit server.properties","Install Paper build"];
export function OverviewView() {
  const { status, togglePower } = useServer();
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <PageHeader title="Overview">
        <div className="rounded-full panel-line px-4 py-2 text-sm font-mono text-mint">survival-01</div>
        <button onClick={togglePower}
          className={`rounded-full px-5 py-2.5 font-bold transition-colors ${status==="online"?"bg-emerald text-coal":"bg-redstone text-white"}`}>
          {status==="online"?"Running":"Stopped"}
        </button>
      </PageHeader>
      <div className="flex-1 overflow-auto scrollbar-thin p-4 lg:p-8 space-y-5">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="CPU"     value="43%"    sub="+4%"      pct={43}/>
          <StatCard label="Memory"  value="5.8 GB" sub="72%"      pct={72} accent="amber"/>
          <StatCard label="Players" value="14"     sub="Peak 23"/>
          <StatCard label="Disk"    value="42 GB"  sub="of 80 GB" pct={52}/>
        </div>
        <div className="grid xl:grid-cols-[1.2fr_.8fr] gap-4">
          <article className="panel-line rounded-[28px] p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-moss">Activity</p>
                <h2 className="text-xl font-bold mt-1">Recent timeline</h2>
              </div>
              <span className="badge px-3 py-2 rounded-full text-xs">Auto-refresh</span>
            </div>
            <div className="space-y-4">
              {TIMELINE.map(item=>(
                <div key={item.title} className="flex items-start gap-4">
                  <div className={`mt-2 h-2.5 w-2.5 rounded-full flex-shrink-0 ${item.color}`}/>
                  <div><p className="font-semibold text-sm">{item.title}</p><p className="text-xs text-white/55 mt-0.5">{item.desc}</p></div>
                  <span className="ml-auto text-xs text-white/35 flex-shrink-0">{item.ago}</span>
                </div>
              ))}
            </div>
          </article>
          <article className="panel-line rounded-[28px] p-6">
            <p className="text-[10px] uppercase tracking-[0.3em] text-moss">Quick actions</p>
            <div className="mt-4 grid gap-2.5">
              {ACTIONS.map(a=>(
                <button key={a} className="rounded-2xl bg-white/5 hover:bg-white/10 px-4 py-3.5 text-left text-sm transition-colors">{a}</button>
              ))}
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
