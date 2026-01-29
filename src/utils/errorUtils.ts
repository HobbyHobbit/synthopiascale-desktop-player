/**
 * Error Handling Utilities
 * Centralized error handling and logging
 */

export type ResultSuccess<T> = { ok: true; value: T };
export type ResultError = { ok: false; error: Error };
export type Result<T> = ResultSuccess<T> | ResultError;

/**
 * Create a success result
 */
export function ok<T>(value: T): ResultSuccess<T> {
  return { ok: true, value };
}

/**
 * Create an error result
 */
export function err(error: Error | string): ResultError {
  return { ok: false, error: error instanceof Error ? error : new Error(error) };
}

/**
 * Wrap async function in try/catch returning Result
 */
export async function tryCatch<T>(
  fn: () => Promise<T>
): Promise<Result<T>> {
  try {
    const value = await fn();
    return ok(value);
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}

/**
 * Wrap sync function in try/catch returning Result
 */
export function tryCatchSync<T>(fn: () => T): Result<T> {
  try {
    const value = fn();
    return ok(value);
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}

/**
 * Log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Application logger
 */
export const logger = {
  debug: (message: string, ...args: unknown[]) => {
    if (import.meta.env.DEV) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  },
  
  info: (message: string, ...args: unknown[]) => {
    console.info(`[INFO] ${message}`, ...args);
  },
  
  warn: (message: string, ...args: unknown[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },
  
  error: (message: string, error?: unknown, ...args: unknown[]) => {
    console.error(`[ERROR] ${message}`, error, ...args);
  },
};

/**
 * Audio-specific error types
 */
export class AudioContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AudioContextError';
  }
}

export class AudioLoadError extends Error {
  constructor(message: string, public readonly src?: string) {
    super(message);
    this.name = 'AudioLoadError';
  }
}

export class FileAccessError extends Error {
  constructor(message: string, public readonly path?: string) {
    super(message);
    this.name = 'FileAccessError';
  }
}
