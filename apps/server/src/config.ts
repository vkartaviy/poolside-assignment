/**
 * Server configuration from environment variables.
 */
export const DEV = process.env['NODE_ENV'] !== 'production';

export const PORT = parseInt(process.env['PORT'] ?? '3001', 10);
export const HOST = process.env['HOST'] ?? 'localhost';

export const SIMULATED_LATENCY_MS = parseInt(process.env['SIMULATED_LATENCY_MS'] ?? '0', 10);
