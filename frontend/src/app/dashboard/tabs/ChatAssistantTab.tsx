'use client';

import { useState, useRef, useEffect } from 'react';
import { askChatbot } from '@/lib/api';

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  suggestedAction?: string | null;
}

const PRESETS = [
  "How can I manage study burnout?",
  "What is the Feynman Technique?",
  "Recommend a study strategy for Physics",
  "Give me active recall questions for Math"
];

export default function ChatAssistantTab() {
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'assistant', text: "Hi Pari! 👋 I'm your AI Study Assistant. I can help explain tough topics, build revision schedules, or advise on study burnout. Ask me anything!" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;
    
    const userMsg = textToSend;
    setInput('');
    setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const res = await askChatbot(userMsg);
      setMessages(prev => [...prev, {
        sender: 'assistant',
        text: res.reply,
        suggestedAction: res.suggested_action
      }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        sender: 'assistant',
        text: "Sorry, I'm having trouble connecting to the FastAPI backend right now. Make sure uvicorn is running on port 8000!"
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ display: 'grid', gridTemplateRows: '1fr auto', height: '520px', gap: '1rem', padding: '1.25rem' }}>
      
      {/* Messages Logs */}
      <div style={{ overflowY: 'auto', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '80%',
            background: m.sender === 'user' ? 'rgba(99, 102, 241, 0.25)' : 'var(--bg-secondary)',
            border: `1px solid ${m.sender === 'user' ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: m.sender === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
            padding: '0.8rem 1.1rem',
            lineHeight: '1.45',
            fontSize: '0.9rem',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.15)'
          }}>
            <p style={{ color: 'var(--text-primary)' }}>{m.text}</p>
            {m.suggestedAction && (
              <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Suggested:</span>
                <button 
                  onClick={() => handleSend(m.suggestedAction!)}
                  style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#10b981',
                    borderRadius: '6px',
                    padding: '0.25rem 0.6rem',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.3)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)'; }}
                >
                  ⚡ {m.suggestedAction}
                </button>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '14px 14px 14px 2px', padding: '0.8rem 1.1rem', display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            <span className="dot-blink">●</span>
            <span className="dot-blink" style={{ animationDelay: '0.2s' }}>●</span>
            <span className="dot-blink" style={{ animationDelay: '0.4s' }}>●</span>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input area */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
        {/* Preset chips */}
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.75rem', whiteSpace: 'nowrap' }}>
          {PRESETS.map((p, i) => (
            <button
              key={i}
              onClick={() => handleSend(p)}
              disabled={loading}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
                borderRadius: '99px',
                padding: '0.35rem 0.8rem',
                fontSize: '0.78rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'inherit'
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              💬 {p}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            type="text"
            placeholder="Type your question here (e.g. explain Feynman technique)..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend(input)}
            disabled={loading}
            className="text-input"
            style={{ borderRadius: '10px' }}
          />
          <button 
            onClick={() => handleSend(input)}
            disabled={loading || !input.trim()}
            className="btn-primary" 
            style={{ padding: '0.65rem 1.5rem', borderRadius: '10px' }}
          >
            Send
          </button>
        </div>
      </div>
      
      <style jsx global>{`
        @keyframes blink {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        .dot-blink {
          animation: blink 1.4s infinite both;
          color: var(--accent);
          font-size: 0.8rem;
        }
      `}</style>
    </div>
  );
}
