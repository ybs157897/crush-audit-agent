import { useEffect, useRef, useCallback, useState } from 'react';
import { createEventSource } from '../api/client';
import type { SSEPayload } from '../api/client';

/**
 * useSSE - connects to the Crush workspace event stream via Server-Sent Events.
 * Receives real-time updates for messages, session changes, tool calls, etc.
 */
export function useSSE(
  workspaceId: string | null,
  clientId: string,
  onEvent: (event: SSEPayload) => void,
) {
  const esRef = useRef<EventSource | null>(null);
  const [connected, setConnected] = useState(false);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    if (!workspaceId || !clientId) return;
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    const es = createEventSource(workspaceId, clientId);
    esRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (event) => {
      setConnected(true);
      try {
        const data = JSON.parse(event.data) as SSEPayload;
        onEventRef.current(data);
      } catch {
        // Non-JSON message, ignore.
      }
    };

    es.onerror = () => {
      if (es.readyState === EventSource.OPEN) {
        setConnected(true);
        return;
      }
      setConnected(false);
    };
  }, [workspaceId, clientId]);

  useEffect(() => {
    connect();
    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [connect]);

  return { connected };
}
