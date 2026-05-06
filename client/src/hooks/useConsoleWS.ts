import { useEffect, useRef, useState } from "react";
export function useConsoleWS() {
  const [lines,setLines] = useState<string[]>([]);
  const wsRef = useRef<WebSocket|null>(null);
  useEffect(()=>{
    const proto = window.location.protocol==="https:"?"wss":"ws";
    const ws = new WebSocket(`${proto}://${window.location.host}/api/console-ws`);
    wsRef.current = ws;
    ws.onopen    = ()=>setLines(p=>[...p,"[ws] Connected to /api/console-ws"]);
    ws.onmessage = (e)=>setLines(p=>[...p.slice(-999),e.data]);
    ws.onerror   = ()=>setLines(p=>[...p,"[ws] Connection error"]);
    ws.onclose   = ()=>setLines(p=>[...p,"[ws] Disconnected"]);
    return ()=>ws.close();
  },[]);
  function send(cmd:string) {
    if(wsRef.current?.readyState===WebSocket.OPEN){ wsRef.current.send(JSON.stringify({command:cmd})); setLines(p=>[...p,`> ${cmd}`]); }
    else setLines(p=>[...p,`[offline] > ${cmd}`]);
  }
  return {lines,send};
}
