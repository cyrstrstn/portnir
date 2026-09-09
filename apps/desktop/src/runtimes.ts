/** Match listeners by common language/runtime process names and paths. */

export type RuntimeFilter =
  | "all"
  | "node"
  | "python"
  | "java"
  | "dotnet"
  | "php"
  | "ruby"
  | "go"
  | "rust";

export const RUNTIME_OPTIONS: { value: RuntimeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "node", label: "Node" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "dotnet", label: ".NET" },
  { value: "php", label: "PHP" },
  { value: "ruby", label: "Ruby" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
];

const PATTERNS: Record<Exclude<RuntimeFilter, "all">, RegExp> = {
  node: /(^|[\\/])(node|nodejs)(\.exe)?$/i,
  python: /(^|[\\/])(python\d*|pythonw|py)(\.exe)?$/i,
  java: /(^|[\\/])(java|javaw)(\.exe)?$/i,
  dotnet: /(^|[\\/])(dotnet|w3wp|iisexpress)(\.exe)?$/i,
  php: /(^|[\\/])(php|php-cgi|php-fpm)(\.exe)?$/i,
  ruby: /(^|[\\/])(ruby|rubyw)(\.exe)?$/i,
  go: /(^|[\\/])go(\.exe)?$/i,
  rust: /(^|[\\/])(cargo|rustc)(\.exe)?$/i,
};

/** True if process name or image path looks like this runtime. */
export function matchesRuntime(
  runtime: RuntimeFilter,
  processName: string,
  path: string | null | undefined,
): boolean {
  if (runtime === "all") return true;
  const name = processName.trim();
  const full = path?.trim() ?? "";
  const pattern = PATTERNS[runtime];
  if (pattern.test(name)) return true;
  if (full && pattern.test(full.replace(/\//g, "\\"))) return true;
  // Folder hints (e.g. ...\nodejs\..., ...\Python312\...)
  const lower = `${name} ${full}`.toLowerCase();
  switch (runtime) {
    case "node":
      return /nodejs|\\node\\|\bnode\.exe\b/.test(lower);
    case "python":
      return /\\python\d*\\|\\python\\|python\.exe|pythonw\.exe/.test(lower);
    case "java":
      return /\\jre\\|\\jdk\\|java\.exe|javaw\.exe/.test(lower);
    case "dotnet":
      return /\\dotnet\\|dotnet\.exe/.test(lower);
    case "php":
      return /\\php\\|php\.exe|php-cgi/.test(lower);
    case "ruby":
      return /\\ruby\\|ruby\.exe/.test(lower);
    case "go":
      return /\\go\\bin\\|\\go\.exe$/.test(lower);
    case "rust":
      return /\\.cargo\\|cargo\.exe|rustc\.exe/.test(lower);
    default:
      return false;
  }
}
