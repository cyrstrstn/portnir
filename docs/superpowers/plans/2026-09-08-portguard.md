# PortGuard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Windows PortGuard app (Tauri 2 + React + Rust) that lists local listening ports, supports check/kill/open/copy, plus a CLI — local build only, no public release yet.

**Architecture:** Shared Rust crate `portguard-core` enumerates listeners and kills PIDs. Tauri commands wrap the core for the React UI. A small `portguard-cli` binary uses the same core. Portable zip packaging is deferred until the user says ship.

**Tech Stack:** Rust 1.78+, Tauri 2, React 18, TypeScript, Vite, Windows IP Helper APIs (`GetExtendedTcpTable` / `GetExtendedUdpTable`)

## Global Constraints

- Windows 10/11 only for v0
- Listening endpoints only (no established-connection spam in default view)
- No telemetry / no outbound network from the app
- Kill requires GUI confirm or CLI `--yes`
- Do not publish GitHub release / portable zip until user asks
- Prefer small dependencies; system WebView2 (not bundled)
- Working title: PortGuard; CLI name: `portguard`

## File map

| Path | Responsibility |
|------|----------------|
| `crates/portguard-core/` | Listener model, enumerate, resolve path, kill |
| `crates/portguard-cli/` | CLI binary |
| `apps/desktop/` | Tauri + React UI |
| `apps/desktop/src-tauri/` | Tauri shell + commands calling core |
| `Cargo.toml` | Workspace root |
| `README.md` | Dev setup + run instructions (no public install yet) |

---

### Task 1: Install toolchain + scaffold workspace

**Files:**
- Create: `C:\portguard\Cargo.toml`
- Create: `C:\portguard\README.md`
- Create: `C:\portguard\crates\portguard-core\Cargo.toml`
- Create: `C:\portguard\crates\portguard-core\src\lib.rs`
- Create: `C:\portguard\crates\portguard-cli\Cargo.toml`
- Create: `C:\portguard\crates\portguard-cli\src\main.rs`

**Interfaces:**
- Produces: empty `portguard_core` lib that compiles; workspace `cargo check` works

- [ ] **Step 1: Install Rust (if missing)**

Run (PowerShell):
```powershell
winget install --id Rustlang.Rustup -e --accept-package-agreements --accept-source-agreements
# new shell then:
rustup default stable
rustc --version
cargo --version
```
Expected: version lines print. Also ensure MSVC build tools / “Desktop development with C++” available for `windows` crate linking. Install WebView2 Evergreen Runtime if missing.

- [ ] **Step 2: Create workspace Cargo.toml**

```toml
[workspace]
resolver = "2"
members = [
  "crates/portguard-core",
  "crates/portguard-cli",
  "apps/desktop/src-tauri",
]
```
Note: add `apps/desktop/src-tauri` only after Task 4 scaffolds Tauri; until then members = core + cli only.

Initial:
```toml
[workspace]
resolver = "2"
members = [
  "crates/portguard-core",
  "crates/portguard-cli",
]
```

- [ ] **Step 3: Stub core + cli**

`crates/portguard-core/Cargo.toml`:
```toml
[package]
name = "portguard-core"
version = "0.1.0"
edition = "2021"

[dependencies]
serde = { version = "1", features = ["derive"] }
thiserror = "1"
```

`crates/portguard-core/src/lib.rs`:
```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Listener {
    pub protocol: String,
    pub local_addr: String,
    pub port: u16,
    pub pid: u32,
    pub process_name: String,
    pub path: Option<String>,
    pub company: Option<String>,
}

#[derive(Debug, thiserror::Error)]
pub enum PortGuardError {
    #[error("{0}")]
    Message(String),
}

pub type Result<T> = std::result::Result<T, PortGuardError>;

pub fn list_listeners() -> Result<Vec<Listener>> {
    Ok(vec![])
}

pub fn listeners_on_port(port: u16) -> Result<Vec<Listener>> {
    Ok(list_listeners()?.into_iter().filter(|l| l.port == port).collect())
}

pub fn kill_pid(_pid: u32) -> Result<()> {
    Err(PortGuardError::Message("not implemented".into()))
}
```

`crates/portguard-cli/Cargo.toml`:
```toml
[package]
name = "portguard-cli"
version = "0.1.0"
edition = "2021"

[[bin]]
name = "portguard"
path = "src/main.rs"

[dependencies]
portguard-core = { path = "../portguard-core" }
clap = { version = "4", features = ["derive"] }
serde_json = "1"
```

