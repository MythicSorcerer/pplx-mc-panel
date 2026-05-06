import { useState } from "react";
import { PageHeader } from "../components/PageHeader";
const BUILDS = [
  { id:"paper",  name:"Paper",  version:"1.20.6",       desc:"Stable survival baseline with full plugin compatibility.", tag:"Recommended" },
  { id:"purpur", name:"Purpur", version:"latest",        desc:"Flexible gameplay tweaks and additional server options.",  tag:"Community"   },
  { id:"fabric", name:"Fabric", version:"0.15.x",        desc:"Lean runtime for modern modpacks and utility mods.",      tag:"Modded"      },
  { id:"folia",  name:"Folia",  version:"experimental",  desc:"Multithreaded tick regions for very large servers.",       tag:"Experimental"},
];
export function SoftwareView() {
  const [queued,setQueued] = useState<string|null>(null);
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <PageHeader title="Software">
        {queued && <span className="badge border-amber/30 bg-amber/10 text-amber px-4 py-2 rounded-full text-sm">{BUILDS.find(b=>b.id===queued)?.name} queued</span>}
      </PageHeader>
      <div className="flex-1 overflow-auto scrollbar-thin p-4 lg:p-8 space-y-5">
        <div className="grid lg:grid-cols-2 xl:grid-cols-4 gap-4">
          {BUILDS.map(build=>{
            const isCurrent = build.id==="paper";
            const isQueued  = queued===build.id;
            return (
              <article key={build.id} className={`panel-line rounded-[28px] p-5 transition-colors ${isCurrent?"border-mint/25":""}`}>
                <div className="flex items-start justify-between mb-3">
                  <span className="badge px-2 py-1 rounded-full text-xs">{build.tag}</span>
                  {isCurrent && <span className="h-2 w-2 rounded-full bg-mint mt-1"/>}
                </div>
                <h2 className="text-2xl font-black">{build.name}</h2>
                <p className="text-xs text-white/50 font-mono mt-1">{build.version}</p>
                <p className="mt-3 text-sm text-white/65 leading-6">{build.desc}</p>
                <div className="mt-5">
                  {isCurrent
                    ? <span className="rounded-full bg-emerald text-coal px-4 py-2 text-sm font-bold">Active</span>
                    : isQueued
                      ? <button onClick={()=>setQueued(null)} className="rounded-full bg-amber/20 text-amber border border-amber/30 px-4 py-2 text-sm font-bold">Cancel</button>
                      : <button onClick={()=>setQueued(build.id)} className="rounded-full panel-line px-4 py-2 text-sm hover:bg-white/10 transition-colors">Queue install</button>
                  }
                </div>
              </article>
            );
          })}
        </div>
        <div className="panel-line rounded-[28px] p-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-moss mb-3">How installs work</p>
          <p className="text-sm text-white/60 leading-7 max-w-2xl">Queuing sends <code className="text-mint">POST /api/software/install</code>. The backend downloads the jar, swaps the symlink, and schedules a graceful restart. Console WebSocket streams progress in real time.</p>
        </div>
      </div>
    </div>
  );
}
