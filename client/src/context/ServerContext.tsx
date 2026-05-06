import { createContext, useContext, useState, useCallback, ReactNode } from "react";
export type ServerStatus = "online"|"offline"|"starting"|"stopping";
interface ServerContextValue { status: ServerStatus; setStatus:(s:ServerStatus)=>void; togglePower:()=>void; }
const ServerContext = createContext<ServerContextValue|null>(null);
export function ServerProvider({children}:{children:ReactNode}) {
  const [status,setStatus] = useState<ServerStatus>("online");
  const togglePower = useCallback(()=>setStatus(s=>s==="online"?"offline":"online"),[]);
  return <ServerContext.Provider value={{status,setStatus,togglePower}}>{children}</ServerContext.Provider>;
}
export function useServer() { const ctx=useContext(ServerContext); if(!ctx) throw new Error("useServer outside ServerProvider"); return ctx; }
