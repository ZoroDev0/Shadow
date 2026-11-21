/* Minimal, dependency-free chrome.* mock. Only the surface the extension
   actually touches is implemented, so a new API call fails loudly in tests. */

import { vi } from "vitest";

export interface ChromeMock {
  chrome: any;
  localStore: Record<string, any>;
  sessionStore: Record<string, any>;
  menus: any[];
  badge: { text: string; tabId?: number; title?: string; color?: string };
  tabUpdates: any[];
  windows: any[];
  permissionRequests: any[];
  permissionRemovals: any[];
  listeners: Record<string, Function[]>;
  emit: (name: string, payload: any) => void;
}

export function createChromeMock(): ChromeMock {
  const localStore: Record<string, any> = {};
  const sessionStore: Record<string, any> = {};
  const menus: any[] = [];
  const tabUpdates: any[] = [];
  const windows: any[] = [];
  const permissionRequests: any[] = [];
  const permissionRemovals: any[] = [];
  const listeners: Record<string, Function[]> = {};
  const badge = { text: "", tabId: undefined as number | undefined, title: "", color: "" };

  const area = (store: Record<string, any>) => ({
    async get(key: string | string[]) {
      if (Array.isArray(key)) {
        const out: Record<string, any> = {};
        for (const k of key) if (k in store) out[k] = store[k];
        return out;
      }
      return key in store ? { [key]: store[key] } : {};
    },
    async set(items: Record<string, any>) {
      Object.assign(store, items);
    },
    async remove(key: string) {
      delete store[key];
    }
  });

  const on = (name: string) => ({
    addListener: (fn: Function) => {
      (listeners[name] = listeners[name] || []).push(fn);
    }
  });

  const chrome = {
    storage: { local: area(localStore), session: area(sessionStore) },
    runtime: {
      id: "scamshield-test",
      getURL: (path: string) => `chrome-extension://scamshield-test/${path}`,
      openOptionsPage: vi.fn(async () => undefined),
      onInstalled: on("installed"),
      onStartup: on("startup"),
      onMessage: on("message")
    },
    contextMenus: {
      removeAll: (cb?: Function) => {
        menus.length = 0;
        cb?.();
      },
      create: (item: any) => menus.push(item),
      onClicked: on("menuClicked")
    },
    action: {
      async setBadgeText(options: any) {
        badge.text = options.text;
        badge.tabId = options.tabId;
      },
      async setBadgeBackgroundColor(options: any) {
        badge.color = options.color;
      },
      async setBadgeTextColor() {
        /* unused, exists for Chrome 110+ */
      },
      async setTitle(options: any) {
        badge.title = options.title;
      }
    },
    tabs: {
      async update(tabId: number, props: any) {
        tabUpdates.push({ tabId, ...props });
        return { id: tabId, ...props };
      },
      async create(props: any) {
        return { id: 99, ...props };
      }
    },
    windows: {
      async create(props: any) {
        windows.push(props);
        return { id: 1, ...props };
      }
    },
    webNavigation: { onBeforeNavigate: on("beforeNavigate") },
    permissions: {
      async request(request: any) {
        permissionRequests.push(request);
        return true;
      },
      async remove(request: any) {
        permissionRemovals.push(request);
        return true;
      }
    }
  };

  return {
    chrome,
    localStore,
    sessionStore,
    menus,
    badge,
    tabUpdates,
    windows,
    permissionRequests,
    permissionRemovals,
    listeners,
    emit(name: string, payload: any) {
      for (const fn of listeners[name] || []) fn(payload);
    }
  };
}

export const SCAM_URL = "https://sbi-kyc-update.xyz/login";
export const SUSPICIOUS_URL = "https://bit.ly/claim-prize";
