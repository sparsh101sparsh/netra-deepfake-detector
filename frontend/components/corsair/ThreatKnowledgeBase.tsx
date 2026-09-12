'use client';

import React, { useState, useEffect } from 'react';
import { Search, MessageSquare, GitPullRequest, Calendar, Mail, ShieldAlert, Sparkles, Smartphone } from 'lucide-react';

interface KnowledgeItem {
  id: string;
  title: string;
  subtitle: string;
  source: 'slack' | 'github' | 'googlecalendar' | 'gmail' | 'whatsapp';
  timestamp: string;
  badge: string;
  category: string;
}

const DEFAULT_ITEMS: KnowledgeItem[] = [
  {
    id: 'kb_001',
    title: 'High-Profile Video Speech Deepfake Case',
    subtitle: 'Narendra Modi speech video with facial reenactment (Wav2Lip / Diff-SVC) and specular lighting disparity.',
    source: 'github',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    badge: '94% CRITICAL RISK',
    category: 'deepfake'
  },
  {
    id: 'kb_002',
    title: 'Digital Arrest Threat Campaign (CBI / Mumbai Cyber Cell)',
    subtitle: 'Extortion syndicate targeting senior citizens via Skype impersonation and fake arrest memos.',
    source: 'slack',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    badge: 'FIR 104/2026',
    category: 'cbi'
  },
  {
    id: 'kb_003',
    title: 'WhatsApp Citizen Forensic Tip: KBC Lottery APK',
    subtitle: 'Malicious APK payload targeting victims with fraudulent Amitabh Bachchan audio clone.',
    source: 'whatsapp',
    timestamp: new Date(Date.now() - 14400000).toISOString(),
    badge: 'UPI FRAUD ALERT',
    category: 'kbc'
  },
  {
    id: 'kb_004',
    title: 'CERT-In Nodal Notice: AI Voice Clone Extortion Ring',
    subtitle: 'Automated intimation dispatched under IT Act 2000 Sec 66D & BNS 2023 Sec 318(4).',
    source: 'gmail',
    timestamp: new Date(Date.now() - 28800000).toISOString(),
    badge: 'CERT-IN NOTICE',
    category: 'advisory'
  },
  {
    id: 'kb_005',
    title: 'Emergency Multi-Agency Forensic Triage Meeting',
    subtitle: 'Coordination between CBI Cyber Wing, CERT-In, and NETRA Forensic Engineers.',
    source: 'googlecalendar',
    timestamp: new Date(Date.now() - 43200000).toISOString(),
    badge: 'SYNCED',
    category: 'triage'
  }
];

export const ThreatKnowledgeBase: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<KnowledgeItem[]>(DEFAULT_ITEMS);
  const [loading, setLoading] = useState(false);

  const performSearch = async (searchTerm: string) => {
    setLoading(true);
    try {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.results && data.results.length > 0) {
            setResults(data.results);
            setLoading(false);
            return;
          }
        }
      } catch {
        // Fallback to local filter
      }

      const q = searchTerm.toLowerCase().trim();
      if (!q) {
        setResults(DEFAULT_ITEMS);
      } else {
        const filtered = DEFAULT_ITEMS.filter(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            item.subtitle.toLowerCase().includes(q) ||
            item.category.toLowerCase().includes(q) ||
            item.badge.toLowerCase().includes(q)
        );
        setResults(filtered);
      }
    } catch (err) {
      console.error('Search failed', err);
      setResults(DEFAULT_ITEMS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    performSearch('');
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  const sampleKeywords = ['deepfake', 'cbi', 'kbc', 'lottery', 'triage', 'advisory'];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#0b1220] border border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <Search className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-bold text-white tracking-wide">
            CROSS-SERVICE THREAT KNOWLEDGE BASE
          </h2>
        </div>
        <p className="text-xs text-slate-400">
          Unified semantic search across past Netra forensic investigations, WhatsApp citizen tips, Slack threat cards, GitHub advisories, and evidence emails.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search across all connected tools (e.g. UPI, suspect phone number, deepfake case...)"
              className="w-full bg-[#080d17] border border-slate-700/80 rounded-lg pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button
            type="submit"
            className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2.5 rounded-lg text-xs font-semibold transition-colors"
          >
            Search
          </button>
        </form>

        {/* Suggested Keywords */}
        <div className="flex items-center gap-2 mt-3 text-[11px] font-mono text-slate-400">
          <span className="flex items-center gap-1 text-slate-500">
            <Sparkles className="w-3 h-3 text-cyan-400" /> Quick tags:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {sampleKeywords.map((k) => (
              <button
                key={k}
                onClick={() => {
                  setQuery(k);
                  performSearch(k);
                }}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-800 px-2.5 py-0.5 rounded text-cyan-300 transition-colors"
              >
                #{k}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Feed */}
      <div className="bg-[#090e17] border border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex justify-between items-center text-xs font-mono text-slate-400 pb-2 border-b border-slate-800">
          <span>RESULTS FOUND: {results.length}</span>
          <span>QUERY: &ldquo;{query || 'ALL RECENT ENTITIES'}&rdquo;</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs font-mono text-cyan-400 animate-pulse">
            Querying Corsair database & cross-referencing entities...
          </div>
        ) : results.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 font-mono">
            No entities matched your search query in Corsair DB.
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((item) => {
              let Icon = ShieldAlert;
              let iconColor = 'text-cyan-400 bg-cyan-950 border-cyan-800';

              if (item.source === 'slack') {
                Icon = MessageSquare;
                iconColor = 'text-pink-400 bg-pink-950 border-pink-800';
              } else if (item.source === 'github') {
                Icon = GitPullRequest;
                iconColor = 'text-purple-400 bg-purple-950 border-purple-800';
              } else if (item.source === 'googlecalendar') {
                Icon = Calendar;
                iconColor = 'text-blue-400 bg-blue-950 border-blue-800';
              } else if (item.source === 'gmail') {
                Icon = Mail;
                iconColor = 'text-red-400 bg-red-950 border-red-800';
              } else if (item.source === 'whatsapp') {
                Icon = Smartphone;
                iconColor = 'text-[#25D366] bg-[#25D366]/20 border-[#25D366]/60';
              }

              return (
                <div
                  key={item.id}
                  className="bg-[#0b1220] border border-slate-800/80 hover:border-slate-700 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg border shrink-0 mt-0.5 ${iconColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-200">{item.title}</span>
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400">
                          {item.source}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{item.subtitle}</p>
                    </div>
                  </div>

                  <div className="text-right font-mono text-[11px] text-slate-500 shrink-0">
                    <div>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded mt-1 inline-block">
                      {item.badge}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
