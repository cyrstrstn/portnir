# Portnir

[![Windows](https://img.shields.io/badge/OS-Windows%2010%2F11-0078D4?logo=windows&logoColor=white)](https://github.com/cyrstrstn/portnir)
[![Rust](https://img.shields.io/badge/Rust-1.78%2B-orange?logo=rust)](https://www.rust-lang.org/)
[![Tauri](https://img.shields.io/badge/UI-Tauri%202-24C8DB?logo=tauri&logoColor=white)](https://tauri.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![GitHub](https://img.shields.io/badge/github-cyrstrstn%2Fportnir-181717?logo=github)](https://github.com/cyrstrstn/portnir)

**Portnir** (port + Norse *-nir*) is a fast Windows tool that answers: *what is listening on my machine, and which process owns it?*

Desktop UI + CLI. Local machine only — no remote scanning, no telemetry.

---

## Why Portnir?

| Pain | Portnir |
|------|---------|
| `netstat` noise | Listening endpoints only (TCP listeners + UDP binds) |
| Hard to find Node / Python ports | **Runtime** filter (Node, Python, Java, .NET, PHP, …) |
| Copy PID by hand | Click row → **copy** / **visit** / **folder** / **kill** |
| Ugly one-theme apps | Themes: **terminal** · **slate** · **paper** · **amber** |

---

## Features

- List **TCP listen** + **UDP** endpoints with PID, process name, and image path
- Search by port, process, path, or PID
- Filter by protocol and language runtime
- **Visit** local HTTP URLs in your browser (`0.0.0.0` → `127.0.0.1`)
- **Open** process folder in Explorer
- **Kill** with confirmation (GUI) or `--yes` (CLI) — only PIDs that currently own a listener
- Auto-refresh (2s / 5s / 10s)
- Themes saved in `localStorage`
- Shared Rust core — CLI and GUI stay in sync

---

## Quick start

### Option A — develop from source (recommended today)

```powershell
git clone https://github.com/cyrstrstn/portnir.git
cd portnir
```

**Desktop app**

```powershell
.\scripts\dev-desktop.ps1
```

Opens the **Portnir** window. Do **not** use `http://127.0.0.1:1420` in Chrome — that URL is only the Vite shell for Tauri.

**CLI**

```powershell
# put cargo on PATH if needed
$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"

cargo run -p portnir-cli -- list
cargo run -p portnir-cli -- check 3000
cargo run -p portnir-cli -- list --json
```

### Option B — portable zip / installer

> Not published yet. When you are ready to ship, `npm run tauri build` will produce binaries for a release zip.

---

## Installation (dev prerequisites)

| Tool | Why | Install |
|------|-----|---------|
| **Rust** (stable) | Core + CLI + Tauri backend | [rustup.rs](https://rustup.rs/) — add `%USERPROFILE%\.cargo\bin` to `PATH` |
| **Node.js** (LTS) | Vite + React UI | [nodejs.org](https://nodejs.org/) |
| **WebView2** | Tauri window | [Evergreen Runtime](https://developer.microsoft.com/microsoft-edge/webview2/) (usually already on Win10/11) |
| **MSVC C++ tools** | Link Windows crates | Visual Studio Build Tools → *Desktop development with C++* |

Verify:

```powershell
rustc --version
cargo --version
node --version
npm --version
```

Smoke test:

```powershell
.\scripts\dev-check.ps1
# expect: PASS core+cli
```

---

## CLI reference

Binary name: `portnir`

```text
portnir list [--tcp] [--udp] [--json]
portnir check <port> [--json]
portnir kill <pid> --yes
portnir --help
```

### Examples

```powershell
# Human-readable table
cargo run -p portnir-cli -- list

# Only TCP
cargo run -p portnir-cli -- list --tcp

# Who owns port 135?
cargo run -p portnir-cli -- check 135

# JSON for scripts
cargo run -p portnir-cli -- list --json

# Kill (requires --yes; PID must own a listening endpoint)
cargo run -p portnir-cli -- kill 12345 --yes
```

After `cargo build -p portnir-cli --release`, the binary is at:

```text
target\release\portnir.exe
```

---

## Desktop app guide

1. Run `.\scripts\dev-desktop.ps1`
2. Use the toolbar:
   - **filter** — free text (port, process, path, pid)
   - **proto** — all / tcp / udp
   - **runtime** — Node, Python, Java, .NET, …
   - **theme** — terminal / slate / paper / amber
   - **watch** — auto-refresh interval
3. Click a row for actions:
   - **visit** — open `http://…` in the system browser (TCP loopback / private LAN)
   - **copy** — clipboard line
   - **folder** — Explorer `/select` on the process path
   - **kill** — confirm dialog, then terminate

Green/accent **local** addresses are clickable when visit is allowed.

---

## Project layout

```text
portnir/
├── apps/desktop/          # Tauri 2 + React + TypeScript
├── crates/
│   ├── portnir-core/      # Windows IP Helper enumeration + kill
│   └── portnir-cli/       # portnir CLI
├── scripts/
│   ├── dev-desktop.ps1    # stable Vite + Tauri launcher (Windows)
│   └── dev-check.ps1      # core tests + CLI smoke
├── docs/                  # design / plans
└── README.md
```

---

## Development tips

| Do | Don't |
|----|-------|
| Use `.\scripts\dev-desktop.ps1` | Rely on bare `npm run tauri dev` alone on Windows (Vite can die → blank window) |
| Use the Portnir **desktop window** | Open `:1420` in a normal browser (`invoke` will fail) |
| Keep WebView2 + MSVC installed | Expect Linux/macOS builds (Windows-first for v0) |

Build UI only:

```powershell
cd apps\desktop
npm install
npm run build
```

Check Rust:

```powershell
cargo check -p portnir-core -p portnir-cli -p desktop
cargo test -p portnir-core
```

---

## Security notes

- **Local only** — enumerates this PC; does not scan the network
- **No telemetry** — no outbound analytics from the app
- **Kill** is gated (GUI confirm / CLI `--yes`) and refuses PIDs that are not current listeners
- **Visit** only opens `http(s)` to loopback or private LAN hosts

---

## Roadmap

- [x] Core enumerate + CLI
- [x] Tauri UI + themes + visit
- [ ] Portable release zip (Task 7 / ship when ready)
- [ ] Optional code signing

---

## Contributing

Issues and PRs welcome on [github.com/cyrstrstn/portnir](https://github.com/cyrstrstn/portnir).

1. Fork + branch
2. `.\scripts\dev-check.ps1`
3. Open a PR with what changed and how you tested

---

## License

[MIT](./LICENSE) © Cyrstrstn / Portnir contributors

---

<p align="center">
  <sub>Named for the harbors of the north — watch what binds.</sub>
</p>
