export const STORAGE_KEY = "scamshield.v1";

export interface AppState {
  lang: "en" | "hi";
  theme: "light" | "dark" | "auto";
  ts: "n" | "l" | "xl";
  rm: boolean | null;
  onboarded: boolean;
  history: any[];
  protExt: boolean;
  protAnd: boolean;
  protDsk: boolean;
}

export const DEFAULT_STATE: AppState = {
  lang: "en",
  theme: "auto",
  ts: "n",
  rm: null,
  onboarded: false,
  history: [],
  protExt: false,
  protAnd: false,
  protDsk: false,
};

let memoryState: AppState = { ...DEFAULT_STATE, history: [] };

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return memoryState;
    const parsed = JSON.parse(raw);
    memoryState = { ...DEFAULT_STATE, ...parsed, history: Array.isArray(parsed.history) ? parsed.history : [] };
  } catch {
    // Keep in-memory state when storage is unavailable or malformed.
  }
  return memoryState;
}

export function saveState(state: AppState): void {
  memoryState = state;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // In-memory fallback remains active.
  }
}
