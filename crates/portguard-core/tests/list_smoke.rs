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

#[test]
fn known_shape_fields_populated_when_any() {
    let list = portguard_core::list_listeners().unwrap();
    if let Some(row) = list.first() {
        assert!(!row.process_name.is_empty() || row.pid > 0);
    }
}
