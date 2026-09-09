//! Build loopback/local HTTP visit URLs from listening endpoints.

import type { Listener } from "./types";

function splitHostPort(localAddr: string): { host: string; port: string } | null {
  if (localAddr.startsWith("[")) {
    const m = localAddr.match(/^\[([^\]]+)\]:(\d+)$/);
    if (!m) return null;
    return { host: m[1], port: m[2] };
  }
  const idx = localAddr.lastIndexOf(":");
  if (idx <= 0) return null;
  return { host: localAddr.slice(0, idx), port: localAddr.slice(idx + 1) };
}

function isLoopback(host: string): boolean {
  const h = host.toLowerCase();
  return h === "127.0.0.1" || h === "localhost" || h === "::1";
}

function isUnspecified(host: string): boolean {
  return host === "0.0.0.0" || host === "::" || host === "*";
}

function isPrivateV4(host: string): boolean {
  const m = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

/** HTTP URL to open in the system browser, or null if not visit-able. */
export function visitUrlForListener(row: Listener): string | null {
  if (row.protocol.toUpperCase() !== "TCP") return null;
  const parts = splitHostPort(row.localAddr);
  if (!parts) return null;

  let host = parts.host;
  if (isUnspecified(host)) {
    host = "127.0.0.1";
  }

  if (!isLoopback(host) && !isPrivateV4(host)) {
    return null;
  }

  const port = parts.port || String(row.port);
  if (host.includes(":")) {
    return `http://[${host}]:${port}`;
  }
  return `http://${host}:${port}`;
}
