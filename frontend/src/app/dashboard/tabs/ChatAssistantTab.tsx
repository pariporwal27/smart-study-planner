'use client';

import { useState, useRef, useEffect } from 'react';
import { askChatbot } from '@/lib/api';

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  suggestedAction?: string | null;
}

const PRESETS = [
  "Show my current syllabus and tasks",
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

  // Premium Custom Markdown and List Renderer
  const renderMessageText = (text: string, isUser: boolean = false) => {
    return text.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      
      // Find **bold** pairs and replace with strong elements
      const parts = line.split('**');
      const content = parts.map((part, pIdx) => {
        if (pIdx % 2 === 1) {
          return <strong key={pIdx} style={{ color: isUser ? '#ffffff' : 'var(--accent)', fontWeight: 700 }}>{part}</strong>;
        }
        return part;
      });

      // Check if line is a bullet item starting with - or *
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const cleanedPart = trimmed.replace(/^[-*]\s+/, '');
        const bulletParts = cleanedPart.split('**');
        const bulletContent = bulletParts.map((part, pIdx) => {
          if (pIdx % 2 === 1) {
            return <strong key={pIdx} style={{ color: isUser ? '#ffffff' : 'var(--accent)', fontWeight: 700 }}>{part}</strong>;
          }
          return part;
        });
        return (
          <li key={idx} style={{ marginLeft: '1.25rem', listStyle: 'disc', marginBottom: '0.4rem', color: isUser ? '#ffffff' : 'var(--text-primary)' }}>
            {bulletContent}
          </li>
        );
      }

      // Check if line is a numbered item starting with digits (e.g., 1.)
      if (/^\d+\.\s+/.test(trimmed)) {
        const cleanedPart = trimmed.replace(/^\d+\.\s+/, '');
        const numberMatch = trimmed.match(/^\d+\.\s+/);
        const prefix = numberMatch ? numberMatch[0] : '';
        const bulletParts = cleanedPart.split('**');
        const bulletContent = bulletParts.map((part, pIdx) => {
          if (pIdx % 2 === 1) {
            return <strong key={pIdx} style={{ color: isUser ? '#ffffff' : 'var(--accent)', fontWeight: 700 }}>{part}</strong>;
          }
          return part;
        });
        return (
          <div key={idx} style={{ display: 'flex', gap: '0.4rem', marginLeft: '0.25rem', marginBottom: '0.4rem', color: isUser ? '#ffffff' : 'var(--text-primary)' }}>
            <span style={{ fontWeight: 700, color: isUser ? '#ffffff' : 'var(--accent)' }}>{prefix}</span>
            <span>{bulletContent}</span>
          </div>
        );
      }

      return (
        <p key={idx} style={{ margin: '0 0 0.6rem 0', minHeight: '1em', color: isUser ? '#ffffff' : 'var(--text-primary)' }}>
          {content}
        </p>
      );
    });
  };

  return (
    <div className="card" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      maxHeight: '520px', 
      gap: '1rem', 
      padding: '1.5rem', 
      background: 'rgba(30, 30, 50, 0.65)', 
      border: '1px solid var(--border)', 
      backdropFilter: 'blur(20px)' 
    }}>
      
      {/* Messages Logs */}
      <div className="no-scrollbar" style={{ overflowY: 'auto', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: '1 1 auto' }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '75%',
            background: m.sender === 'user' ? 'linear-gradient(135deg, var(--accent) 0%, #4338ca 100%)' : 'var(--bg-secondary)',
            border: m.sender === 'user' ? 'none' : '1px solid var(--border)',
            borderRadius: m.sender === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
            padding: '0.9rem 1.25rem',
            lineHeight: '1.5',
            fontSize: '0.92rem',
            boxShadow: m.sender === 'user' ? '0 4px 20px rgba(99, 102, 241, 0.25)' : '0 4px 20px rgba(0, 0, 0, 0.15)',
            color: m.sender === 'user' ? '#ffffff' : 'var(--text-primary)',
            transition: 'all 0.2s'
          }}>
            <div style={{ wordBreak: 'break-word' }}>
              {renderMessageText(m.text, m.sender === 'user')}
            </div>
            
            {m.suggestedAction && (
              <div style={{ marginTop: '0.75rem', borderTop: `1px solid ${m.sender === 'user' ? 'rgba(255,255,255,0.15)' : 'var(--border)'}`, paddingTop: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: m.sender === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Suggested:</span>
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
          <div style={{ alignSelf: 'flex-start', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '20px 20px 20px 4px', padding: '0.9rem 1.25rem', display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
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
        <div className="no-scrollbar" style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.75rem', whiteSpace: 'nowrap' }}>
          {PRESETS.map((p, i) => (
            <button
              key={i}
              onClick={() => handleSend(p)}
              disabled={loading}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
                borderRadius: '99px',
                padding: '0.35rem 0.75rem',
                fontSize: '0.78rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'inherit',
                flexShrink: 0
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
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
