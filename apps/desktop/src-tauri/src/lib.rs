#[tauri::command]
fn list_listeners() -> Result<Vec<portnir_core::Listener>, String> {
    portnir_core::list_listeners().map_err(|e| e.to_string())
}

#[tauri::command]
fn kill_pid(pid: u32) -> Result<(), String> {
    portnir_core::kill_pid(pid).map_err(|e| e.to_string())
}

#[tauri::command]
fn reveal_path(path: String) -> Result<(), String> {
    std::process::Command::new("explorer")
        .arg(format!("/select,{path}"))
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Open http(s) to loopback / private LAN in the system browser.
#[tauri::command]
fn open_http_url(url: String) -> Result<(), String> {
    let url = url.trim();
    let lower = url.to_ascii_lowercase();
    if !(lower.starts_with("http://") || lower.starts_with("https://")) {
        return Err("Only http(s) URLs allowed".into());
    }

    let after_scheme = url.splitn(2, "://").nth(1).unwrap_or("");
    let authority = after_scheme.split('/').next().unwrap_or("");
    let hostport = authority.rsplit_once('@').map(|(_, h)| h).unwrap_or(authority);
    let host = if hostport.starts_with('[') {
        hostport
            .trim_start_matches('[')
            .split(']')
            .next()
            .unwrap_or("")
    } else {
        hostport.split(':').next().unwrap_or("")
    };
    let host_l = host.to_ascii_lowercase();
    let allowed = host_l == "127.0.0.1"
        || host_l == "localhost"
        || host_l == "::1"
        || is_private_v4(&host_l);
    if !allowed {
        return Err("Only loopback or private LAN hosts allowed".into());
    }

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        std::process::Command::new("cmd")
            .args(["/C", "start", "", url])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(not(windows))]
    {
        return Err("Windows only".into());
    }
    Ok(())
}

fn is_private_v4(host: &str) -> bool {
    let parts: Vec<_> = host.split('.').collect();
    if parts.len() != 4 {
        return false;
    }
    let Ok(a) = parts[0].parse::<u8>() else {
        return false;
    };
    let Ok(b) = parts[1].parse::<u8>() else {
        return false;
    };
    if a == 10 {
        return true;
    }
    if a == 192 && b == 168 {
        return true;
    }
    if a == 172 && (16..=31).contains(&b) {
        return true;
    }
    false
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            list_listeners,
            kill_pid,
            reveal_path,
            open_http_url
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
