/**
 * Lightweight Circuit Breaker – no external dependencies
 *
 * States:
 *   CLOSED     — Normal operation. Requests pass through.
 *   OPEN       — Too many failures. Requests fail immediately (no upstream call).
 *   HALF_OPEN  — After cooldown, one probe request is allowed.
 */

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  recoveryTimeoutMs?: number;
  name?: string;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private nextAttemptAt = 0;
  private readonly failureThreshold: number;
  private readonly recoveryTimeoutMs: number;
  private readonly name: string;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 3;
    this.recoveryTimeoutMs = options.recoveryTimeoutMs ?? 30_000;
    this.name = options.name ?? 'CircuitBreaker';
  }

  getState(): CircuitState {
    return this.state;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now();

    if (this.state === 'OPEN') {
      if (now < this.nextAttemptAt) {
        const remainMs = this.nextAttemptAt - now;
        throw new CircuitOpenError(
          `[${this.name}] Circuit OPEN – retry in ${Math.ceil(remainMs / 1000)}s`,
        );
      }
      this.state = 'HALF_OPEN';
      console.log(`[${this.name}] Circuit -> HALF_OPEN (probing upstream)`);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    if (this.state !== 'CLOSED') {
      console.log(`[${this.name}] Circuit -> CLOSED (upstream recovered)`);
      this.state = 'CLOSED';
    }
  }

  private onFailure(): void {
    this.failureCount++;

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.nextAttemptAt = Date.now() + this.recoveryTimeoutMs;
      console.warn(`[${this.name}] Circuit -> OPEN (probe failed, retry at ${new Date(this.nextAttemptAt).toISOString()})`);
      return;
    }

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttemptAt = Date.now() + this.recoveryTimeoutMs;
      console.warn(`[${this.name}] Circuit -> OPEN after ${this.failureCount} failures (retry at ${new Date(this.nextAttemptAt).toISOString()})`);
    }
  }
}

export class CircuitOpenError extends Error {
  readonly isCircuitOpen = true;
  constructor(message: string) {
    super(message);
    this.name = 'CircuitOpenError';
  }
}
