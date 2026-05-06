import { useState } from "react";
import { PageHeader } from "../components/PageHeader";
const TREE = [
  {name:"server root",path:"/"},{name:"plugins",path:"/plugins"},{name:"world",path:"/world"},
  {name:"mods",path:"/mods"},{name:"config",path:"/config"},{name:"backups",path:"/backups"},{name:"logs",path:"/logs"},
];
type F = {name:string;type:string;size:string;modified:string};
const FILES: Record<string,F[]> = {
  "/":       [{name:"server.jar",type:"Executable",size:"46 MB",modified:"Today 15:02"},{name:"server.properties",type:"Config",size:"3 KB",modified:"Today 14:33"},{name:"eula.txt",type:"Text",size:"1 KB",modified:"Yesterday"}],
  "/plugins":[{name:"EssentialsX.jar",type:"Plugin",size:"4.2 MB",modified:"Today 17:02"},{name:"dynmap",type:"Folder",size:"—",modified:"Today 16:15"},{name:"LuckPerms-Bukkit.jar",type:"Plugin",size:"1.6 MB",modified:"Yesterday"},{name:"ViaVersion.jar",type:"Plugin",size:"5.5 MB",modified:"Yesterday"}],
  "/world":  [{name:"level.dat",type:"Data",size:"12 KB",modified:"Today 17:00"},{name:"region",type:"Folder",size:"—",modified:"Today 17:00"}],
  "/logs":   [{name:"latest.log",type:"Log",size:"1.2 MB",modified:"Now"},{name:"2026-05-05-1.log",type:"Log",size:"4.4 MB",modified:"Yesterday"}],
};
export function FilesView() {
  const [activePath,setActivePath] = useState("/plugins");
  const fileList = FILES[activePath]??[];
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <PageHeader title="Files">
        <button className="rounded-full panel-line px-4 py-2 text-sm hover:bg-white/10 transition-colors">Upload</button>
        <button className="rounded-full panel-line px-4 py-2 text-sm hover:bg-white/10 transition-colors">New folder</button>
      </PageHeader>
      <div className="flex-1 overflow-hidden p-4 lg:p-8 grid xl:grid-cols-[260px_1fr] gap-4">
        <aside className="panel-line rounded-[28px] p-5 overflow-auto scrollbar-thin">
          <p className="text-[10px] uppercase tracking-[0.3em] text-moss mb-4">Folder tree</p>
          <ul className="space-y-1">
            {TREE.map(({name,path})=>(
              <li key={path}>
                <button onClick={()=>setActivePath(path)}
                  className={`w-full text-left rounded-2xl px-3 py-2.5 text-sm transition-colors ${activePath===path?"bg-white/10 text-mint font-semibold":"hover:bg-white/5 text-white/65"}`}>
                  └ {name}
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <section className="panel-line rounded-[28px] p-5 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-moss">Path</p>
              <h2 className="text-xl font-bold mt-1 font-mono">{activePath}</h2>
            </div>
          </div>
          <div className="overflow-auto scrollbar-thin rounded-2xl border border-white/8 flex-1">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5 text-white/45 uppercase tracking-[0.22em] text-xs">
                <tr>
                  <th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Size</th><th className="text-left px-4 py-3">Modified</th><th className="px-4 py-3"/>
                </tr>
              </thead>
              <tbody>
                {fileList.length===0
                  ?<tr><td colSpan={5} className="px-4 py-12 text-center text-white/35">This folder is empty.</td></tr>
                  :fileList.map(f=>(
                    <tr key={f.name} className="border-t border-white/6 hover:bg-white/4 transition-colors">
                      <td className="px-4 py-4 font-semibold">{f.name}</td>
                      <td className="px-4 py-4 text-white/55">{f.type}</td>
                      <td className="px-4 py-4 text-white/55 font-mono">{f.size}</td>
                      <td className="px-4 py-4 text-white/55">{f.modified}</td>
                      <td className="px-4 py-4 text-right">
                        <button className="text-xs text-white/35 hover:text-mint transition-colors px-2">Edit</button>
                        <button className="text-xs text-white/35 hover:text-redstone transition-colors px-2">Delete</button>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
