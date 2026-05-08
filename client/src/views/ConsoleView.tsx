import { useEffect, useRef, useState, FormEvent } from "react";
import { PageHeader } from "../components/PageHeader";
import { useConsoleWS } from "../hooks/useConsoleWS";
import { useServer } from "../context/ServerContext";

const PRESETS = ["list","save-all","whitelist reload","say Welcome!","time set day","weather clear","difficulty hard"];

export function ConsoleView() {
  const { lines, send } = useConsoleWS();
  const { status, togglePower } = useServer();
  const [input, setInput]         = useState("");
  const [autoSend, setAutoSend]   = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  const isOnline = status === "online";
  const isTransitioning = status === "starting" || status === "stopping";

  async function handleStart() {
    if (!isOnline && !isTransitioning) {
      await fetch("/api/server/start", { method: "POST", credentials: "include" });
    }
  }
  async function handleStop() {
    if (isOnline) {
      await fetch("/api/server/stop", { method: "POST", credentials: "include" });
    }
  }
  async function handleRestart() {
    if (isOnline) {
      await fetch("/api/server/restart", { method: "POST", credentials: "include" });
    }
  }

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [lines]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const cmd = input.trim();
    if (!cmd) return;
    send(cmd);
    setInput("");
  }

  function handlePreset(cmd: string) {
    if (autoSend) {
      send(cmd);
    } else {
      setInput(cmd);
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <PageHeader title="Console">
        <div className="flex items-center gap-2">
          <button
            onClick={handleStart}
            disabled={isOnline || isTransitioning}
            className="rounded-full px-3 py-1.5 text-xs font-bold bg-emerald text-coal hover:bg-mint disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Start
          </button>
          <button
            onClick={handleRestart}
            disabled={!isOnline}
            className="rounded-full px-3 py-1.5 text-xs font-bold bg-amber-500 text-coal hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Restart
          </button>
          <button
            onClick={handleStop}
            disabled={!isOnline}
            className="rounded-full px-3 py-1.5 text-xs font-bold bg-redstone text-white hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Stop
          </button>
          <span className="badge px-3 py-2 rounded-full text-xs font-mono">/api/console-ws</span>
        </div>
      </PageHeader>
      <div className="flex-1 overflow-hidden p-4 lg:p-8 grid xl:grid-cols-[1fr_280px] gap-4">
        <section className="terminal rounded-[28px] p-5 flex flex-col min-h-[400px]">
          <div className="mb-4 flex-shrink-0">
            <p className="text-[10px] uppercase tracking-[0.3em] text-moss">Live output</p>
            <h2 className="text-xl font-bold text-white mt-1">Server console</h2>
          </div>
          <div ref={outputRef} className="flex-1 overflow-auto whitespace-pre-wrap text-sm leading-7 scrollbar-thin pr-2" aria-live="polite">
            {lines.length === 0 ? "[panel] Connecting to /api/console-ws\u2026" : lines.join("\n")}
          </div>
          <form onSubmit={handleSubmit} className="mt-4 flex gap-3 flex-shrink-0">
            <input
              className="flex-1 rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white outline-none focus:border-mint/50 transition-colors font-mono text-sm"
              placeholder="say Hello world"
              value={input}
              onChange={e => setInput(e.target.value)}
              aria-label="Console command input"
            />
            <button className="rounded-2xl bg-emerald text-coal px-5 font-bold hover:bg-mint transition-colors" type="submit">Send</button>
          </form>
        </section>

        <aside className="panel-line rounded-[28px] p-5 overflow-auto scrollbar-thin flex flex-col gap-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] uppercase tracking-[0.3em] text-moss">Presets</p>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 accent-emerald"
                  checked={autoSend}
                  onChange={e => setAutoSend(e.target.checked)}
                />
                <span className="text-[10px] uppercase tracking-[0.2em] text-moss">Auto-send</span>
              </label>
            </div>
            <div className="grid gap-2">
              {PRESETS.map(cmd => (
                <button
                  key={cmd}
                  onClick={() => handlePreset(cmd)}
                  className="rounded-2xl bg-white/5 hover:bg-white/10 px-4 py-3 text-left font-mono text-sm transition-colors"
                >
                  {cmd}
                </button>
              ))}
            </div>
          </div>
          <div className="panel-line rounded-2xl p-4 text-xs text-white/55 space-y-2 mt-auto">
            <p className="font-semibold text-white text-sm">xterm.js ready</p>
            <p>Swap the output div with a Terminal instance and pipe the WebSocket directly.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
