/**
 * Debe ser el PRIMER import de cada test que cargue el backend:
 * los módulos leen el entorno en tiempo de carga (p.ej. config.ts).
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || 'http://localhost:3000';
