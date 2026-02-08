import { io, type Socket } from 'socket.io-client';
import { env } from '../config';
import { neoLogger } from '../utils';

let riskSocket: Socket | null = null;

/**
 * Connect to the Python risk engine via Socket.IO.
 * Replaces the old HTTP health-polling approach with a persistent connection.
 * Auto-reconnects on disconnect with exponential backoff.
 */
export function connectRiskEngineSocket(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (riskSocket?.connected) {
      neoLogger.info('Risk engine socket already connected');
      resolve();
      return;
    }

    const url = env.riskEngine.url;
    neoLogger.info({ url }, 'Connecting to Python risk engine via Socket.IO');

    riskSocket = io(url, {
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 30000,
      timeout: 10000,
      transports: ['websocket'],
    });

    const connectionTimeout = setTimeout(() => {
      riskSocket?.disconnect();
      riskSocket = null;
      reject(new Error(`Risk engine unreachable at ${url} — Socket.IO connection timed out`));
    }, 30000);

    riskSocket.on('connected', (data: { engine: string; version: string }) => {
      clearTimeout(connectionTimeout);
      neoLogger.info(
        { engine: data.engine, version: data.version },
        'Python risk engine connected via Socket.IO'
      );
      resolve();
    });

    riskSocket.on('connect', () => {
      neoLogger.info('Socket.IO transport connected to risk engine');
    });

    riskSocket.on('disconnect', (reason: string) => {
      neoLogger.warn({ reason }, 'Risk engine socket disconnected — will auto-reconnect');
    });

    riskSocket.on('reconnect', (attempt: number) => {
      neoLogger.info({ attempt }, 'Reconnected to risk engine');
    });

    riskSocket.on('reconnect_failed', () => {
      neoLogger.error('Failed to reconnect to risk engine after all attempts');
    });

    riskSocket.on('connect_error', (err: Error) => {
      neoLogger.warn({ err: err.message }, 'Risk engine Socket.IO connection error');
    });

    riskSocket.on('pong_engine', (data: { timestamp: number }) => {
      neoLogger.debug({ latency: Date.now() - data.timestamp * 1000 }, 'Risk engine pong');
    });
  });
}

/** Returns true if the risk engine socket is currently connected. */
export function isRiskEngineConnected(): boolean {
  return riskSocket?.connected ?? false;
}

/** Disconnect the risk engine socket (used during graceful shutdown). */
export function disconnectRiskEngineSocket(): void {
  if (riskSocket) {
    riskSocket.disconnect();
    riskSocket = null;
    neoLogger.info('Risk engine socket disconnected');
  }
}
