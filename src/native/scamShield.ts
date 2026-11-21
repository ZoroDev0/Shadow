import { Capacitor, registerPlugin } from "@capacitor/core";

/* The only bridge to the Android notification listener. On the web (and in the
   browser extension) every method resolves with `supported: false` and nothing
   is scanned — the Protect screen keeps its labelled simulations there. */

export type ListenerState = {
  supported: boolean;
  enabled: boolean;
  scanning: boolean;
  postNotifications: boolean;
  debug: boolean;
  sdk: number;
};

export type RecentScan = {
  packageName: string;
  appLabel: string;
  verdict: "scam" | "suspicious" | "safe" | string;
  score: number;
  at: number;
  snippet: string;
};

type NativeResult = Partial<Omit<ListenerState, "supported">>;

interface NativeScamShield {
  isListenerEnabled(): Promise<NativeResult>;
  openListenerSettings(): Promise<{ opened: boolean }>;
  openAppSettings(): Promise<{ opened: boolean }>;
  requestPostNotifications(): Promise<{ granted: boolean }>;
  setScanning(options: { enabled: boolean }): Promise<{ enabled: boolean }>;
  getRecent(): Promise<{ items: RecentScan[] }>;
  clearRecent(): Promise<{ cleared: boolean }>;
  addListener(
    event: "notificationScanned",
    callback: (scan: RecentScan) => void
  ): Promise<{ remove: () => Promise<void> }>;
}

const NativePlugin = registerPlugin<NativeScamShield>("ScamShield");

export function isNativeAndroid(): boolean {
  try {
    return Capacitor.getPlatform() === "android" && Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

const UNSUPPORTED: ListenerState = {
  supported: false,
  enabled: false,
  scanning: false,
  postNotifications: false,
  debug: false,
  sdk: 0,
};

export async function isListenerEnabled(): Promise<ListenerState> {
  if (!isNativeAndroid()) return { ...UNSUPPORTED };
  try {
    const r = await NativePlugin.isListenerEnabled();
    return {
      supported: true,
      enabled: !!r.enabled,
      scanning: !!r.scanning,
      postNotifications: !!r.postNotifications,
      debug: !!r.debug,
      sdk: typeof r.sdk === "number" ? r.sdk : 0,
    };
  } catch {
    return { ...UNSUPPORTED };
  }
}

export async function openListenerSettings(): Promise<boolean> {
  if (!isNativeAndroid()) return false;
  try {
    return !!(await NativePlugin.openListenerSettings()).opened;
  } catch {
    return false;
  }
}

export async function openAppSettings(): Promise<boolean> {
  if (!isNativeAndroid()) return false;
  try {
    return !!(await NativePlugin.openAppSettings()).opened;
  } catch {
    return false;
  }
}

export async function requestPostNotifications(): Promise<boolean> {
  if (!isNativeAndroid()) return false;
  try {
    return !!(await NativePlugin.requestPostNotifications()).granted;
  } catch {
    return false;
  }
}

/** Pure decision for whether to prompt POST_NOTIFICATIONS on app resume.
 * Requests at most once per session, only when notification access is enabled
 * on Android 13+ (SDK >= 33) and POST_NOTIFICATIONS is not yet granted.
 * Web or unsupported environments do nothing. */
export function shouldPromptPostNotifications(
  state: { supported?: boolean; enabled?: boolean; sdk?: number; postNotifications?: boolean },
  alreadyPromptedInSession: boolean
): boolean {
  if (!state.supported || !state.enabled) return false;
  if ((state.sdk ?? 0) < 33) return false;
  if (state.postNotifications) return false;
  if (alreadyPromptedInSession) return false;
  return true;
}

export async function setScanning(enabled: boolean): Promise<boolean> {
  if (!isNativeAndroid()) return false;
  try {
    return !!(await NativePlugin.setScanning({ enabled })).enabled;
  } catch {
    return false;
  }
}

export async function getRecent(): Promise<RecentScan[]> {
  if (!isNativeAndroid()) return [];
  try {
    return (await NativePlugin.getRecent()).items ?? [];
  } catch {
    return [];
  }
}

export async function clearRecent(): Promise<boolean> {
  if (!isNativeAndroid()) return false;
  try {
    return !!(await NativePlugin.clearRecent()).cleared;
  } catch {
    return false;
  }
}

/** No-op on the web: there is no listener to emit anything. */
export async function onNotificationScanned(
  callback: (scan: RecentScan) => void
): Promise<() => void> {
  if (!isNativeAndroid()) return () => {};
  try {
    const handle = await NativePlugin.addListener("notificationScanned", callback);
    return () => {
      void handle.remove();
    };
  } catch {
    return () => {};
  }
}
