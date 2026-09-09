<div align="center">

# Portnir

### See what is listening on your Windows PC — without drowning in netstat noise.

[![Latest release](https://img.shields.io/github/v/release/cyrstrstn/portnir?style=flat-square&color=b7ff3c)](https://github.com/cyrstrstn/portnir/releases/latest)
[![License: MIT](https://img.shields.io/github/license/cyrstrstn/portnir?style=flat-square)](LICENSE)
[![Windows](https://img.shields.io/badge/Windows-10%20%7C%2011-0078D4?style=flat-square&logo=windows)](https://github.com/cyrstrstn/portnir)
[![No telemetry](https://img.shields.io/badge/telemetry-none-success?style=flat-square)](#privacy-and-safety)
[![Rust + Tauri](https://img.shields.io/badge/stack-Rust%20%2B%20Tauri%202-171815?style=flat-square)](#why-portnir)

**A small, open-source Windows listening-port viewer with a desktop UI, a matching CLI, and zero background services.**

Portnir (port + Norse *-nir*) answers: *which process owns this local port?* Local machine only — no remote scanning, no accounts, no telemetry.

[Build](#build-from-source) · [Desktop](#desktop-app) · [CLI](#commands) · [Privacy](#privacy-and-safety) · [Releases](https://github.com/cyrstrstn/portnir/releases)

</div>

---

## Build from source

Portnir is currently installed by cloning and building. A one-command / portable zip installer is planned for a later release (same idea as [SystemSage](https://github.com/cyrstrstn/systemsage)).

### Prerequisites

| Tool | Purpose |
|---|---|
| [Rust](https://rustup.rs/) (stable) | Core, CLI, Tauri backend — put `%USERPROFILE%\.cargo\bin` on `PATH` |
| [Node.js](https://nodejs.org/) (LTS) | Vite + React UI |
| [WebView2](https://developer.microsoft.com/microsoft-edge/webview2/) | Tauri window (usually already on Windows 10/11) |
| MSVC C++ Build Tools | Link Windows crates (*Desktop development with C++*) |

```powershell
git clone https://github.com/cyrstrstn/portnir.git
cd portnir
$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
```

### Desktop app

```powershell
.\scripts\dev-desktop.ps1
```

This starts Vite and the Tauri window together (stable on Windows). Use the **Portnir** desktop window — do **not** open `http://127.0.0.1:1420` in Chrome; that URL is only the Vite shell and will fail `invoke`.

> [!NOTE]
> Prefer `.\scripts\dev-desktop.ps1` over bare `npm run tauri dev`. On Windows, Tauri can tear down Vite and leave a blank “localhost refused” window.

### CLI

```powershell
cargo run -p portnir-cli -- list
cargo run -p portnir-cli -- check 3000
cargo run -p portnir-cli -- list --json
```

Release CLI binary:

```powershell
cargo build -p portnir-cli --release
# → target\release\portnir.exe
```

### Smoke test

```powershell
.\scripts\dev-check.ps1
```

Expect `PASS core+cli`.

## Why Portnir?

| | Portnir |
|---|---|
| Focus | Listening TCP / UDP binds (not every established connection) |
| UI | Tauri 2 + React desktop app |
| CLI | Matching `portnir` binary |
| Themes | terminal · slate · paper · amber |
| Background service | None |
| Accounts or cloud | None |
| Telemetry | None |
| Kill | Confirm in GUI, or `--yes` on CLI — listener PIDs only |
| License | MIT |

Portnir uses a shared Rust core (`portnir-core`). The GUI and CLI call the same enumeration and kill logic. System WebView2 is used for the UI (not a bundled Electron/Chromium runtime).

## What it shows

- Listening **TCP** endpoints and bound **UDP** sockets
- Local address, port, PID, process name, and image path
- Search across protocol, address, port, process, path, and PID
- Protocol filter (all / TCP / UDP)
- Runtime filter (Node, Python, Java, .NET, PHP, Ruby, Go, Rust)
- Auto-refresh (off / 2s / 5s / 10s)
- **Visit** — open a loopback / private-LAN HTTP URL in the system browser (`0.0.0.0` → `127.0.0.1`)
- **Copy** — clipboard line for the selected listener
- **Folder** — reveal the process path in Explorer
- **Kill** — terminate with confirmation (GUI) or `--yes` (CLI)

## Desktop app

Toolbar:

| Control | Purpose |
|---|---|
| filter | Free-text search |
| proto | all / tcp / udp |
| runtime | Language / runtime heuristics |
| theme | terminal / slate / paper / amber (saved) |
| watch | Auto-refresh interval |
| refresh | Manual sync |

Select a row for **visit**, **copy**, **folder**, and **kill**. Accent-colored local addresses are clickable when visit is allowed.

## Commands

| Command | Purpose |
|---|---|
| `portnir list` | List listening endpoints |
| `portnir list --tcp` | TCP only |
| `portnir list --udp` | UDP only |
| `portnir list --json` | JSON output for scripts |
| `portnir check <port>` | Show owners of a port (or “nothing listening”) |
| `portnir check <port> --json` | JSON for one port |
| `portnir kill <pid> --yes` | Kill a PID that owns a current listener |
| `portnir --help` | Show help |
| `portnir --version` | Print version |

Examples while developing from the repo:

```powershell
cargo run -p portnir-cli -- list --tcp
cargo run -p portnir-cli -- check 135
cargo run -p portnir-cli -- kill 12345 --yes
```

## Privacy and safety

- Every scan runs locally on the current PC.
- Portnir does not upload system information.
- There are no analytics, advertisements, accounts, or tracking identifiers.
- Nothing runs automatically when Windows starts.
- There is no resident agent or background service.
- Enumeration is read-only. Kill only runs when you confirm in the UI or pass `--yes` on the CLI, and only for PIDs that currently own a listening endpoint.
- **Visit** only opens `http(s)` to loopback or private LAN hosts.

## Project structure

```text
apps/desktop/                 Tauri 2 + React + TypeScript UI
crates/portnir-core/          Windows IP Helper enumerate + kill
crates/portnir-cli/           portnir CLI binary
scripts/dev-desktop.ps1       Stable Vite + Tauri launcher
scripts/dev-check.ps1         Core tests + CLI smoke
docs/                         Design notes and plans
```

## Contributing

Issues and pull requests are welcome. Please keep additions aligned with the project principles:

1. Stay focused on local listening ports and clear remediation actions.
2. Prefer Windows-native information sources (IP Helper / process APIs).
3. Keep destructive actions explicit and confirmed.
4. Keep CLI and GUI behavior consistent via `portnir-core`.
5. Never add telemetry or hidden network communication.

## License

Portnir is open source under the [MIT License](LICENSE).

<div align="center">

Built for developers who need to know what is bound — fast.

</div>
