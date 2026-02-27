import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import {
  LayoutDashboard,
  FlaskConical,
  Play,
  Settings as SettingsIcon,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useWebSocket } from "./hooks/useWebSocket";
import Dashboard from "./pages/Dashboard";
import NewTestRun from "./pages/NewTestRun";
import TestRunLive from "./pages/TestRunLive";
import SettingsPage from "./pages/Settings";

export default function App() {
  const { isConnected, events, clearEvents } = useWebSocket();

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="sidebar-logo-icon">🤖</span>
            <div className="sidebar-logo-text">
              AI <span>QA Agent</span>
            </div>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Menu</div>
          <nav className="sidebar-nav">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `sidebar-nav-item${isActive ? " active" : ""}`
              }
            >
              <LayoutDashboard />
              Dashboard
            </NavLink>
            <NavLink
              to="/new-test"
              className={({ isActive }) =>
                `sidebar-nav-item${isActive ? " active" : ""}`
              }
            >
              <FlaskConical />
              New Test
            </NavLink>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `sidebar-nav-item${isActive ? " active" : ""}`
              }
            >
              <SettingsIcon />
              Settings
            </NavLink>
          </nav>
        </div>

        <div style={{ flex: 1 }} />

        <div className="sidebar-section">
          <div
            className="sidebar-nav-item"
            style={{ cursor: "default", justifyContent: "center" }}
          >
            {isConnected ? (
              <>
                <Wifi size={14} style={{ color: "var(--accent-success)" }} />
                <span
                  style={{ color: "var(--accent-success)", fontSize: "0.8rem" }}
                >
                  Connected
                </span>
              </>
            ) : (
              <>
                <WifiOff size={14} style={{ color: "var(--accent-danger)" }} />
                <span
                  style={{ color: "var(--accent-danger)", fontSize: "0.8rem" }}
                >
                  Disconnected
                </span>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/new-test" element={<NewTestRun />} />
          <Route
            path="/run/:runId"
            element={<TestRunLive events={events} clearEvents={clearEvents} />}
          />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}