`crates/portguard-cli/src/main.rs`:
```rust
use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "portguard", version, about = "List local listening ports")]
struct Cli {
    #[command(subcommand)]
    cmd: Commands,
}

#[derive(Subcommand)]
enum Commands {
    List {
        #[arg(long)]
        json: bool,
        #[arg(long)]
        tcp: bool,
        #[arg(long)]
        udp: bool,
    },
    Check {
        port: u16,
        #[arg(long)]
        json: bool,
    },
    Kill {
        pid: u32,
        #[arg(long)]
        yes: bool,
    },
}

fn main() {
    let cli = Cli::parse();
    match cli.cmd {
        Commands::List { .. } => println!("[]"),
        Commands::Check { port, .. } => println!("nothing listening on {port}"),
        Commands::Kill { yes, .. } if !yes => {
            eprintln!("refusing kill without --yes");
            std::process::exit(2);
        }
        Commands::Kill { .. } => eprintln!("not implemented"),
    }
}
```

- [ ] **Step 4: Verify compile**

Run: `cargo check`
Expected: success

- [ ] **Step 5: Commit**

```bash
git add Cargo.toml crates README.md
git commit -m "chore: scaffold PortGuard Rust workspace"
```

---

### Task 2: Core — enumerate listening TCP/UDP + resolve process

**Files:**
- Modify: `crates/portguard-core/Cargo.toml`
- Modify: `crates/portguard-core/src/lib.rs`
- Create: `crates/portguard-core/src/win.rs`
- Create: `crates/portguard-core/tests/list_smoke.rs`

**Interfaces:**
- Consumes: `Listener`, `Result`, `PortGuardError` from Task 1
- Produces: working `list_listeners() -> Result<Vec<Listener>>` with real Windows data; `listeners_on_port(port: u16)`

- [ ] **Step 1: Add Windows deps**

```toml
[target.'cfg(windows)'.dependencies]
windows = { version = "0.58", features = [
  "Win32_Foundation",
  "Win32_NetworkManagement_IpHelper",
  "Win32_Networking_WinSock",
  "Win32_System_Threading",
  "Win32_Security",
] }
```

- [ ] **Step 2: Write failing smoke test**

`crates/portguard-core/tests/list_smoke.rs`:
```rust
#[test]
fn list_listeners_returns_ok_on_windows() {
    let list = portguard_core::list_listeners().expect("enumerate");
    // Most Windows machines have at least one listener; allow empty but must be Ok
    for row in &list {
        assert!(row.port > 0);
        assert!(row.protocol == "TCP" || row.protocol == "UDP");
        assert!(!row.local_addr.is_empty());
    }
}
```

Run: `cargo test -p portguard-core list_listeners_returns_ok_on_windows -- --nocapture`
Expected: may pass with empty stub — change stub assertion by requiring implementation next; if stub returns `Ok(vec![])` test still passes. Add:

```rust
#[test]
fn known_shape_fields_populated_when_any() {
    let list = portguard_core::list_listeners().unwrap();
    if let Some(row) = list.first() {
        assert!(!row.process_name.is_empty() || row.pid > 0);
    }
}
```

- [ ] **Step 3: Implement `win.rs` enumeration**

Implement using `GetExtendedTcpTable` with `TCP_TABLE_OWNER_PID_LISTENER` and `GetExtendedUdpTable` with `UDP_TABLE_OWNER_PID`. Map rows to `Listener`:
- `protocol`: `"TCP"` / `"UDP"`
- `local_addr`: string form of local sockaddr (`0.0.0.0:port` or `[::]:port`)
- `port`: host-order u16
- `pid`: owning pid
- Resolve `process_name` + `path` via `OpenProcess` + `QueryFullProcessImageNameW`
- `company`: optional; skip in first pass (`None`) if version-info is heavy — add in Task 2b only if time

Wire `list_listeners` in `lib.rs`:
```rust
pub fn list_listeners() -> Result<Vec<Listener>> {
    #[cfg(windows)]
    {
        win::enumerate_listeners()
    }
    #[cfg(not(windows))]
    {
        Err(PortGuardError::Message("Windows only".into()))
    }
}
```

- [ ] **Step 4: Run tests**

Run: `cargo test -p portguard-core`
Expected: PASS on Windows

- [ ] **Step 5: Commit**

