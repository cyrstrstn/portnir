# PortGuard — Design Spec

Date: 2026-09-08  
Status: draft for user review  
Ship: **build now, public release later** (no store, no signed installer required for v0)

## Summary

PortGuard is a Windows security utility that shows **local listening ports** — which processes accept inbound connections — with a polished desktop UI and a matching CLI. Users can inspect a row, **copy** details, **open** the process folder, or **kill** the process (with confirmation).

Local machine only. No port-scanning of other hosts. No telemetry.

## Goals

1. Answer “what is listening on my PC?” in seconds.
2. Answer “what owns port X?” from GUI or terminal.
3. Allow safe remediation: kill / open folder / copy.
4. Distribute later as a **small portable** Windows build (zip + exe), not an Electron-sized bundle.

## Non-goals (v0)

- Scanning remote IPs / LAN discovery / nmap-style sweeps
- Firewall rule editing
- Auto-kill heuristics / background agent
- macOS / Linux (Windows-first; other OS later if wanted)
- Code signing, auto-update, store listing (ship-later phase)

## Users

- Developer / power user checking unexpected listeners
- Portfolio visitor — clear screenshots, serious security angle
- Future: share portable zip without installer friction

## Product name

Working title: **PortGuard**  
CLI binary name: `portguard`  
Window title: PortGuard

## Feature set (v0)

### Listening view (default)

Show current **LISTEN** endpoints only:

| Column | Source |
|--------|--------|
| Protocol | TCP / UDP |
| Local address | IP + port (e.g. `0.0.0.0:445`, `[::]:135`) |
| Port | numeric, sortable/filterable |
| PID | owning process id |
| Process | executable name |
| Path | full image path when resolvable |
| Company | optional version-info CompanyName when available |

### Search / filter

- Text filter across process, path, port, address
- Optional protocol filter: All / TCP / UDP

### Actions (per row)

1. **Copy** — clipboard line: `TCP 0.0.0.0:445 pid=4 System` (stable format)
2. **Open folder** — Explorer select on process path (disabled if path unknown)
3. **Kill** — confirm dialog with process name + PID; then terminate; refresh list  
   - If access denied: clear error (“run as Administrator may be required”)

### Refresh

- Manual Refresh button
- Optional auto-refresh interval (default **Off**; presets 2s / 5s / 10s)

### CLI (same Rust core)

```text
portguard list [--tcp] [--udp] [--json]
portguard check <port> [--json]
portguard kill <pid> --yes
portguard --help
```

- `list` — listening only  
- `check 445` — show listener(s) on that port or “nothing listening”  
- `kill` — requires `--yes` (no interactive confirm in non-TTY)

### GUI entry

- `PortGuard.exe` launches UI  
- Optional: `PortGuard.exe --cli …` or ship `portguard.exe` CLI beside GUI in portable zip (prefer **second small CLI binary** or Tauri sidecar — decide at implement time; both call shared Rust lib)

## UX layout

```text
┌─────────────────────────────────────────────────────────┐
│ PortGuard                    [Auto: Off ▾] [Refresh]    │
│ Search: [____________________]  Protocol: [All ▾]       │
├─────────────────────────────────────────────────────────┤
│ Proto │ Address:Port     │ PID  │ Process │ Path        │
│ ... table ...                                           │
├─────────────────────────────────────────────────────────┤
│ Detail: path / company                                  │
│ [Copy]  [Open folder]  [Kill…]     Listeners: N         │
└─────────────────────────────────────────────────────────┘
```

Visual direction: dark, calm, security-tool — not purple SaaS gradient. Clear density, readable mono for addresses/ports. Motion minimal (row select, refresh feedback only).

## Architecture

```text
┌─────────────┐     commands      ┌──────────────────┐
│ React (UI)  │ ←──────────────→  │ Tauri commands   │
└─────────────┘                   │ (Rust)           │
                                  └────────┬─────────┘
                                           │
                                  ┌────────▼─────────┐
                                  │ portguard_core   │
                                  │ enumerate / kill │
                                  │ / resolve path   │
                                  └────────┬─────────┘
                                           │
                                  ┌────────▼─────────┐
                                  │ CLI binary       │
                                  │ (same core)      │
                                  └──────────────────┘
```

### Stack

- **Tauri 2** + **React** + **TypeScript** + **Vite**
- **Rust** core crate: Windows IP Helper APIs
  - TCP: `GetExtendedTcpTable` (owner PID)
  - UDP: `GetExtendedUdpTable` (owner PID)
  - Process path: `QueryFullProcessImageName` / `OpenProcess`
  - Kill: `TerminateProcess` after open with appropriate access
- System **WebView2** (not bundled) to keep download small

### Data flow

1. UI/CLI calls `list_listeners()`  
2. Core queries OS tables → Vec\<Listener\>  
3. Enrich with process name/path/company  
4. UI renders; actions call `kill_pid`, `reveal_in_explorer`, copy via frontend clipboard API

### Error handling

- Enumeration failure → toast / CLI stderr, non-zero exit
- Kill access denied → explicit message, no crash
- Missing path → disable Open folder
- WebView2 missing → Tauri/Windows message; README notes Win10/11 + WebView2

## Packaging (ship-later)

When releasing:

1. Build portable zip: `PortGuard-Windows-portable.zip`
2. Contents: `PortGuard.exe`, `portguard.exe` (CLI), `LICENSE`, short `README.txt`
3. Target compressed size: **prefer under ~10 MB** (WebView2 external)
4. No mandatory installer; optional NSIS later
5. No auto-update in v0

Until then: local `npm`/`cargo` dev only.

## Security & privacy

- Read-only by default (list/check)
- Destructive only via explicit Kill + confirm / `--yes`
- No network calls by the app itself
- No analytics
- Do not log process command lines to disk by default

## Testing

- Unit: parse/filter helpers; port match for `check`
- Manual: known listeners (e.g. 135, 445, or a local `python -m http.server`)
- Kill against disposable test process only
- CLI JSON shape stable for scripts

## Repo layout (planned)

```text
portguard/
  docs/superpowers/specs/2026-09-08-portguard-design.md
  apps/desktop/          # Tauri + React
  crates/portguard-core/ # shared Rust
  crates/portguard-cli/  # CLI
  README.md              # added when scaffolding
```

## Success criteria (v0 local)

1. GUI lists listening TCP/UDP with PID/process/path  
2. Search filters the table  
3. Copy / Open folder / Kill work with confirm on kill  
4. `portguard check <port>` works in terminal  
5. Dev build runs on Windows 10/11 without publishing  

## Open decisions (resolve during implement if needed)

- Single exe vs GUI+CLI two binaries in zip (lean toward **two binaries**, shared core)  
- Exact visual theme tokens (set during UI pass)

## Approval

User approved product direction (listening-only, actions set, Tauri+React, portable-small, build-first).  
This written spec awaits **user review** before implementation planning.
