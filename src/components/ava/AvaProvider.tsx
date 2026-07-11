'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { AvaAnswer, AvaContext, AvaMessage } from '@/lib/ava/types';
import { getAnswer } from '@/lib/ava/insights';
import { AvaAskPopover } from './AvaAskPopover';
import { AvaDrawer } from './AvaDrawer';

export interface AvaAnchor {
  el?: HTMLElement | null;
  /** Viewport coordinates — used for chart-surface clicks with no DOM anchor. */
  position?: { top: number; left: number };
}

interface AskState {
  context: AvaContext;
  anchor: AvaAnchor;
}

interface AvaApi {
  /** Open the ask popover for a context, anchored to an element or a point. */
  openAsk: (context: AvaContext, anchor: AvaAnchor) => void;
  closeAsk: () => void;
  /** Submit a question: closes the popover, opens the drawer, runs the analysis. */
  ask: (context: AvaContext, question: string) => void;
  /** Continue the thread with a preloaded follow-up. */
  askFollowUp: (label: string, answer: AvaAnswer) => void;
  /** Free-text question typed inside the drawer — answered from the current context. */
  askInDrawer: (question: string) => void;
  closeDrawer: () => void;
  /** The latest ava message id — only this one animates. */
  liveMessageId: string | null;
  /** Called by the drawer when the live message finishes animating. */
  markLiveDone: () => void;
  askState: AskState | null;
  drawerOpen: boolean;
  messages: AvaMessage[];
  /** True while the live message is still reasoning/streaming. */
  busy: boolean;
}

const AvaCtx = createContext<AvaApi | null>(null);

export function useAva(): AvaApi {
  const ctx = useContext(AvaCtx);
  if (!ctx) throw new Error('useAva must be used inside <AvaProvider>');
  return ctx;
}

let nextId = 1;
function makeId() {
  return `ava-msg-${nextId++}`;
}

export function AvaProvider({ children }: { children: React.ReactNode }) {
  const [askState, setAskState] = useState<AskState | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [messages, setMessages] = useState<AvaMessage[]>([]);
  const [liveMessageId, setLiveMessageId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const currentContext = useRef<AvaContext | null>(null);

  const openAsk = useCallback((context: AvaContext, anchor: AvaAnchor) => {
    setAskState({ context, anchor });
  }, []);

  const closeAsk = useCallback(() => setAskState(null), []);

  const pushExchange = useCallback((context: AvaContext | undefined, question: string, answer: AvaAnswer) => {
    const userMsg: AvaMessage = { id: makeId(), role: 'user', content: question, context };
    const avaMsg: AvaMessage = { id: makeId(), role: 'ava', content: answer.markdown, answer, context };
    setMessages((prev) => [...prev, userMsg, avaMsg]);
    setLiveMessageId(avaMsg.id);
    setBusy(true);
    setDrawerOpen(true);
  }, []);

  const ask = useCallback(
    (context: AvaContext, question: string) => {
      setAskState(null);
      currentContext.current = context;
      // New embed-point ask starts a fresh thread so the context chips stay truthful.
      setMessages([]);
      pushExchange(context, question, getAnswer(context, question));
    },
    [pushExchange],
  );

  const askFollowUp = useCallback(
    (label: string, answer: AvaAnswer) => {
      pushExchange(currentContext.current ?? undefined, label, answer);
    },
    [pushExchange],
  );

  const askInDrawer = useCallback(
    (question: string) => {
      const context = currentContext.current;
      if (!context) return;
      pushExchange(context, question, getAnswer(context, question));
    },
    [pushExchange],
  );

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const markLiveDone = useCallback(() => {
    setLiveMessageId(null);
    setBusy(false);
  }, []);

  const api = useMemo<AvaApi>(
    () => ({
      openAsk,
      closeAsk,
      ask,
      askFollowUp,
      askInDrawer,
      closeDrawer,
      liveMessageId,
      markLiveDone,
      askState,
      drawerOpen,
      messages,
      busy,
    }),
    [openAsk, closeAsk, ask, askFollowUp, askInDrawer, closeDrawer, liveMessageId, markLiveDone, askState, drawerOpen, messages, busy],
  );

  return (
    <AvaCtx.Provider value={api}>
      {children}
      <AvaAskPopover />
      <AvaDrawer />
    </AvaCtx.Provider>
  );
}
