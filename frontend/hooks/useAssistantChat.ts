'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type ChatRole = 'user' | 'ai' | 'human' | 'system';

export interface AssistantMessage {
  id: string;
  role: ChatRole;
  content: string;
  senderName?: string;
  timestamp: string;
}

export interface HumanAssistant {
  id: string;
  name: string;
  title: string;
  bio?: string;
  specialties?: string[];
  status?: string;
}

type ConnectionState = 'connecting' | 'connected' | 'error';

type SessionSnapshotPayload = {
  type: 'session_snapshot';
  messages?: Partial<AssistantMessage>[];
  humanAssistant?: HumanAssistant | null;
};

type AssistantPayload = {
  type: 'assistant_message';
  role?: ChatRole;
  content: string;
  senderName?: string;
};

type ChatMessagePayload = {
  type: 'chat_message';
  message?: Partial<AssistantMessage>;
};

type HumanJoinedPayload = {
  type: 'human_joined';
  assistant: HumanAssistant;
};

type ErrorPayload = {
  type: 'error';
  content?: string;
};

type ServerPayload =
  | SessionSnapshotPayload
  | AssistantPayload
  | HumanJoinedPayload
  | ErrorPayload
  | ChatMessagePayload
  | { type?: string };

const SESSION_STORAGE_KEY = 'plain_assistant_session';

const buildId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const normalizeMessage = (raw?: Partial<AssistantMessage>): AssistantMessage => ({
  id: raw?.id ?? buildId(),
  role: (raw?.role as ChatRole) ?? 'system',
  content: raw?.content ?? '',
  senderName: raw?.senderName,
  timestamp: raw?.timestamp ?? new Date().toISOString(),
});

export function useAssistantChat() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [humanAssistant, setHumanAssistant] = useState<HumanAssistant | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const messageIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) {
      setSessionId(existing);
      return;
    }
    const nextId = buildId();
    window.localStorage.setItem(SESSION_STORAGE_KEY, nextId);
    setSessionId(nextId);
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    const ws = new WebSocket(`ws://localhost:8000/ws/assistant/${sessionId}`);
    wsRef.current = ws;
    setConnectionState('connecting');

    ws.onopen = () => {
      setConnectionState('connected');
      setError(null);
    };

    ws.onclose = () => {
      setConnectionState('error');
    };

    ws.onerror = () => {
      setConnectionState('error');
      setError('Unable to reach the assistant service.');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data) as ServerPayload;

      switch (data.type) {
        case 'session_snapshot': {
          const snapshot = data as SessionSnapshotPayload;
          const normalizedMessages = (snapshot.messages ?? []).map((msg) => normalizeMessage(msg));
          messageIds.current = new Set(normalizedMessages.map((msg) => msg.id));
          setMessages(normalizedMessages);
          setHumanAssistant(snapshot.humanAssistant ?? null);
          break;
        }
        case 'chat_message': {
          const message = normalizeMessage((data as { message?: Partial<AssistantMessage> }).message);
          if (messageIds.current.has(message.id)) break;
          messageIds.current.add(message.id);
          setMessages((prev) => [...prev, message]);
          break;
        }
        case 'assistant_message': {
          const assistantMsg = data as AssistantPayload;
          const message = normalizeMessage({
            role:
              assistantMsg.role === 'human'
                ? 'human'
                : assistantMsg.role === 'system'
                ? 'system'
                : 'ai',
            content: assistantMsg.content,
            senderName: assistantMsg.senderName,
          });
          if (messageIds.current.has(message.id)) break;
          messageIds.current.add(message.id);
          setMessages((prev) => [...prev, message]);
          break;
        }
        case 'human_joined': {
          const joined = data as HumanJoinedPayload;
          setHumanAssistant(joined.assistant);
          break;
        }
        case 'error': {
          const errorPayload = data as ErrorPayload;
          setError(errorPayload.content ?? 'Unknown assistant error.');
          const message = normalizeMessage({
            role: 'system',
            content: `⚠️ ${errorPayload.content ?? 'Something went wrong.'}`,
            senderName: 'System',
          });
          if (!messageIds.current.has(message.id)) {
            messageIds.current.add(message.id);
            setMessages((prev) => [...prev, message]);
          }
          setConnectionState('error');
          break;
        }
        default:
          break;
      }
    };

    return () => {
      ws.close();
    };
  }, [sessionId]);

  const sendUserMessage = useCallback((content: string) => {
    if (!content.trim()) return false;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError('Connection lost. Please refresh to reconnect.');
      setConnectionState('error');
      return false;
    }
    wsRef.current.send(JSON.stringify({ sender: 'user', message: content }));
    return true;
  }, []);

  const sendHumanMessage = useCallback(
    (content: string) => {
      if (!content.trim() || !humanAssistant) return false;
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        setError('Connection lost. Please refresh to reconnect.');
        setConnectionState('error');
        return false;
      }
      wsRef.current.send(
        JSON.stringify({
          sender: 'human',
          assistantId: humanAssistant.id,
          message: content,
        })
      );
      return true;
    },
    [humanAssistant]
  );

  const isEscalated = useMemo(() => !!humanAssistant, [humanAssistant]);

  return {
    sessionId,
    messages,
    humanAssistant,
    connectionState,
    error,
    isEscalated,
    sendUserMessage,
    sendHumanMessage,
  };
}
