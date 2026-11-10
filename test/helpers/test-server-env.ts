/**
 * Debe importarse ANTES que backend/server en los tests de arranque:
 * config.ts lee PORT en tiempo de carga y `Number('0') || 3000` descarta el 0,
 * así que se usa un puerto alto y libre.
 */
process.env.PORT = process.env.PORT && process.env.PORT !== '3000' ? process.env.PORT : '48213';
