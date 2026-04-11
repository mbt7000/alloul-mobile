import React, { createContext, useContext, useState, useRef, useCallback } from "react";
import { Alert } from "react-native";
import { useCallSignaling, type IncomingCallPayload } from "../hooks/useCallSignaling";
import { useExpoPushToken } from "../hooks/useExpoPushToken";
import { initiateCall, acceptCall, rejectCall, endCall } from "../api/calls.api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActiveCall {
  call_id: number;
  room_url: string;
  other_user_name: string;
  other_user_avatar?: string;
  call_type: "video" | "audio";
  is_outgoing: boolean;
}

interface CallContextType {
  incomingCall: IncomingCallPayload | null;
  activeCall: ActiveCall | null;
  startCall: (receiver_id: number, receiver_name: string, receiver_avatar: string | undefined, call_type?: "video" | "audio") => Promise<void>;
  acceptIncoming: () => Promise<void>;
  rejectIncoming: () => Promise<void>;
  hangUp: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const CallContext = createContext<CallContextType | undefined>(undefined);

export function CallProvider({ children }: { children: React.ReactNode }) {
  const [incomingCall, setIncomingCall] = useState<IncomingCallPayload | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const pendingCallIdRef = useRef<number | null>(null);

  useExpoPushToken();

  const { sendMessage } = useCallSignaling({
    onIncomingCall: useCallback((call) => {
      setIncomingCall(call);
    }, []),

    onCallAccepted: useCallback((call_id, room_url) => {
      // Caller side: other person accepted
      setIncomingCall(null);
      setActiveCall((prev) =>
        prev ? { ...prev, call_id, room_url } : null,
      );
    }, []),

    onCallRejected: useCallback((_call_id) => {
      setActiveCall(null);
      setIncomingCall(null);
      Alert.alert("المكالمة", "لم يرد المستخدم على مكالمتك");
    }, []),

    onCallEnded: useCallback((_call_id, duration) => {
      setActiveCall(null);
      setIncomingCall(null);
      if (duration && duration > 5) {
        const mins = Math.floor(duration / 60);
        const secs = duration % 60;
        const label = mins > 0 ? `${mins}:${String(secs).padStart(2, "0")} دقيقة` : `${secs} ثانية`;
        Alert.alert("انتهت المكالمة", `المدة: ${label}`);
      }
    }, []),
  });

  const startCall = useCallback(async (
    receiver_id: number,
    receiver_name: string,
    receiver_avatar: string | undefined,
    call_type: "video" | "audio" = "video",
  ) => {
    try {
      const result = await initiateCall(receiver_id, call_type);
      pendingCallIdRef.current = result.call_id;
      setActiveCall({
        call_id: result.call_id,
        room_url: result.room_url,
        other_user_name: receiver_name,
        other_user_avatar: receiver_avatar,
        call_type,
        is_outgoing: true,
      });
    } catch (e: any) {
      Alert.alert("خطأ", e?.message || "تعذّر بدء المكالمة");
    }
  }, []);

  const acceptIncoming = useCallback(async () => {
    if (!incomingCall) return;
    try {
      const result = await acceptCall(incomingCall.call_id);
      setActiveCall({
        call_id: incomingCall.call_id,
        room_url: result.room_url,
        other_user_name: incomingCall.caller_name,
        other_user_avatar: incomingCall.caller_avatar,
        call_type: incomingCall.call_type,
        is_outgoing: false,
      });
      setIncomingCall(null);
    } catch (e: any) {
      Alert.alert("خطأ", e?.message || "تعذّر قبول المكالمة");
      setIncomingCall(null);
    }
  }, [incomingCall]);

  const rejectIncoming = useCallback(async () => {
    if (!incomingCall) return;
    try { await rejectCall(incomingCall.call_id); } catch {}
    setIncomingCall(null);
  }, [incomingCall]);

  const hangUp = useCallback(async () => {
    if (!activeCall) return;
    try { await endCall(activeCall.call_id); } catch {}
    setActiveCall(null);
    setIncomingCall(null);
  }, [activeCall]);

  return (
    <CallContext.Provider value={{
      incomingCall,
      activeCall,
      startCall,
      acceptIncoming,
      rejectIncoming,
      hangUp,
    }}>
      {children}
    </CallContext.Provider>
  );
}

export function useCallContext(): CallContextType {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCallContext must be used within CallProvider");
  return ctx;
}
