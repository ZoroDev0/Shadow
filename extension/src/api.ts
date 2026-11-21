/* Thin accessor for the WebExtension APIs. Resolved on every call so tests can
   install a mock before importing a module. */
export function api(): any {
  const scope = globalThis as any;
  return scope.chrome ?? scope.browser ?? null;
}

export function hasChrome(): boolean {
  const c = api();
  return !!(c && c.storage && c.runtime);
}
