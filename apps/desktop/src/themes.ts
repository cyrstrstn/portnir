/** Theme ids for Portnir UI. Persisted in localStorage. */
export type ThemeId = "terminal" | "slate" | "paper" | "amber";

export const THEME_OPTIONS: { id: ThemeId; label: string }[] = [
  { id: "terminal", label: "terminal" },
  { id: "slate", label: "slate" },
  { id: "paper", label: "paper" },
  { id: "amber", label: "amber" },
];

const STORAGE_KEY = "portnir.theme";

export function loadTheme(): ThemeId {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "terminal" || v === "slate" || v === "paper" || v === "amber") {
      return v;
    }
  } catch {
    /* ignore */
  }
  return "terminal";
}

export function saveTheme(theme: ThemeId): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}

export function applyTheme(theme: ThemeId): void {
  document.documentElement.setAttribute("data-theme", theme);
}
