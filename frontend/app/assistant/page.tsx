'use client';

import { useAssistantChat } from '@/hooks/useAssistantChat';
import { useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

const STATUS = {
  connecting: { label: 'Connecting…', color: 'bg-yellow-400' },
  connected: { label: 'Online', color: 'bg-emerald-400' },
  error: { label: 'Offline', color: 'bg-red-500' },
} as const;

const formatTimestamp = (iso?: string) => {
  if (!iso) return '';
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

type ParticipantChip = {
  key: string;
  label: string;
  tone: 'user' | 'ai' | 'human';
};

export default function AssistantPage() {
  const searchParams = useSearchParams();
  const isOperator = searchParams?.get('role') === 'human';
  const { messages, humanAssistant, connectionState, error, sendUserMessage, sendHumanMessage } = useAssistantChat();

  const [userInput, setUserInput] = useState('');
  const [operatorInput, setOperatorInput] = useState('');
  const [composerError, setComposerError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredMessages = useMemo(
    () => messages.filter((msg) => msg.role === 'user' || msg.role === 'ai' || msg.role === 'human'),
    [messages]
  );

  const participants = useMemo<ParticipantChip[]>(() => {
    const chips: ParticipantChip[] = [];
    const seen = new Set<string>();
    for (const message of filteredMessages) {
      if (message.role === 'user' && !seen.has('member')) {
        seen.add('member');
        chips.push({ key: 'member', label: isOperator ? 'Member' : 'You', tone: 'user' });
      }
      if (message.role === 'ai' && !seen.has('ai')) {
        seen.add('ai');
        chips.push({ key: 'ai', label: 'AI', tone: 'ai' });
      }
      if (message.role === 'human') {
        const id = message.senderName ?? 'Plain Guide';
        if (!seen.has(id)) {
          seen.add(id);
          chips.push({ key: id, label: id, tone: 'human' });
        }
      }
    }
    return chips;
  }, [filteredMessages, isOperator]);

  const handleUserSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userInput.trim()) return;
    const sent = sendUserMessage(userInput.trim());
    if (sent) {
      setUserInput('');
      setComposerError(null);
    } else {
      setComposerError('Unable to send your message. Please try again.');
    }
  };

  const handleOperatorSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!operatorInput.trim()) return;
    const sent = sendHumanMessage(operatorInput.trim());
    if (sent) {
      setOperatorInput('');
      setComposerError(null);
    } else {
      setComposerError('Message not delivered. Ensure a conversation is assigned to you.');
    }
  };

  const bannerMessage = useMemo(() => {
    if (error) return error;
    if (composerError) return composerError;
    if (isOperator) return 'Operator mode: reply only when you can actually move the member forward.';
    return 'Tell us what you need. AI responds instantly, and a Plain Guide joins only when real-world help is necessary.';
  }, [composerError, error, isOperator]);

  const status = STATUS[connectionState] ?? STATUS.connecting;

  const scrollToLatest = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToLatest();
  }, [filteredMessages.length]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b141a] px-4 py-6 text-[#d1d7db]">
      <div className="grid h-[90vh] w-full max-w-5xl grid-rows-[auto,1fr,auto] overflow-hidden rounded-[32px] bg-[#111b21] shadow-2xl ring-1 ring-[#0c1317]">
        <header className="rounded-t-[32px] bg-[#202c33] px-6 py-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-[#8696a0]">Plain Concierge</p>
              <h1 className="text-2xl font-semibold text-white">Life Planning Desk</h1>
              <p className="text-sm text-[#d1d7db]">{bannerMessage}</p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-[#0b141a]/40 px-4 py-2 text-sm font-medium">
              <span className={`h-2.5 w-2.5 rounded-full ${status.color}`} />
              {status.label}
            </div>
          </div>
          {participants.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {participants.map((chip) => (
                <span
                  key={chip.key}
                  className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                    chip.tone === 'user'
                      ? 'bg-[#005c4b] text-white'
                      : chip.tone === 'ai'
                      ? 'bg-[#2a3942] text-[#d1d7db]'
                      : 'bg-[#ffeecd] text-[#4a3724]'
                  }`}
                >
                  {chip.label}
                </span>
              ))}
            </div>
          )}
        </header>

        <div className="relative overflow-hidden bg-[#0b141a]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(120,184,156,0.1),_transparent)]" />
          <div ref={scrollRef} className="relative z-10 flex h-full flex-col gap-2 overflow-y-auto px-6 py-6">
            {filteredMessages.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-center text-[#8696a0]">
                <div>
                  <p className="text-lg font-semibold">No messages yet</p>
                  <p className="text-sm">Start the conversation to open your planning workspace.</p>
                </div>
              </div>
            ) : (
              filteredMessages.map((message) => {
                const isUser = message.role === 'user';
                const isHuman = message.role === 'human';
                const alignment = isUser ? 'items-end' : 'items-start';
                const bubbleClasses = isUser
                  ? 'bg-[#005c4b] text-white rounded-3xl rounded-br-sm shadow-md'
                  : isHuman
                  ? 'bg-[#ffeecd] text-[#402b18] rounded-3xl rounded-bl-sm'
                  : 'bg-[#202c33] text-[#d1d7db] rounded-3xl rounded-bl-sm';

                const label =
                  message.role === 'ai'
                    ? 'AI'
                    : message.role === 'human'
                    ? message.senderName ?? 'Plain Guide'
                    : isOperator
                    ? 'Member'
                    : 'You';

                return (
                  <div key={message.id} className={`flex ${alignment}`}>
                    <div className={`max-w-[75%] space-y-1 px-4 py-3 ${bubbleClasses}`}>
                      {!isUser && (
                        <span className="text-xs font-semibold uppercase tracking-wide text-[#8696a0]">{label}</span>
                      )}
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                      <div
                        className={`text-right text-[11px] font-semibold uppercase tracking-wide ${
                          isUser ? 'text-[#8ed4c6]' : isHuman ? 'text-[#a47136]' : 'text-[#8696a0]'
                        }`}
                      >
                        {formatTimestamp(message.timestamp)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <footer className="rounded-b-[32px] border-t border-[#202c33] bg-[#111b21]/95 px-6 py-4">
          {!isOperator && (
            <form onSubmit={handleUserSubmit} className="flex items-center gap-3 rounded-2xl bg-[#202c33] px-4 py-3">
              <input
                value={userInput}
                onChange={(event) => setUserInput(event.target.value)}
                placeholder="Type a message"
                className="flex-1 bg-transparent text-sm text-white placeholder:text-[#55636d] focus:outline-none"
                disabled={connectionState !== 'connected'}
              />
              <button
                type="submit"
                disabled={connectionState !== 'connected' || !userInput.trim()}
                className="rounded-full bg-[#00a884] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#029473] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Send
              </button>
            </form>
          )}

          {isOperator && (
            <form onSubmit={handleOperatorSubmit} className="flex flex-col gap-3">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f1b000]">
                {humanAssistant ? `Replying as ${humanAssistant.name}` : 'Waiting for member request'}
              </label>
              <div className="flex items-center gap-3 rounded-2xl border border-[#f1b000]/40 bg-[#1f1103] px-4 py-3">
                <input
                  value={operatorInput}
                  onChange={(event) => setOperatorInput(event.target.value)}
                  placeholder={
                    humanAssistant ? 'Share tactical advice with the member…' : 'Hold tight, no member needs help yet…'
                  }
                  className="flex-1 bg-transparent text-sm text-[#f8e0c4] placeholder:text-[#b08b5e] focus:outline-none"
                  disabled={!humanAssistant || connectionState !== 'connected'}
                />
                <button
                  type="submit"
                  disabled={!humanAssistant || connectionState !== 'connected' || !operatorInput.trim()}
                  className="rounded-full bg-[#f1b000] px-4 py-2 text-sm font-semibold text-[#2b1500] transition hover:bg-[#ffbd1f] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Reply
                </button>
              </div>
            </form>
          )}
        </footer>
      </div>
    </div>
  );
}
