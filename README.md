# Portnir

Norse-flavored Windows tool for inspecting **listening ports** and the processes bound to them. Rust CLI (`portnir`) + Tauri desktop UI (search, runtime filters, visit / copy / folder / kill).

**Not published yet** — local development only.

## Prerequisites

- **Rust** — [rustup](https://rustup.rs/) (stable). Put `%USERPROFILE%\.cargo\bin` on `PATH`.
- **Node.js** — LTS (desktop UI).
- **WebView2** — Edge WebView2 Runtime.
- **MSVC** — VS Build Tools with C++ workload.

## Workspace

- `crates/portnir-core` — shared library
- `crates/portnir-cli` — `portnir` CLI
- `apps/desktop` — Tauri + React app

## Desktop (dev)

```powershell
.\scripts\dev-desktop.ps1
```

Do **not** open `http://127.0.0.1:1420` in Chrome — use the Portnir window.

## CLI

```powershell
cargo run -p portnir-cli -- list
cargo run -p portnir-cli -- check 135
```

## Local verify

```powershell
.\scripts\dev-check.ps1
```
