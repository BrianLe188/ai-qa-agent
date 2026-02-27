import { useState, useEffect, useRef, useCallback } from "react";

interface WSEvent {
  type: string;
  data: any;
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<WSEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onopen = () => {
      setIsConnected(true);
      console.log("🔌 WebSocket connected");
    };

    ws.onmessage = (event) => {
      try {
        const parsed: WSEvent = JSON.parse(event.data);
        setEvents((prev) => [...prev, parsed]);
      } catch (e) {
        console.error("Failed to parse WS message:", e);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log("🔌 WebSocket disconnected, reconnecting...");
      reconnectTimer.current = setTimeout(connect, 2000);
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return { isConnected, events, clearEvents };
}
