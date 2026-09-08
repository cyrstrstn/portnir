# PortGuard

PortGuard is a Windows tool for inspecting listening ports and the processes bound to them. It ships as a Rust CLI (`portguard`) and a Tauri desktop app with search, filters, and actions (copy, reveal path, kill PID).

**Not published yet** — local development only; no installer or portable release is available.

## Prerequisites

- **Rust** — [rustup](https://rustup.rs/) (stable). Ensure `%USERPROFILE%\.cargo\bin` is on your `PATH`.
- **Node.js** — LTS recommended (for the desktop UI).
- **WebView2** — Microsoft Edge WebView2 Runtime (usually already installed on Windows 10/11).
- **MSVC** — Visual Studio Build Tools with the C++ workload (required by Tauri on Windows).

## Workspace

- `crates/portguard-core` — shared library (port enumeration, process metadata)
- `crates/portguard-cli` — `portguard` CLI binary
- `apps/desktop` — Tauri + React desktop app

## CLI

From the repo root:

```powershell
cargo run -p portguard-cli -- list
```

## Desktop app (dev)

```powershell
cd apps/desktop; npm install; npm run tauri dev
```

## Local verify

Run core tests and a smoke CLI list:

```powershell
.\scripts\dev-check.ps1
```
