import { describe, expect, it } from "vitest";
import {
  clearRecent,
  getRecent,
  isListenerEnabled,
  isNativeAndroid,
  onNotificationScanned,
  openAppSettings,
  openListenerSettings,
  requestPostNotifications,
  setScanning,
} from "./scamShield";

describe("native ScamShield wrapper on the web", () => {
  it("reports unsupported instead of throwing", async () => {
    expect(isNativeAndroid()).toBe(false);
    const state = await isListenerEnabled();
    expect(state.supported).toBe(false);
    expect(state.enabled).toBe(false);
  });

  it("every settings action resolves false and every read resolves empty", async () => {
    expect(await openListenerSettings()).toBe(false);
    expect(await openAppSettings()).toBe(false);
    expect(await requestPostNotifications()).toBe(false);
    expect(await setScanning(true)).toBe(false);
    expect(await getRecent()).toEqual([]);
    expect(await clearRecent()).toBe(false);
  });

  it("event subscription is a no-op that can be disposed", async () => {
    let called = 0;
    const off = await onNotificationScanned(() => {
      called++;
    });
    expect(typeof off).toBe("function");
    off();
    expect(called).toBe(0);
  });
});
