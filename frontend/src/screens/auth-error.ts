/** BETA-3: los fallos técnicos de red se traducen a un mensaje accionable. */
export function friendlyAuthError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : '';
  if (/\b(CORS|network|red|timeout)\b|failed to fetch|load failed|conexión|conectar/i.test(message)) {
    return 'No se pudo conectar con el servidor. Revisa tu conexión.';
  }
  return message || fallback;
}

export const SESSION_EXPIRED_NOTICE = 'La sesión ha expirado. Vuelve a entrar.';
