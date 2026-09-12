"use client";

import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle, Eye, FileText, Zap, ArrowRight, CheckCircle2, Lock } from 'lucide-react';
import { ForensicResult, WorkflowDispatchResult } from '@/lib/corsair/types';
import { FORENSIC_PRESETS } from '@/lib/corsair/presets';
import { dispatchWorkflow } from '@/lib/corsair/engine';

interface ForensicScannerProps {
  onScanComplete: (scanData: ForensicResult, workflowResult: WorkflowDispatchResult | null) => void;
  onNavigateToAutomations: () => void;
}

export const ForensicScanner: React.FC<ForensicScannerProps> = ({ onScanComplete, onNavigateToAutomations }) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('preset_deepfake_speech');
  const [loading, setLoading] = useState<boolean>(false);
  const [activeScan, setActiveScan] = useState<ForensicResult | null>(FORENSIC_PRESETS['preset_deepfake_speech']);
  const [workflowResult, setWorkflowResult] = useState<WorkflowDispatchResult | null>(null);

  const presetsList = Object.entries(FORENSIC_PRESETS).map(([key, value]) => ({
    key,
    name: value.filename,
    type: value.mediaType,
    risk: value.riskScore,
    verdict: value.verdict
  }));

  const handleRunScan = async (presetKey: string) => {
    setLoading(true);
    setActiveScan(null);
    setWorkflowResult(null);

    // Simulate real-time neural pipeline ingestion
    setTimeout(() => {
      const presetData = FORENSIC_PRESETS[presetKey];
      const scan: ForensicResult = {
        ...presetData,
        analyzedAt: new Date().toISOString()
      };

      let wf: WorkflowDispatchResult | null = null;
      if (scan.riskScore >= 60) {
        wf = dispatchWorkflow(scan);
      }

      setActiveScan(scan);
      setWorkflowResult(wf);
      onScanComplete(scan, wf);
      setLoading(false);
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Engine Status */}
      <div className="bg-surface border-[1.5px] border-line rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-card">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <h2 className="text-base sm:text-lg font-bold text-ink tracking-tight">NETRA MULTI-MODAL FORENSICS ENGINE</h2>
            <span className="text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full bg-inset text-cyan-400 border border-cyan-500/30 font-semibold tracking-wider">
              DUAL-BRANCH ROUTER ACTIVE
            </span>
          </div>
          <p className="text-xs text-ink-3 mt-1.5 font-sans leading-relaxed">
            Real-time deepfake waveform & spatial anomaly detection coupled with RapidOCR fraud catalog indexing.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-ink-3 font-mono">Corsair Incident Engine:</span>
          <span className="text-xs font-mono font-semibold text-emerald-400 bg-inset border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
            <Zap className="w-3.5 h-3.5 text-emerald-400" /> AUTO-DISPATCH ENABLED
          </span>
        </div>
      </div>

      {/* Preset Selection Deck */}
      <div className="bg-surface border-[1.5px] border-line rounded-2xl p-6 shadow-card">
        <h3 className="text-xs font-semibold uppercase font-mono text-ink-3 mb-4 tracking-wider">
          SELECT FORENSIC TEST CASE / THREAT SAMPLE:
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {presetsList.map((p) => {
            const isSelected = selectedPreset === p.key;
            const isCrit = p.verdict === 'CRITICAL_THREAT';
            const isClean = p.verdict === 'AUTHENTIC_VERIFIED';

            return (
              <button
                key={p.key}
                onClick={() => {
                  setSelectedPreset(p.key);
                  handleRunScan(p.key);
                }}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-[1.5px] border-line-strong bg-hover shadow-card ring-1 ring-white/10'
                    : 'border border-line bg-inset hover:border-line-strong hover:bg-hover'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-2 font-mono">
                    <span className="text-ink-3 truncate max-w-[130px]">{p.type}</span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                        isCrit
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : isClean
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {p.risk}% RISK
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-ink line-clamp-2 leading-snug">
                    {p.name}
                  </div>
                </div>

                <div className="mt-3.5 pt-2.5 border-t border-line-soft flex items-center justify-between text-[11px] font-mono text-ink-3">
                  <span>{isCrit ? '🚨 Threat Detected' : isClean ? '✅ Clean Audio/Video' : '⚠️ Elevated Risk'}</span>
                  {isSelected && (
                    <span className="text-ink font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Active
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="bg-surface border-[1.5px] border-line rounded-2xl p-10 text-center space-y-3 shadow-card">
          <div className="inline-block w-8 h-8 border-2 border-line-strong border-t-white rounded-full animate-spin"></div>
          <div className="text-xs font-mono text-ink-2 tracking-wider">
            ROUTING MEDIA THROUGH DUAL-BRANCH SBI NEURAL NETWORK...
          </div>
        </div>
      )}

      {/* Active Scan Results Deck */}
      {activeScan && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Inspection Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Target Card Header */}
            <div className="bg-surface border-[1.5px] border-line rounded-2xl p-6 shadow-card space-y-6">
              <div className="flex flex-wrap justify-between items-center gap-2 pb-4 border-b border-line font-mono text-xs text-ink-3">
                <div>
                  <span className="text-ink-3">JOB ID: </span>
                  <span className="text-ink font-bold">{activeScan.jobId}</span>
                </div>
                <div>
                  <span className="text-ink-3">MEDIA: </span>
                  <span className="text-ink font-medium">{activeScan.filename}</span>
                </div>
                <div>
                  <span className="text-ink-3">TIMESTAMP: </span>
                  <span className="text-ink-2">{new Date(activeScan.analyzedAt).toLocaleTimeString()}</span>
                </div>
              </div>

              {/* Branch Verdict Card */}
              <div className="p-5 rounded-xl bg-inset border border-line flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      activeScan.riskScore >= 75
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : activeScan.riskScore >= 40
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    {activeScan.riskScore >= 75 ? (
                      <ShieldAlert className="w-6 h-6" />
                    ) : activeScan.riskScore >= 40 ? (
                      <AlertTriangle className="w-6 h-6" />
                    ) : (
                      <ShieldCheck className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-mono uppercase text-ink-3 tracking-wider">Composite Verdict</div>
                    <div
                      className={`text-xl font-bold font-mono tracking-wide ${
                        activeScan.riskScore >= 75
                          ? 'text-rose-400'
                          : activeScan.riskScore >= 40
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {activeScan.verdict}
                    </div>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <div className="text-3xl font-black tracking-tight text-ink">
                    {activeScan.riskScore}
                    <span className="text-sm font-normal text-ink-3">/100</span>
                  </div>
                  <div className="text-[11px] uppercase tracking-wider text-ink-3">NETRA THREAT INDEX</div>
                </div>
              </div>

              {/* Branch A: Facial Deepfake Analysis */}
              {activeScan.faceAnalysis && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-mono font-semibold text-ink uppercase tracking-wider">
                    <Eye className="w-4 h-4 text-cyan-400" />
                    <span>Branch A: Facial SBI & Ocular Discontinuity Analysis</span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 font-mono text-center text-xs">
                    <div className="p-3.5 bg-inset rounded-xl border border-line">
                      <div className="text-ink-3 text-[10px] uppercase tracking-wider">Faces Tracked</div>
                      <div className="text-lg font-bold text-ink mt-1">
                        {activeScan.faceAnalysis.facesDetected}
                      </div>
                    </div>
                    <div className="p-3.5 bg-inset rounded-xl border border-line">
                      <div className="text-ink-3 text-[10px] uppercase tracking-wider">Synth Probability</div>
                      <div className="text-lg font-bold text-rose-400 mt-1">
                        {(activeScan.faceAnalysis.fakeProbability * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="p-3.5 bg-inset rounded-xl border border-line">
                      <div className="text-ink-3 text-[10px] uppercase tracking-wider">Spatial SBI Score</div>
                      <div className="text-lg font-bold text-cyan-400 mt-1">
                        {activeScan.faceAnalysis.spatialSBIModelScore}
                      </div>
                    </div>
                  </div>

                  {/* Anomaly Bounding Box Items */}
                  {activeScan.faceAnalysis.anomalies.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="text-[11px] font-mono text-ink-3 uppercase tracking-wider">
                        Localized Spatial Anomaly Boundaries:
                      </div>
                      <div className="space-y-2">
                        {activeScan.faceAnalysis.anomalies.map((anom, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-xl border border-line bg-inset flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 text-xs"
                          >
                            <div className="space-y-1">
                              <div className="font-mono font-semibold text-ink flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                                {anom.region}
                              </div>
                              <div className="text-ink-2 text-xs leading-relaxed">
                                {anom.description}
                              </div>
                            </div>
                            <div className="font-mono text-right shrink-0">
                              <span className="text-[10px] bg-rose-500/10 text-rose-300 border border-rose-500/20 px-2.5 py-1 rounded-md font-mono">
                                BBOX [{anom.bbox.join(', ')}]
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Branch B: Document OCR & IOC Parsing */}
              {activeScan.ocrAnalysis && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-mono font-semibold text-ink uppercase tracking-wider">
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span>Branch B: RapidOCR Threat & IOC Extractor</span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-line bg-inset text-xs font-mono text-ink-2 leading-relaxed max-h-28 overflow-y-auto">
                    <div className="text-[10px] text-ink-3 uppercase tracking-wider mb-1">Raw Extracted Text:</div>
                    {activeScan.ocrAnalysis.extractedText}
                  </div>

                  {/* IOC Pills */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 bg-inset rounded-xl border border-line space-y-2">
                      <div className="text-[11px] font-mono uppercase text-ink-3 tracking-wider">Flagged UPI Addresses:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {activeScan.ocrAnalysis.iocs.upiIds.map((u, i) => (
                          <span
                            key={i}
                            className="font-mono text-xs bg-rose-500/10 text-rose-300 border border-rose-500/20 px-2.5 py-0.5 rounded-md"
                          >
                            {u}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-3.5 bg-inset rounded-xl border border-line space-y-2">
                      <div className="text-[11px] font-mono uppercase text-ink-3 tracking-wider">Suspect Phone Numbers:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {activeScan.ocrAnalysis.iocs.phoneNumbers.map((ph, i) => (
                          <span
                            key={i}
                            className="font-mono text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2.5 py-0.5 rounded-md"
                          >
                            {ph}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Applicable Indian Law Statues */}
            {activeScan.legalClausesApplicable.length > 0 && (
              <div className="bg-surface border-[1.5px] border-line rounded-2xl p-6 shadow-card">
                <div className="flex items-center gap-2 text-xs font-mono uppercase text-ink-3 mb-3 tracking-wider">
                  <Lock className="w-4 h-4 text-ink-2" />
                  <span>Statutory Indian Cyber Law Citations Applicable:</span>
                </div>
                <div className="space-y-2">
                  {activeScan.legalClausesApplicable.map((clause, idx) => (
                    <div
                      key={idx}
                      className="text-xs font-mono p-3 rounded-xl bg-inset border border-line text-ink-2 flex items-center gap-2.5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                      <span>{clause}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Rail: Corsair Automations Trigger Card */}
          <div className="space-y-6">
            <div className="bg-surface border-[1.5px] border-line rounded-2xl p-6 shadow-card space-y-5">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold font-mono text-ink tracking-wide">
                  CORSAIR AUTONOMOUS DISPATCH
                </h3>
              </div>

              <p className="text-xs text-ink-2 leading-relaxed">
                When NETRA flags an incident exceeding the <strong className="text-ink font-semibold px-1.5 py-0.5 rounded bg-inset border border-line">60% Threat Threshold</strong>, Corsair autonomously orchestrates multi-platform remediation:
              </p>

              <div className="space-y-2 font-mono">
                <div className="p-2.5 rounded-xl bg-inset border border-line flex items-center gap-2.5 text-xs text-ink-2">
                  <CheckCircle2 className="w-4 h-4 text-pink-400 shrink-0" />
                  <span>Slack Broadcast (#cyber-threat-desk)</span>
                </div>
                <div className="p-2.5 rounded-xl bg-inset border border-line flex items-center gap-2.5 text-xs text-ink-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>GitHub Security Advisory with SHA-256</span>
                </div>
                <div className="p-2.5 rounded-xl bg-inset border border-line flex items-center gap-2.5 text-xs text-ink-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Emergency Triage on Google Calendar</span>
                </div>
                <div className="p-2.5 rounded-xl bg-inset border border-line flex items-center gap-2.5 text-xs text-ink-2">
                  <CheckCircle2 className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>CERT-In Legal Evidence FIR via Gmail</span>
                </div>
                <div className="p-2.5 rounded-xl bg-inset border border-line flex items-center gap-2.5 text-xs text-ink-2">
                  <CheckCircle2 className="w-4 h-4 text-[#25D366] shrink-0" />
                  <span>WhatsApp Citizen Security Alert</span>
                </div>
              </div>

              <div className="pt-2">
                {workflowResult ? (
                  <div className="space-y-3">
                    <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs font-mono text-emerald-300 flex items-center justify-between">
                      <span>✓ 5 Incident Actions Executed</span>
                      <span className="text-[10px] text-emerald-400 font-bold">{workflowResult.workflowId}</span>
                    </div>
                    <button
                      onClick={onNavigateToAutomations}
                      className="w-full py-2.5 px-4 rounded-xl bg-surface border border-line-strong hover:bg-hover text-ink font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-btn"
                    >
                      <span>View Corsair Orchestration</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : activeScan.riskScore >= 60 ? (
                  <button
                    onClick={() => {
                      const wf = dispatchWorkflow(activeScan);
                      setWorkflowResult(wf);
                      onScanComplete(activeScan, wf);
                      onNavigateToAutomations();
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-ink text-page hover:bg-white/90 active:scale-[0.99] font-sans text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-btn"
                  >
                    <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span>Trigger Corsair Response</span>
                  </button>
                ) : (
                  <div className="p-3.5 bg-inset border border-line rounded-xl text-xs font-mono text-ink-3 text-center">
                    Media verified authentic. Incident threshold (60%) not triggered.
                  </div>
                )}
              </div>
            </div>

            {/* Cryptographic SHA-256 Proof Card */}
            <div className="bg-surface border-[1.5px] border-line rounded-2xl p-5 shadow-card space-y-2.5 font-mono text-xs">
              <div className="text-[11px] text-ink-3 uppercase tracking-wider">SHA-256 Evidence Signature:</div>
              <div className="p-3 bg-inset rounded-xl border border-line text-[11px] text-ink-2 break-all select-all leading-relaxed font-mono">
                {activeScan.sha256}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
