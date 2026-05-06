import { useState } from "react";
import { PageHeader } from "../components/PageHeader";
const MOCK_PLAYERS = [
  { name:"Bao",         world:"Overworld", coords:"82, 64, -119",  ping:12 },
  { name:"PixelForge",  world:"Nether",    coords:"14, 71, 208",   ping:34 },
  { name:"CreeperDent", world:"Spawn",     coords:"-12, 66, 33",   ping:8  },
  { name:"Aurorae",     world:"End",       coords:"0, 65, 0",       ping:21 },
  { name:"StoneMason7", world:"Overworld", coords:"440, 63, -280", ping:55 },
  { name:"VoxelQueen",  world:"Overworld", coords:"-100, 70, 50",  ping:18 },
];
type Action = "kick"|"ban"|"message"|"teleport";
export function PlayersView() {
  const [search,setSearch]   = useState("");
  const [modal,setModal]     = useState<{player:string;action:Action}|null>(null);
  const [inputVal,setInput]  = useState("");
  const filtered = MOCK_PLAYERS.filter(p=>p.name.toLowerCase().includes(search.toLowerCase()));
  const worldColor: Record<string,string> = { Overworld:"text-mint", Nether:"text-redstone", End:"text-purple-400", Spawn:"text-amber" };
  function dismiss() { setModal(null); setInput(""); }
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <PageHeader title="Players">
        <span className="badge px-3 py-2 rounded-full text-xs">{MOCK_PLAYERS.length} online</span>
      </PageHeader>
      <div className="flex-1 overflow-auto scrollbar-thin p-4 lg:p-8 space-y-5">
        <input
          className="w-full max-w-sm rounded-2xl bg-white/5 border border-white/10 px-4 py-3 outline-none focus:border-mint/50 transition-colors text-sm"
          placeholder="Search players…" value={search} onChange={e=>setSearch(e.target.value)} aria-label="Search players"/>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.length===0
            ? <p className="text-white/40 col-span-full text-center py-12">No players match.</p>
            : filtered.map(p=>(
              <article key={p.name} className="panel-line rounded-[28px] p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-bold text-lg">{p.name}</p>
                  <span className="text-xs text-white/40 font-mono">{p.ping}ms</span>
                </div>
                <p className={`text-sm font-semibold ${worldColor[p.world]??"text-white/60"}`}>{p.world}</p>
                <p className="text-xs text-white/50 font-mono mt-1">{p.coords}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(["message","teleport","kick","ban"] as const).map(action=>(
                    <button key={action} onClick={()=>setModal({player:p.name,action})}
                      className="rounded-full px-3 py-1.5 text-xs capitalize transition-colors panel-line hover:bg-white/10">
                      {action}
                    </button>
                  ))}
                </div>
              </article>
            ))
          }
        </div>
      </div>
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={dismiss}>
          <div className="glass rounded-[28px] p-8 w-full max-w-md shadow-panel" onClick={e=>e.stopPropagation()}>
            <p className="text-[10px] uppercase tracking-[0.3em] text-moss mb-2">Player action</p>
            <h3 className="text-xl font-bold mb-1 capitalize">{modal.action} {modal.player}</h3>
            {(modal.action==="kick"||modal.action==="ban"||modal.action==="message") && (
              <label className="block mt-5">
                <span className="block text-sm text-white/70 mb-2">{modal.action==="message"?"Message":"Reason"}</span>
                <input className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 outline-none focus:border-mint/50 transition-colors"
                  value={inputVal} onChange={e=>setInput(e.target.value)} autoFocus/>
              </label>
            )}
            {modal.action==="teleport" && (
              <p className="mt-4 text-sm text-white/60">Teleport to {modal.player} in {MOCK_PLAYERS.find(p=>p.name===modal.player)?.world}?</p>
            )}
            <div className="mt-6 flex gap-3">
              <button onClick={dismiss}
                className={`flex-1 rounded-2xl py-3 font-bold transition-colors ${modal.action==="ban"||modal.action==="kick"?"bg-redstone text-white":"bg-emerald text-coal hover:bg-mint"}`}>
                Confirm
              </button>
              <button onClick={dismiss} className="flex-1 rounded-2xl py-3 panel-line hover:bg-white/10 transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
