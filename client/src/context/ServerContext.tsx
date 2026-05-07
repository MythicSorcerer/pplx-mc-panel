import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Status = "online"|"offline"|"starting"|"stopping";
interface Metrics { cpu:number; ram:number; disk:number; uptime:number; }
interface SoftwareInfo { type:string; version:string; }
interface ServerCtx {
  status:Status; setStatus:(s:Status)=>void; togglePower:()=>void;
  metrics:Metrics|null; software:SoftwareInfo|null;
}

const ServerContext = createContext<ServerCtx|null>(null);

const mapStatus = (s:string): Status =>
  s==="running"||s==="online" ? "online" :
  s==="starting" ? "starting" :
  s==="stopping" ? "stopping" : "offline";

export function ServerProvider({ children }:{ children:React.ReactNode }) {
  const [status, setStatus]   = useState<Status>("offline");
  const [metrics, setMetrics] = useState<Metrics|null>(null);
  const [software, setSoftware] = useState<SoftwareInfo|null>(null);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const r = await fetch("/api/server/status", { credentials: "include" });
        if (!cancelled && r.ok) {
          const data = await r.json();
          setStatus(mapStatus(data.status));
        }
      } catch {}
      if (!cancelled) setTimeout(poll, 5000);
    }
    poll();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchMetrics() {
      try {
        const r = await fetch("/api/metrics", { credentials: "include" });
        if (!cancelled && r.ok) {
          const data = await r.json();
          setMetrics({ cpu: data.cpu, ram: data.ram, disk: data.disk, uptime: data.uptime });
        }
      } catch {}
      if (!cancelled) setTimeout(fetchMetrics, 10000);
    }
    fetchMetrics();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    fetch("/api/software/current", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data.type && data.type !== "none") {
          setSoftware({ type: data.type, version: data.version ?? "" });
        }
      })
      .catch(() => {});
  }, []);

  const togglePower = useCallback(async () => {
    try {
      const endpoint = status==="online" ? "/api/server/stop" : "/api/server/start";
      await fetch(endpoint, { method: "POST", credentials: "include" });
      setStatus(status==="online" ? "stopping" : "starting");
    } catch {}
  }, [status]);

  return <ServerContext.Provider value={{status,setStatus,togglePower,metrics,software}}>{children}</ServerContext.Provider>;
}

export function useServer() { const ctx=useContext(ServerContext); if(!ctx) throw new Error("useServer outside ServerProvider"); return ctx; }
