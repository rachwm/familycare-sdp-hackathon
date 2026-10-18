import { useEffect, useRef } from 'react';

export interface BackendEvent {
  type: string;
  data: unknown;
}

function websocketUrl() {
  const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configuredBase) {
    const url = new URL(configuredBase);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = '/ws';
    url.search = '';
    url.hash = '';
    return url.toString();
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

function isBackendEvent(value: unknown): value is BackendEvent {
  return typeof value === 'object' && value !== null
    && typeof (value as Record<string, unknown>).type === 'string'
    && 'data' in value;
}

/** Subscribe to backend notifications and reconnect after a dropped socket. */
export function useBackendEvents(
  onEvent: (event: BackendEvent) => void,
  enabled = true,
) {
  const callback = useRef(onEvent);
  callback.current = onEvent;

  useEffect(() => {
    if (!enabled || typeof WebSocket === 'undefined') return;
    let active = true;
    let socket: WebSocket | undefined;
    let reconnectTimer: number | undefined;

    const connect = () => {
      if (!active) return;
      try {
        // A malformed URL, blocked mixed-content socket, or unsupported
        // WebSocket environment must never crash Live Mode.
        socket = new WebSocket(websocketUrl());
        socket.onmessage = message => {
          try {
            const event: unknown = JSON.parse(String(message.data));
            if (isBackendEvent(event)) callback.current(event);
          } catch {
            // Ignore malformed messages and keep the live connection running.
          }
        };
        socket.onerror = () => {
          // A dropped socket reconnects via onclose. HTTP polling still works.
          socket?.close();
        };
        socket.onclose = () => {
          if (active) reconnectTimer = window.setTimeout(connect, 3000);
        };
      } catch (error) {
        console.warn('FamilyCare live WebSocket unavailable; using HTTP polling.', error);
        if (active) reconnectTimer = window.setTimeout(connect, 3000);
      }
    };

    connect();
    return () => {
      active = false;
      window.clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [enabled]);
}