```bash
git add crates/portguard-core
git commit -m "feat: enumerate listening TCP/UDP ports on Windows"
```

---

### Task 3: Core — kill_pid + CLI real commands

**Files:**
- Modify: `crates/portguard-core/src/win.rs`
- Modify: `crates/portguard-core/src/lib.rs`
- Modify: `crates/portguard-cli/src/main.rs`

**Interfaces:**
- Produces: `kill_pid(pid: u32) -> Result<()>`  
- CLI: `list` / `check` / `kill --yes` use core

- [ ] **Step 1: Implement kill**

```rust
pub fn kill_pid(pid: u32) -> Result<()> {
    #[cfg(windows)]
    { win::terminate_pid(pid) }
    #[cfg(not(windows))]
    { Err(PortGuardError::Message("Windows only".into())) }
}
```

`terminate_pid`: `OpenProcess(PROCESS_TERMINATE)` + `TerminateProcess`. Map access denied to `PortGuardError::Message("Access denied — try Administrator".into())`.

- [ ] **Step 2: Wire CLI**

```rust
fn main() {
    let cli = Cli::parse();
    match cli.cmd {
        Commands::List { json, tcp, udp } => {
            let mut rows = portguard_core::list_listeners().unwrap_or_else(|e| {
                eprintln!("{e}");
                std::process::exit(1);
            });
            if tcp && !udp { rows.retain(|r| r.protocol == "TCP"); }
            if udp && !tcp { rows.retain(|r| r.protocol == "UDP"); }
            if json {
                println!("{}", serde_json::to_string_pretty(&rows).unwrap());
            } else {
                for r in rows {
                    println!(
                        "{}\t{}\tpid={}\t{}\t{}",
                        r.protocol,
                        r.local_addr,
                        r.pid,
                        r.process_name,
                        r.path.clone().unwrap_or_default()
                    );
                }
            }
        }
        Commands::Check { port, json } => {
            let rows = portguard_core::listeners_on_port(port).unwrap_or_else(|e| {
                eprintln!("{e}");
                std::process::exit(1);
            });
            if json {
                println!("{}", serde_json::to_string_pretty(&rows).unwrap());
            } else if rows.is_empty() {
                println!("nothing listening on {port}");
            } else {
                for r in rows {
                    println!("{}\t{}\tpid={}\t{}", r.protocol, r.local_addr, r.pid, r.process_name);
                }
            }
        }
        Commands::Kill { pid, yes } => {
            if !yes {
                eprintln!("refusing kill without --yes");
                std::process::exit(2);
            }
            if let Err(e) = portguard_core::kill_pid(pid) {
                eprintln!("{e}");
                std::process::exit(1);
            }
            println!("killed pid {pid}");
        }
    }
}
```

- [ ] **Step 3: Manual CLI check**

Run:
```powershell
cargo run -p portguard-cli -- list
cargo run -p portguard-cli -- check 135
```
Expected: table lines / listener or “nothing listening”

- [ ] **Step 4: Commit**

```bash
git add crates/portguard-core crates/portguard-cli
git commit -m "feat: CLI list/check/kill using shared core"
```

---

### Task 4: Scaffold Tauri 2 + React UI shell

**Files:**
- Create: `apps/desktop/**` via `npm create tauri-app`
- Modify: root `Cargo.toml` workspace members to include `apps/desktop/src-tauri`

**Interfaces:**
- Produces: `npm run tauri dev` opens empty window titled PortGuard

- [ ] **Step 1: Create app**

From `C:\portguard`:
```powershell
npm create tauri-app@latest desktop -- --template react-ts --manager npm --yes
# move into apps/desktop if created as desktop/ at root:
# Prefer creating inside apps/:
mkdir apps -Force
cd apps
npm create tauri-app@latest desktop -- --template react-ts --manager npm --yes
```

If interactive prompts appear: app name `PortGuard`, window title `PortGuard`, identifier `com.portguard.app`.

- [ ] **Step 2: Add Tauri crate to workspace**

Update root `Cargo.toml` members to include `"apps/desktop/src-tauri"`.  
In `apps/desktop/src-tauri/Cargo.toml` add:
```toml
portguard-core = { path = "../../../crates/portguard-core" }
```

- [ ] **Step 3: Dev run smoke**

```powershell
cd C:\portguard\apps\desktop
npm install
npm run tauri dev
```
Expected: window opens

- [ ] **Step 4: Commit**

```bash
git add apps Cargo.toml
git commit -m "chore: scaffold Tauri React desktop shell"
```

