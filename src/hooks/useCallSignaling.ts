import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "../state/auth/AuthContext";
import { getToken } from "../storage/token";
import { getApiBaseUrl } from "../config/env";

export interface IncomingCallPayload {
  call_id: number;
  caller_id: number;
  caller_name: string;
  caller_avatar?: string;
  call_type: "video" | "audio";
  room_url: string;
}

interface UseCallSignalingOptions {
  onIncomingCall: (call: IncomingCallPayload) => void;
  onCallAccepted: (call_id: number, room_url: string) => void;
  onCallRejected: (call_id: number) => void;
  onCallEnded: (call_id: number, duration?: number) => void;
}

function buildWsUrl(base: string): string {
  return base
    .replace(/^https:\/\//, "wss://")
    .replace(/^http:\/\//, "ws://")
    .replace(/\/$/, "");
}

export function useCallSignaling(options: UseCallSignalingOptions) {
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const disconnect = useCallback(() => {
    if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const connect = useCallback(async () => {
    if (!mountedRef.current || !user) return;
    disconnect();

    const token = await getToken();
    if (!token || !mountedRef.current) return;

    const base = buildWsUrl(getApiBaseUrl());
    const url = `${base}/ws/${user.id}`;

    // SECURITY: token is passed via Sec-WebSocket-Protocol instead of URL query.
    // Prevents the token from leaking into access logs, browser history, or proxies.
    // Backend reads the token from: request.headers["sec-websocket-protocol"]
    // Format: "bearer, <token>"   (comma-separated subprotocols)
    const protocols = ["bearer", token];

    try {
      const ws = new WebSocket(url, protocols);
      wsRef.current = ws;

      ws.onopen = () => {
        pingRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 30_000);
      };

      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data as string);
          const { type } = data;
          if (type === "incoming_call") {
            optionsRef.current.onIncomingCall(data as IncomingCallPayload);
          } else if (type === "call_accepted") {
            optionsRef.current.onCallAccepted(data.call_id, data.room_url);
          } else if (type === "call_rejected") {
            optionsRef.current.onCallRejected(data.call_id);
          } else if (type === "call_ended") {
            optionsRef.current.onCallEnded(data.call_id, data.duration);
          }
        } catch {}
      };

      ws.onclose = () => {
        if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }
        if (mountedRef.current) {
          reconnectRef.current = setTimeout(() => {
            if (mountedRef.current) void connect();
          }, 3_000);
        }
      };

      ws.onerror = () => ws.close();
    } catch {
      if (mountedRef.current) {
        reconnectRef.current = setTimeout(() => {
          if (mountedRef.current) void connect();
        }, 3_000);
      }
    }
  }, [user, disconnect]);

  const sendMessage = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (user) void connect();
    return () => {
      mountedRef.current = false;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      disconnect();
    };
  }, [user?.id]);

  return { sendMessage };
}
