use std::net::{Ipv4Addr, Ipv6Addr};
use std::path::Path;

use windows::Win32::Foundation::{CloseHandle, ERROR_INSUFFICIENT_BUFFER, ERROR_SUCCESS};
use windows::Win32::NetworkManagement::IpHelper::{
    GetExtendedTcpTable, GetExtendedUdpTable, MIB_TCP6ROW_OWNER_PID, MIB_TCPROW_OWNER_PID,
    MIB_UDP6ROW_OWNER_PID, MIB_UDPROW_OWNER_PID, TCP_TABLE_OWNER_PID_LISTENER, UDP_TABLE_OWNER_PID,
};
use windows::Win32::Networking::WinSock::{AF_INET, AF_INET6};
use windows::Win32::System::Threading::{
    OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION,
};

use crate::{Listener, PortGuardError, Result};

pub fn enumerate_listeners() -> Result<Vec<Listener>> {
    let mut out = Vec::new();
    collect_tcp4(&mut out)?;
    collect_tcp6(&mut out)?;
    collect_udp4(&mut out)?;
    collect_udp6(&mut out)?;
    Ok(out)
}

fn collect_tcp4(out: &mut Vec<Listener>) -> Result<()> {
    let buf = fetch_table(|ptr, size| unsafe {
        GetExtendedTcpTable(
            ptr,
            size,
            false,
            AF_INET.0 as u32,
            TCP_TABLE_OWNER_PID_LISTENER,
            0,
        )
    })?;
    if buf.is_empty() {
        return Ok(());
    }
    let num = read_num_entries(&buf);
    let rows = rows_slice::<MIB_TCPROW_OWNER_PID>(&buf, num);
    for row in rows {
        let port = port_from_network(row.dwLocalPort);
        let addr = Ipv4Addr::from(row.dwLocalAddr.to_ne_bytes());
        let local_addr = format!("{addr}:{port}");
        out.push(make_listener("TCP", local_addr, port, row.dwOwningPid));
    }
    Ok(())
}

fn collect_tcp6(out: &mut Vec<Listener>) -> Result<()> {
    let buf = fetch_table(|ptr, size| unsafe {
        GetExtendedTcpTable(
            ptr,
            size,
            false,
            AF_INET6.0 as u32,
            TCP_TABLE_OWNER_PID_LISTENER,
            0,
        )
    })?;
    if buf.is_empty() {
        return Ok(());
    }
    let num = read_num_entries(&buf);
    let rows = rows_slice::<MIB_TCP6ROW_OWNER_PID>(&buf, num);
    for row in rows {
        let port = port_from_network(row.dwLocalPort);
        let addr = Ipv6Addr::from(row.ucLocalAddr);
        let local_addr = format!("[{addr}]:{port}");
        out.push(make_listener("TCP", local_addr, port, row.dwOwningPid));
    }
    Ok(())
}

fn collect_udp4(out: &mut Vec<Listener>) -> Result<()> {
    let buf = fetch_table(|ptr, size| unsafe {
        GetExtendedUdpTable(
            ptr,
            size,
            false,
            AF_INET.0 as u32,
            UDP_TABLE_OWNER_PID,
            0,
        )
    })?;
    if buf.is_empty() {
        return Ok(());
    }
    let num = read_num_entries(&buf);
    let rows = rows_slice::<MIB_UDPROW_OWNER_PID>(&buf, num);
    for row in rows {
        let port = port_from_network(row.dwLocalPort);
        let addr = Ipv4Addr::from(row.dwLocalAddr.to_ne_bytes());
        let local_addr = format!("{addr}:{port}");
        out.push(make_listener("UDP", local_addr, port, row.dwOwningPid));
    }
    Ok(())
}

fn collect_udp6(out: &mut Vec<Listener>) -> Result<()> {
    let buf = fetch_table(|ptr, size| unsafe {
        GetExtendedUdpTable(
            ptr,
            size,
            false,
            AF_INET6.0 as u32,
            UDP_TABLE_OWNER_PID,
            0,
        )
    })?;
    if buf.is_empty() {
        return Ok(());
    }
    let num = read_num_entries(&buf);
    let rows = rows_slice::<MIB_UDP6ROW_OWNER_PID>(&buf, num);
    for row in rows {
        let port = port_from_network(row.dwLocalPort);
        let addr = Ipv6Addr::from(row.ucLocalAddr);
        let local_addr = format!("[{addr}]:{port}");
        out.push(make_listener("UDP", local_addr, port, row.dwOwningPid));
    }
    Ok(())
}

fn make_listener(protocol: &str, local_addr: String, port: u16, pid: u32) -> Listener {
    let (process_name, path) = resolve_process(pid);
    Listener {
        protocol: protocol.to_string(),
        local_addr,
        port,
        pid,
        process_name,
        path,
        company: None,
    }
}

fn resolve_process(pid: u32) -> (String, Option<String>) {
    if pid == 0 {
        return ("System".to_string(), None);
    }
    unsafe {
        let Ok(handle) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) else {
            return (format!("pid:{pid}"), None);
        };
        let mut buf = vec![0u16; 1024];
        let mut size = buf.len() as u32;
        let result = QueryFullProcessImageNameW(
            handle,
            PROCESS_NAME_WIN32,
            windows::core::PWSTR(buf.as_mut_ptr()),
            &mut size,
        );
        let _ = CloseHandle(handle);
        if result.is_err() || size == 0 {
            return (format!("pid:{pid}"), None);
        }
        let full = String::from_utf16_lossy(&buf[..size as usize]);
        let name = Path::new(&full)
            .file_name()
            .map(|s| s.to_string_lossy().into_owned())
            .unwrap_or_else(|| full.clone());
        (name, Some(full))
    }
}

fn port_from_network(dw_port: u32) -> u16 {
    u16::from_be((dw_port & 0xFFFF) as u16)
}

fn read_num_entries(buf: &[u8]) -> usize {
    if buf.len() < 4 {
        return 0;
    }
    u32::from_ne_bytes([buf[0], buf[1], buf[2], buf[3]]) as usize
}

fn rows_slice<T: Copy>(buf: &[u8], num: usize) -> &[T] {
    let header = std::mem::size_of::<u32>();
    let needed = header + num.saturating_mul(std::mem::size_of::<T>());
    if buf.len() < needed || num == 0 {
        return &[];
    }
    unsafe {
        let ptr = buf.as_ptr().add(header) as *const T;
        std::slice::from_raw_parts(ptr, num)
    }
}

fn fetch_table<F>(mut get: F) -> Result<Vec<u8>>
where
    F: FnMut(Option<*mut core::ffi::c_void>, *mut u32) -> u32,
{
    let mut size: u32 = 0;
    let status = get(None, &mut size);
    if status == ERROR_SUCCESS.0 {
        return Ok(Vec::new());
    }
    if status != ERROR_INSUFFICIENT_BUFFER.0 {
        return Err(PortGuardError::Message(format!(
            "GetExtended*Table size query failed: {status}"
        )));
    }
    // Retry a few times if table grows between calls
    for _ in 0..5 {
        let mut buf = vec![0u8; size as usize];
        let status = get(Some(buf.as_mut_ptr() as *mut _), &mut size);
        if status == ERROR_SUCCESS.0 {
            buf.truncate(size as usize);
            return Ok(buf);
        }
        if status != ERROR_INSUFFICIENT_BUFFER.0 {
            return Err(PortGuardError::Message(format!(
                "GetExtended*Table failed: {status}"
            )));
        }
    }
    Err(PortGuardError::Message(
        "GetExtended*Table buffer race exhausted".into(),
    ))
}
