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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            list_listeners,
            kill_pid,
            reveal_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
