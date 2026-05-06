import { useState, FormEvent } from "react";
import { PageHeader } from "../components/PageHeader";
interface ServerProps { motd:string; maxPlayers:number; difficulty:string; viewDistance:number; whitelist:boolean; nether:boolean; pvp:boolean; }
const DEFAULT: ServerProps = { motd:"Voxel SMP • Be kind, build boldly", maxPlayers:30, difficulty:"Normal", viewDistance:12, whitelist:true, nether:true, pvp:true };
export function ConfigView() {
  const [form,setForm] = useState<ServerProps>(DEFAULT);
  const [saved,setSaved] = useState(false);
  function set<K extends keyof ServerProps>(key:K, val:ServerProps[K]) { setForm(p=>({...p,[key]:val})); setSaved(false); }
  async function handleSubmit(e:FormEvent) {
    e.preventDefault();
    await fetch("/api/config/server-properties",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify(form)}).catch(()=>null);
    setSaved(true); setTimeout(()=>setSaved(false),3000);
  }
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <PageHeader title="Configuration">
        {saved && <span className="badge border-mint/30 bg-mint/10 text-mint px-4 py-2 rounded-full text-sm">Saved</span>}
      </PageHeader>
      <div className="flex-1 overflow-auto scrollbar-thin p-4 lg:p-8">
        <div className="grid xl:grid-cols-[1fr_280px] gap-4">
          <form onSubmit={handleSubmit} className="panel-line rounded-[28px] p-6 space-y-5">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-moss">server.properties</p>
              <h2 className="text-xl font-bold mt-1">Server configuration</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-sm text-white/80 mb-2">MOTD</span>
                <input className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 outline-none focus:border-mint/50 transition-colors"
                  value={form.motd} onChange={e=>set("motd",e.target.value)}/>
              </label>
              <label className="block">
                <span className="block text-sm text-white/80 mb-2">Max players</span>
                <input className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 outline-none focus:border-mint/50 transition-colors"
                  type="number" value={form.maxPlayers} onChange={e=>set("maxPlayers",Number(e.target.value))}/>
              </label>
              <label className="block">
                <span className="block text-sm text-white/80 mb-2">Difficulty</span>
                <select className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 outline-none focus:border-mint/50 transition-colors"
                  value={form.difficulty} onChange={e=>set("difficulty",e.target.value)}>
                  {["Peaceful","Easy","Normal","Hard"].map(d=><option key={d}>{d}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="block text-sm text-white/80 mb-2">View distance</span>
                <input className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 outline-none focus:border-mint/50 transition-colors"
                  type="number" min={4} max={32} value={form.viewDistance} onChange={e=>set("viewDistance",Number(e.target.value))}/>
              </label>
            </div>
            {([{key:"whitelist" as const,label:"Enable whitelist"},{key:"nether" as const,label:"Allow Nether"},{key:"pvp" as const,label:"Enable PvP"}]).map(({key,label})=>(
              <label key={key} className="flex items-center justify-between rounded-2xl bg-white/5 border border-white/8 p-4 cursor-pointer hover:bg-white/8 transition-colors">
                <span className="text-sm">{label}</span>
                <input type="checkbox" className="h-5 w-5 accent-emerald" checked={form[key]} onChange={e=>set(key,e.target.checked)}/>
              </label>
            ))}
            <button type="submit" className="rounded-2xl bg-emerald text-coal px-5 py-3 font-bold hover:bg-mint transition-colors">Save changes</button>
          </form>
          <aside className="panel-line rounded-[28px] p-6 text-sm text-white/55 space-y-3 h-fit">
            <p className="text-[10px] uppercase tracking-[0.3em] text-moss">Notes</p>
            <p>POSTs to <code className="text-mint">/api/config/server-properties</code>.</p>
            <p>Extend <code className="text-mint">ServerProps</code> to add more fields from your backend schema.</p>
            <p>Changes take effect on next server restart unless your backend applies them live.</p>
          </aside>
        </div>
      </div>
    </div>
  );
}
