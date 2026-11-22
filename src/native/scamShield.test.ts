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
  shouldPromptPostNotifications,
} from "./scamShield";

describe("native Shadow wrapper on the web", () => {
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

  describe("shouldPromptPostNotifications guard logic", () => {
    it("first resume asks when enabled and missing permission on Android 13+", () => {
      expect(
        shouldPromptPostNotifications(
          { supported: true, enabled: true, sdk: 33, postNotifications: false },
          false
        )
      ).toBe(true);
    });

    it("second resume does not ask", () => {
      expect(
        shouldPromptPostNotifications(
          { supported: true, enabled: true, sdk: 33, postNotifications: false },
          true
        )
      ).toBe(false);
    });

    it("denied-twice does not ask again (already prompted in session)", () => {
      // After user denial or repeated resumes, alreadyPromptedInSession is true
      expect(
        shouldPromptPostNotifications(
          { supported: true, enabled: true, sdk: 33, postNotifications: false },
          true
        )
      ).toBe(false);
    });

    it("web does nothing (unsupported or disabled)", () => {
      expect(
        shouldPromptPostNotifications(
          { supported: false, enabled: false, sdk: 0, postNotifications: false },
          false
        )
      ).toBe(false);
      expect(
        shouldPromptPostNotifications(
          { supported: true, enabled: false, sdk: 33, postNotifications: false },
          false
        )
      ).toBe(false);
      expect(
        shouldPromptPostNotifications(
          { supported: true, enabled: true, sdk: 32, postNotifications: false },
          false
        )
      ).toBe(false);
      expect(
        shouldPromptPostNotifications(
          { supported: true, enabled: true, sdk: 33, postNotifications: true },
          false
        )
      ).toBe(false);
    });
  });
});
