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
      <div className="bg-[#0b1220] border border-slate-800 rounded-xl p-5 flex justify-between items-center shadow-lg shadow-purple-950/10">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-bold text-white tracking-wide">CORSAIR MCP FORENSIC COPILOT</h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
              PROTOCOL LEVEL 3
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
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
            className="text-xs font-mono bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <ChevronRight className="w-3 h-3 text-cyan-400" />
            <span>{p}</span>
          </button>
        ))}
      </div>

      {/* Chat Messages Panel */}
      <div className="bg-[#090e17] border border-slate-800 rounded-xl p-5 flex flex-col h-[520px]">
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} space-y-2`}
            >
              <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                <span>{m.role === 'user' ? 'INVESTIGATOR' : 'CORSAIR COPILOT'}</span>
                <span>•</span>
                <span>{m.timestamp}</span>
              </div>

              <div
                className={`max-w-[85%] rounded-xl p-4 text-xs ${
                  m.role === 'user'
                    ? 'bg-cyan-600 text-white font-medium'
                    : 'bg-[#0c1422] border border-slate-800 text-slate-200'
                }`}
              >
                <div className="leading-relaxed whitespace-pre-wrap">{m.content}</div>

                {/* Render Tool Invocations */}
                {m.toolCalls && m.toolCalls.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2 font-mono">
                    <div className="flex items-center gap-1.5 text-[11px] text-purple-400 font-bold uppercase">
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Corsair MCP Tool Traces ({m.toolCalls.length}):</span>
                    </div>

                    {m.toolCalls.map((tc, tIdx) => (
                      <div key={tIdx} className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 text-[11px] space-y-1">
                        <div className="flex justify-between text-cyan-400 font-bold">
                          <span>TOOL: {tc.tool}</span>
                          <span className="text-emerald-400 text-[10px]">✓ EXECUTED</span>
                        </div>
                        <div className="text-slate-400 text-[10px] truncate">
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
            <div className="flex items-center gap-2 text-xs font-mono text-purple-400 bg-purple-950/20 border border-purple-800/40 p-3 rounded-lg w-fit">
              <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
              <span>Executing Corsair MCP Tool Pipeline...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask Copilot to analyze threats, query WhatsApp bot, or dispatch workflows..."
            className="flex-1 bg-[#0c121e] border border-slate-800 rounded-lg px-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-2 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  );
};
