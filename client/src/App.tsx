import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ServerProvider } from "./context/ServerContext";
import { Sidebar } from "./components/Sidebar";
import { LoginView } from "./views/LoginView";
import OverviewView from "./views/OverviewView";
import { ConsoleView } from "./views/ConsoleView";
import { FilesView } from "./views/FilesView";
import SoftwareView from "./views/SoftwareView";
import { ConfigView } from "./views/ConfigView";
import PlayersView from "./views/PlayersView";
import { SettingsView } from "./views/SettingsView";

function Shell() {
  const { authed } = useAuth();
  if (!authed) return <LoginView />;
  return (
    <ServerProvider>
      <div className="min-h-screen p-4 lg:p-6 grid lg:grid-cols-[280px_1fr] gap-4 lg:gap-6">
        <Sidebar />
        <main className="glass rounded-[28px] overflow-hidden flex flex-col min-h-[92vh]">
          <Routes>
            <Route path="/"         element={<OverviewView />} />
            <Route path="/console"  element={<ConsoleView />} />
            <Route path="/files"    element={<FilesView />} />
            <Route path="/software" element={<SoftwareView />} />
            <Route path="/config"   element={<ConfigView />} />
            <Route path="/players"  element={<PlayersView />} />
            <Route path="/settings" element={<SettingsView />} />
            <Route path="*"         element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </ServerProvider>
  );
}
export default function App() {
  return <AuthProvider><BrowserRouter><Shell /></BrowserRouter></AuthProvider>;
}
