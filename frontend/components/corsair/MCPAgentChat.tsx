"use client";

import React, { useState } from 'react';
import { Bot, Send, Terminal, Cpu, CheckCircle2, ChevronRight, MessageSquare, Wrench } from 'lucide-react';
import { executeMCPAgent, MCPToolCall } from '@/lib/corsair/engine';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: MCPToolCall[];
  timestamp: string;
}

export const MCPAgentChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I am the **NETRA + CORSAIR MCP Forensic Copilot**. I have access to Corsair tools including `search_threat_catalog`, `slack_post_broadcast`, `github_list_security_issues`, `calendar_schedule_sync`, and `whatsapp_bot_dispatch`. How can I assist with your investigation today?',
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = () => {
    if (!input.trim() || loading) return;

    const userPrompt = input.trim();
    const userMsg: Message = {
      role: 'user',
      content: userPrompt,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    setTimeout(() => {
      const resp = executeMCPAgent(userPrompt);
      const botMsg: Message = {
        role: 'assistant',
        content: resp.message,
        toolCalls: resp.toolCalls,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages((prev) => [...prev, botMsg]);
      setLoading(false);
    }, 500);
  };

  const samplePrompts = [
    'Analyze the official speech keyframe deepfake',
    'Extract fraudulent IOCs from Digital Arrest FIR',
    'Check WhatsApp bot status and channels',
    'Post high-severity security alert to Slack #cyber-threat-desk'
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-surface border-[1.5px] border-line rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-card">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base sm:text-lg font-bold text-ink tracking-tight">CORSAIR MCP FORENSIC COPILOT</h2>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-inset text-purple-300 border border-purple-500/30 font-semibold">
              PROTOCOL LEVEL 3
            </span>
          </div>
          <p className="text-xs text-ink-3 mt-1.5 leading-relaxed font-sans">
            Autonomous agent armed with Corsair MCP tools across Slack, GitHub, Google Calendar, and WhatsApp.
          </p>
        </div>
      </div>

      {/* Suggested Prompts Pill Deck */}
      <div className="flex flex-wrap gap-2">
        {samplePrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => {
              setInput(p);
            }}
            className="text-xs font-mono bg-inset hover:bg-hover text-ink-2 hover:text-ink border border-line hover:border-line-strong px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5"
          >
            <ChevronRight className="w-3 h-3 text-cyan-400" />
            <span>{p}</span>
          </button>
        ))}
      </div>

      {/* Chat Messages Panel */}
      <div className="bg-surface border-[1.5px] border-line rounded-2xl p-6 flex flex-col h-[520px] shadow-card">
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} space-y-2`}
            >
              <div className="flex items-center gap-2 text-[10px] font-mono text-ink-3">
                <span>{m.role === 'user' ? 'INVESTIGATOR' : 'CORSAIR COPILOT'}</span>
                <span>•</span>
                <span>{m.timestamp}</span>
              </div>

              <div
                className={`max-w-[85%] rounded-xl p-4 text-xs ${
                  m.role === 'user'
                    ? 'bg-ink text-page font-medium shadow-sm'
                    : 'bg-inset border border-line text-ink'
                }`}
              >
                <div className="leading-relaxed whitespace-pre-wrap">{m.content}</div>

                {/* Render Tool Invocations */}
                {m.toolCalls && m.toolCalls.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-line space-y-2 font-mono">
                    <div className="flex items-center gap-1.5 text-[11px] text-purple-400 font-bold uppercase">
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Corsair MCP Tool Traces ({m.toolCalls.length}):</span>
                    </div>

                    {m.toolCalls.map((tc, tIdx) => (
                      <div key={tIdx} className="bg-canvas p-2.5 rounded-lg border border-line text-[11px] space-y-1">
                        <div className="flex justify-between text-cyan-400 font-bold">
                          <span>TOOL: {tc.tool}</span>
                          <span className="text-emerald-400 text-[10px]">✓ EXECUTED</span>
                        </div>
                        <div className="text-ink-3 text-[10px] truncate">
                          Args: {JSON.stringify(tc.args)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs font-mono text-purple-400 bg-inset border border-purple-500/30 p-3 rounded-xl w-fit">
              <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
              <span>Executing Corsair MCP Tool Pipeline...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="mt-4 pt-3 border-t border-line flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask Copilot to analyze threats, query WhatsApp bot, or dispatch workflows..."
            className="flex-1 bg-inset border border-line rounded-xl px-4 py-2.5 text-xs text-ink placeholder-ink-3 focus:outline-none focus:border-line-strong font-mono transition-all"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-ink text-page hover:bg-white/90 disabled:opacity-40 px-4 py-2.5 rounded-xl text-xs font-mono font-semibold flex items-center gap-2 transition-all shadow-btn active:scale-[0.99]"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  );
};
