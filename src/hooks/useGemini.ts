'use client';

import { useState, useCallback } from 'react';

interface Message {
  role: 'user' | 'ai';
  text: string;
}

export function useGemini() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const askQuestion = useCallback(async (question: string) => {
    setMessages(prev => [...prev, { role: 'user', text: question }]);
    setLoading(true);
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.answer || data.error || 'No response' }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: `Error: ${String(err)}` }]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearMessages = useCallback(() => setMessages([]), []);

  return { messages, loading, askQuestion, clearMessages };
}
