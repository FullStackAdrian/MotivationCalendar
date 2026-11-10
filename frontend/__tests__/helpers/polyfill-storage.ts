/**
 * Los proyectos jest no-web (p. ej. Node) no tienen `localStorage`, pero
 * `TokenStorage` decide la rama web en tiempo de importación según Platform.OS.
 * Este polyfill mínimo permite ejecutar la rama web en cualquier proyecto.
 */
const store = new Map<string, string>();

if (typeof localStorage === 'undefined') {
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => { store.set(key, String(value)); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() { return store.size; },
  };
}

export function clearWebStorage(): void {
  if (typeof localStorage !== 'undefined') localStorage.clear();
}