---

### Task 5: Tauri commands + React listeners table

**Files:**
- Modify: `apps/desktop/src-tauri/src/lib.rs` (or `main.rs`)
- Create: `apps/desktop/src/types.ts`
- Create: `apps/desktop/src/App.tsx`
- Create: `apps/desktop/src/App.css`
- Modify: `apps/desktop/src-tauri/capabilities` / allowlist for commands as required by Tauri 2

**Interfaces:**
- Consumes: `portguard_core::list_listeners`, `kill_pid`, `Listener`
- Produces: Tauri commands:
  - `list_listeners() -> Vec<Listener>`
  - `kill_pid(pid: u32) -> Result<(), String>`
  - `reveal_path(path: String) -> Result<(), String>`

- [ ] **Step 1: Register commands**

```rust
#[tauri::command]
fn list_listeners() -> Result<Vec<portguard_core::Listener>, String> {
    portguard_core::list_listeners().map_err(|e| e.to_string())
}

#[tauri::command]
fn kill_pid(pid: u32) -> Result<(), String> {
    portguard_core::kill_pid(pid).map_err(|e| e.to_string())
}

#[tauri::command]
fn reveal_path(path: String) -> Result<(), String> {
    std::process::Command::new("explorer")
        .arg("/select,")
        .arg(&path)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}
```

Register in `tauri::Builder::default().invoke_handler(tauri::generate_handler![list_listeners, kill_pid, reveal_path])`.

- [ ] **Step 2: Build UI table**

`types.ts`:
```ts
export type Listener = {
  protocol: string;
  localAddr: string;
  port: number;
  pid: number;
  processName: string;
  path?: string | null;
  company?: string | null;
};
```

`App.tsx` responsibilities:
- On mount + Refresh: `invoke<Listener[]>("list_listeners")`
- Search string filters protocol/addr/port/process/path
- Protocol select: All | TCP | UDP
- Auto-refresh: Off | 2s | 5s | 10s (`setInterval`, clear on change/unmount)
- Selected row detail strip
- Buttons: Copy (`navigator.clipboard.writeText` format `TCP 0.0.0.0:445 pid=4 name`), Open folder (`invoke("reveal_path", { path })` disabled if no path), Kill (window.confirm then `invoke("kill_pid", { pid })` then refresh)
- Footer listener count
- Dark calm CSS in `App.css` (no purple SaaS look)

- [ ] **Step 3: Manual GUI test**

Run `npm run tauri dev`  
Expected: rows appear; search works; copy works; open folder works on pathed rows; kill asks confirm

- [ ] **Step 4: Commit**

```bash
git add apps/desktop
git commit -m "feat: PortGuard UI for listening ports and actions"
```

---

### Task 6: README + local verify script (no release)

**Files:**
- Modify: `README.md`
- Create: `scripts/dev-check.ps1`

- [ ] **Step 1: Write README**

Include:
- What PortGuard is
- Dev prerequisites (Rust, Node, WebView2, MSVC)
- `cargo run -p portguard-cli -- list`
- `cd apps/desktop && npm run tauri dev`
- Explicit: **not published yet**

- [ ] **Step 2: Dev check script**

```powershell
$ErrorActionPreference='Stop'
cargo test -p portguard-core
cargo run -p portguard-cli -- list | Out-Null
Write-Host 'PASS core+cli' -ForegroundColor Green
```

- [ ] **Step 3: Commit**

```bash
git add README.md scripts
git commit -m "docs: PortGuard local development instructions"
```

---

### Task 7 (optional / ship-later gate): Portable zip

**Do not run until user says ship.**

- `npm run tauri build` portable
- Zip `PortGuard.exe` + `portguard.exe` + LICENSE + README.txt
- Target small size with system WebView2

---

## Spec coverage check

| Spec item | Task |
|-----------|------|
| Listening TCP/UDP list | 2, 5 |
| Search/filter + auto-refresh | 5 |
| Copy / Open folder / Kill | 5 |
| CLI list/check/kill | 3 |
| Tauri+React beautiful UI | 4–5 |
| Build-first no public release | 6–7 |
| Portable small zip | 7 (gated) |

## Placeholder scan

No TBD/TODO left in task steps.

---

## Execution

Plan saved to `docs/superpowers/plans/2026-09-08-portguard.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  

**2. Inline Execution** — implement tasks in this session with checkpoints  

Which approach?
