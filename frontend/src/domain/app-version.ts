/**
 * Dominio de versiones de la app (Ajustes → Versión).
 * Comparación numérica por segmentos: evita el clásico bug lexicográfico
 * donde '1.0.10' < '1.0.9' como strings.
 */

/** Normaliza '1.2' → [1,2,0]; ignora espacios y sufijos '-beta.1'. */
export function normalizeVersion(version: string): [number, number, number] {
  const core = version.trim().split('-')[0]!.split('+')[0]!;
  const parts = core.split('.').map((segment) => {
    const parsed = Number.parseInt(segment.trim(), 10);
    return Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
  });
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

/** -1 si a < b, 0 si iguales, 1 si a > b. */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const [aMajor, aMinor, aPatch] = normalizeVersion(a);
  const [bMajor, bMinor, bPatch] = normalizeVersion(b);
  if (aMajor !== bMajor) return aMajor > bMajor ? 1 : -1;
  if (aMinor !== bMinor) return aMinor > bMinor ? 1 : -1;
  if (aPatch !== bPatch) return aPatch > bPatch ? 1 : -1;
  return 0;
}

/** ¿La versión publicada es más nueva que la instalada? Vacías → false. */
export function isNewerVersion(published: string, installed: string): boolean {
  if (!published.trim() || !installed.trim()) return false;
  return compareVersions(published, installed) === 1;
}
