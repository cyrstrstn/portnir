import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import type { Listener } from "./types";
import {
  matchesRuntime,
  RUNTIME_OPTIONS,
  type RuntimeFilter,
} from "./runtimes";
import { visitUrlForListener } from "./visit";
import {
  applyTheme,
  loadTheme,
  saveTheme,
  THEME_OPTIONS,
  type ThemeId,
} from "./themes";
import "./App.css";

type ProtocolFilter = "all" | "TCP" | "UDP";
type RefreshInterval = 0 | 2000 | 5000 | 10000;

function formatCopyLine(row: Listener): string {
  return `${row.protocol} ${row.localAddr} pid=${row.pid} ${row.processName}`;
}

function App() {
  const [listeners, setListeners] = useState<Listener[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [protocol, setProtocol] = useState<ProtocolFilter>("all");
  const [runtime, setRuntime] = useState<RuntimeFilter>("all");
  const [theme, setTheme] = useState<ThemeId>(() => loadTheme());
  const [refreshMs, setRefreshMs] = useState<RefreshInterval>(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const inDesktop = isTauri();

  useEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
  }, [theme]);

  const refresh = useCallback(async () => {
    if (!isTauri()) {
      setError(
        "Open the Portnir desktop window (not a browser tab). Run: .\\scripts\\dev-desktop.ps1",
      );
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await invoke<Listener[]>("list_listeners");
      setListeners(rows);
      setStatus(`synced ${rows.length} listeners`);
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
      if (!matchesRuntime(runtime, row.processName, row.path)) {
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
  }, [listeners, search, protocol, runtime]);

  const selected = useMemo(() => {
    if (!selectedKey) return null;
    return (
      filtered.find(
        (r, index) =>
          `${r.protocol}:${r.localAddr}:${r.pid}:${index}` === selectedKey,
      ) ?? null
    );
  }, [filtered, selectedKey]);

  const selectedVisitUrl = selected ? visitUrlForListener(selected) : null;

  async function onCopy(row: Listener) {
    try {
      await navigator.clipboard.writeText(formatCopyLine(row));
      setStatus("copied");
    } catch (e) {
      setError(String(e));
    }
  }

  async function onOpenFolder(row: Listener) {
    if (!row.path) return;
    try {
      await invoke("reveal_path", { path: row.path });
      setStatus("opened folder");
    } catch (e) {
      setError(String(e));
    }
  }

  async function onVisit(row: Listener) {
    const url = visitUrlForListener(row);
    if (!url) return;
    try {
      await invoke("open_http_url", { url });
      setStatus(`visit ${url}`);
    } catch (e) {
      setError(String(e));
    }
  }

  async function onKill(row: Listener) {
    const ok = window.confirm(
      `Kill ${row.processName} (PID ${row.pid})?\n${row.localAddr}`,
    );
    if (!ok) return;
    try {
      await invoke("kill_pid", { pid: row.pid });
      setStatus(`killed pid ${row.pid}`);
      await refresh();
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <div className="app">
      <div className="scanlines" aria-hidden />
      <header className="toolbar">
        <div className="brand" title="Portnir - Norse port watcher">
          <span className="prompt">$</span>
          <span className="brand-name">portnir</span>
          <span className="brand-tag">dev</span>
        </div>
        <input
          className="search"
          type="search"
          placeholder="filter: port | process | path | pid"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          spellCheck={false}
        />
        <label className="field">
          <span>proto</span>
          <select
            value={protocol}
            onChange={(e) => setProtocol(e.target.value as ProtocolFilter)}
          >
            <option value="all">all</option>
            <option value="TCP">tcp</option>
            <option value="UDP">udp</option>
          </select>
        </label>
        <label className="field">
          <span>runtime</span>
          <select
            value={runtime}
            onChange={(e) => setRuntime(e.target.value as RuntimeFilter)}
          >
            {RUNTIME_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label.toLowerCase()}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>theme</span>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as ThemeId)}
          >
            {THEME_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>watch</span>
          <select
            value={refreshMs}
            onChange={(e) =>
              setRefreshMs(Number(e.target.value) as RefreshInterval)
            }
          >
            <option value={0}>off</option>
            <option value={2000}>2s</option>
            <option value={5000}>5s</option>
            <option value={10000}>10s</option>
          </select>
        </label>
        <button type="button" onClick={() => void refresh()} disabled={loading}>
          {loading ? "sync..." : "refresh"}
        </button>
      </header>

      <div className="hintbar">
        <span>
          tip: runtime=node - click <em>local</em> or <kbd>visit</kbd> - kill
          needs confirm - try themes
        </span>
        {status ? <span className="hint-status">{status}</span> : null}
      </div>

      {error ? <div className="error">! {error}</div> : null}
      {!inDesktop ? (
        <div className="error">
          ! shell only - run <code>.\scripts\dev-desktop.ps1</code> and use the
          Portnir window
        </div>
      ) : null}

      <div className="table-wrap">
        <div className="panel-label">
          <span>listeners</span>
          <span className="panel-count">
            {filtered.length}
            {filtered.length !== listeners.length
              ? ` / ${listeners.length}`
              : ""}
          </span>
        </div>
        <table>
          <thead>
            <tr>
              <th>proto</th>
              <th>local</th>
              <th>port</th>
              <th>pid</th>
              <th>process</th>
              <th>path</th>
              <th>company</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, index) => {
              const key = `${row.protocol}:${row.localAddr}:${row.pid}:${index}`;
              const visit = visitUrlForListener(row);
              return (
                <tr
                  key={key}
                  className={selectedKey === key ? "selected" : undefined}
                  onClick={() => setSelectedKey(key)}
                >
                  <td className="proto">{row.protocol.toLowerCase()}</td>
                  <td className="addr">
                    {visit ? (
                      <button
                        type="button"
                        className="linkish"
                        title={`Visit ${visit}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedKey(key);
                          void onVisit(row);
                        }}
                      >
                        {row.localAddr}
                      </button>
                    ) : (
                      row.localAddr
                    )}
                  </td>
                  <td>{row.port}</td>
                  <td>{row.pid}</td>
                  <td>{row.processName}</td>
                  <td className="path-cell" title={row.path ?? ""}>
                    {row.path ?? "-"}
                  </td>
                  <td>{row.company ?? "-"}</td>
                </tr>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty">
                  (no matches - clear filters or hit refresh)
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
                {selected.protocol.toLowerCase()} {selected.localAddr}
              </strong>
              <span>
                pid={selected.pid} - {selected.processName}
                {selected.company ? ` - ${selected.company}` : ""}
              </span>
              {selectedVisitUrl ? (
                <span className="mono visit-hint">{selectedVisitUrl}</span>
              ) : (
                <span className="mono">visit: n/a (tcp loopback/lan only)</span>
              )}
              {selected.path ? (
                <span className="mono">{selected.path}</span>
              ) : null}
            </div>
            <div className="actions">
              <button
                type="button"
                className="primary"
                disabled={!selectedVisitUrl}
                title={
                  selectedVisitUrl
                    ? `Open ${selectedVisitUrl}`
                    : "TCP loopback/LAN only"
                }
                onClick={() => void onVisit(selected)}
              >
                visit
              </button>
              <button type="button" onClick={() => void onCopy(selected)}>
                copy
              </button>
              <button
                type="button"
                disabled={!selected.path}
                onClick={() => void onOpenFolder(selected)}
              >
                folder
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => void onKill(selected)}
              >
                kill
              </button>
            </div>
          </>
        ) : (
          <p className="muted">
            # select a row - visit | copy | folder | kill
          </p>
        )}
      </section>

      <footer className="footer">
        <span>
          {filtered.length} shown
          {filtered.length !== listeners.length
            ? ` / ${listeners.length} total`
            : ""}
        </span>
        <span className="footer-hint">accent local = clickable visit</span>
      </footer>
    </div>
  );
}

export default App;
