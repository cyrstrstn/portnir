import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Listener } from "./types";
import "./App.css";

type ProtocolFilter = "all" | "TCP" | "UDP";
type RefreshInterval = 0 | 2000 | 5000 | 10000;

function formatCopyLine(row: Listener): string {
  return `${row.protocol} ${row.localAddr} pid=${row.pid} ${row.processName}`;
}

function App() {
  const [listeners, setListeners] = useState<Listener[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [protocol, setProtocol] = useState<ProtocolFilter>("all");
  const [refreshMs, setRefreshMs] = useState<RefreshInterval>(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await invoke<Listener[]>("list_listeners");
      setListeners(rows);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (refreshMs === 0) return;
    const id = window.setInterval(() => {
      void refresh();
    }, refreshMs);
    return () => window.clearInterval(id);
  }, [refreshMs, refresh]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return listeners.filter((row) => {
      if (protocol !== "all" && row.protocol.toUpperCase() !== protocol) {
        return false;
      }
      if (!q) return true;
      const hay = [
        row.protocol,
        row.localAddr,
        String(row.port),
        row.processName,
        row.path ?? "",
        row.company ?? "",
        String(row.pid),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [listeners, search, protocol]);

  const selected = useMemo(() => {
    if (!selectedKey) return null;
    return (
      filtered.find(
        (r) => `${r.protocol}:${r.localAddr}:${r.pid}` === selectedKey,
      ) ?? null
    );
  }, [filtered, selectedKey]);

  async function onCopy(row: Listener) {
    await navigator.clipboard.writeText(formatCopyLine(row));
  }

  async function onOpenFolder(row: Listener) {
    if (!row.path) return;
    try {
      await invoke("reveal_path", { path: row.path });
    } catch (e) {
      setError(String(e));
    }
  }

  async function onKill(row: Listener) {
    const ok = window.confirm(
      `Kill process ${row.processName} (PID ${row.pid})?`,
    );
    if (!ok) return;
    try {
      await invoke("kill_pid", { pid: row.pid });
      await refresh();
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <div className="app">
      <header className="toolbar">
        <div className="brand">PortGuard</div>
        <input
          className="search"
          type="search"
          placeholder="Search protocol, addr, port, process, path…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="field">
          <span>Protocol</span>
          <select
            value={protocol}
            onChange={(e) => setProtocol(e.target.value as ProtocolFilter)}
          >
            <option value="all">All</option>
            <option value="TCP">TCP</option>
            <option value="UDP">UDP</option>
          </select>
        </label>
        <label className="field">
          <span>Auto-refresh</span>
          <select
            value={refreshMs}
            onChange={(e) =>
              setRefreshMs(Number(e.target.value) as RefreshInterval)
            }
          >
            <option value={0}>Off</option>
            <option value={2000}>2s</option>
            <option value={5000}>5s</option>
            <option value={10000}>10s</option>
          </select>
        </label>
        <button type="button" onClick={() => void refresh()} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {error ? <div className="error">{error}</div> : null}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Protocol</th>
              <th>Local address</th>
              <th>Port</th>
              <th>PID</th>
              <th>Process</th>
              <th>Path</th>
              <th>Company</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const key = `${row.protocol}:${row.localAddr}:${row.pid}`;
              return (
                <tr
                  key={key}
                  className={selectedKey === key ? "selected" : undefined}
                  onClick={() => setSelectedKey(key)}
                >
                  <td>{row.protocol}</td>
                  <td>{row.localAddr}</td>
                  <td>{row.port}</td>
                  <td>{row.pid}</td>
                  <td>{row.processName}</td>
                  <td className="path-cell" title={row.path ?? ""}>
                    {row.path ?? "—"}
                  </td>
                  <td>{row.company ?? "—"}</td>
                </tr>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty">
                  No listeners match.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <section className="detail">
        {selected ? (
          <>
            <div className="detail-text">
              <strong>
                {selected.protocol} {selected.localAddr}
              </strong>
              <span>
                pid={selected.pid} · {selected.processName}
                {selected.company ? ` · ${selected.company}` : ""}
              </span>
              {selected.path ? <span className="mono">{selected.path}</span> : null}
            </div>
            <div className="actions">
              <button type="button" onClick={() => void onCopy(selected)}>
                Copy
              </button>
              <button
                type="button"
                disabled={!selected.path}
                onClick={() => void onOpenFolder(selected)}
              >
                Open folder
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => void onKill(selected)}
              >
                Kill
              </button>
            </div>
          </>
        ) : (
          <p className="muted">Select a row for details and actions.</p>
        )}
      </section>

      <footer className="footer">
        {filtered.length} listener{filtered.length === 1 ? "" : "s"}
        {filtered.length !== listeners.length
          ? ` (of ${listeners.length})`
          : ""}
      </footer>
    </div>
  );
}

export default App;
