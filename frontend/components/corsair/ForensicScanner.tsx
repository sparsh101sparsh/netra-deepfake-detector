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
      <div className="bg-[#0c121e] border border-cyan-900/40 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg shadow-cyan-950/20">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <h2 className="text-lg font-bold text-white tracking-wide">NETRA MULTI-MODAL FORENSICS ENGINE</h2>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-semibold">
              DUAL-BRANCH ROUTER ACTIVE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time deepfake waveform & spatial anomaly detection coupled with RapidOCR fraud catalog indexing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Corsair Incident Engine:</span>
          <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded-md flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" /> AUTO-DISPATCH ENABLED
          </span>
        </div>
      </div>

      {/* Preset Selection Deck */}
      <div className="bg-[#090e17] border border-slate-800 rounded-xl p-5">
        <h3 className="text-xs font-semibold uppercase font-mono text-slate-400 mb-3 tracking-wider">
          SELECT FORENSIC TEST CASE / THREAT SAMPLE:
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                className={`p-3.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-cyan-500 bg-cyan-950/30 shadow-md shadow-cyan-950/50 ring-1 ring-cyan-500/50'
                    : 'border-slate-800 bg-[#0c121e]/60 hover:border-slate-700 hover:bg-slate-900/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5 font-mono">
                    <span className="text-slate-400 truncate max-w-[140px]">{p.type}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        isCrit
                          ? 'bg-red-950/80 text-red-400 border border-red-800/60'
                          : isClean
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                          : 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                      }`}
                    >
                      {p.risk}% RISK
                    </span>
                  </div>
                  <div className="text-xs font-medium text-slate-200 line-clamp-2 leading-snug">
                    {p.name}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>{isCrit ? '🚨 Threat Detected' : isClean ? '✅ Clean Audio/Video' : '⚠️ Elevated Risk'}</span>
                  {isSelected && <span className="text-cyan-400">● Active</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="bg-[#090e17] border border-cyan-900/50 rounded-xl p-8 text-center space-y-3">
          <div className="inline-block w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-xs font-mono text-cyan-400 tracking-wider">
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
            <div className="bg-[#090e17] border border-slate-800 rounded-xl p-5">
              <div className="flex flex-wrap justify-between items-center gap-2 pb-4 border-b border-slate-800/80 font-mono text-xs">
                <div>
                  <span className="text-slate-500">JOB ID: </span>
                  <span className="text-cyan-400 font-bold">{activeScan.jobId}</span>
                </div>
                <div>
                  <span className="text-slate-500">MEDIA: </span>
                  <span className="text-slate-300 font-medium">{activeScan.filename}</span>
                </div>
                <div>
                  <span className="text-slate-500">TIMESTAMP: </span>
                  <span className="text-slate-400">{new Date(activeScan.analyzedAt).toLocaleTimeString()}</span>
                </div>
              </div>

              {/* Branch Verdict Card */}
              <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-lg bg-slate-900/40 border border-slate-800">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      activeScan.riskScore >= 75
                        ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                        : activeScan.riskScore >= 40
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
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
                    <div className="text-xs font-mono uppercase text-slate-400">Composite Verdict</div>
                    <div
                      className={`text-xl font-bold font-mono tracking-wide ${
                        activeScan.riskScore >= 75
                          ? 'text-red-400'
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
                  <div className="text-3xl font-black tracking-tight text-white">
                    {activeScan.riskScore}
                    <span className="text-sm font-normal text-slate-500">/100</span>
                  </div>
                  <div className="text-[11px] text-slate-400">NETRA THREAT INDEX</div>
                </div>
              </div>

              {/* Branch A: Facial Deepfake Analysis */}
              {activeScan.faceAnalysis && (
                <div className="mt-5 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-mono font-semibold text-cyan-400 uppercase tracking-wider">
                    <Eye className="w-4 h-4" />
                    <span>Branch A: Facial SBI & Ocular Discontinuity Analysis</span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 font-mono text-center text-xs">
                    <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800">
                      <div className="text-slate-400 text-[10px] uppercase">Faces Tracked</div>
                      <div className="text-lg font-bold text-white mt-1">
                        {activeScan.faceAnalysis.facesDetected}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800">
                      <div className="text-slate-400 text-[10px] uppercase">Synth Probability</div>
                      <div className="text-lg font-bold text-red-400 mt-1">
                        {(activeScan.faceAnalysis.fakeProbability * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800">
                      <div className="text-slate-400 text-[10px] uppercase">Spatial SBI Score</div>
                      <div className="text-lg font-bold text-cyan-400 mt-1">
                        {activeScan.faceAnalysis.spatialSBIModelScore}
                      </div>
                    </div>
                  </div>

                  {/* Anomaly Bounding Box Items */}
                  {activeScan.faceAnalysis.anomalies.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wide">
                        Localized Spatial Anomaly Boundaries:
                      </div>
                      <div className="space-y-2">
                        {activeScan.faceAnalysis.anomalies.map((anom, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-lg border border-slate-800 bg-[#0c121e] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs"
                          >
                            <div className="space-y-1">
                              <div className="font-mono font-semibold text-slate-200 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-400"></span>
                                {anom.region}
                              </div>
                              <div className="text-slate-400 text-[11px] leading-relaxed">
                                {anom.description}
                              </div>
                            </div>
                            <div className="font-mono text-right shrink-0">
                              <span className="text-[10px] bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded">
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
                <div className="mt-5 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-mono font-semibold text-amber-400 uppercase tracking-wider">
                    <FileText className="w-4 h-4" />
                    <span>Branch B: RapidOCR Threat & IOC Extractor</span>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-800 bg-[#0c121e] text-xs font-mono text-slate-300 leading-relaxed max-h-28 overflow-y-auto">
                    <div className="text-[10px] text-slate-500 uppercase mb-1">Raw Extracted Text:</div>
                    {activeScan.ocrAnalysis.extractedText}
                  </div>

                  {/* IOC Pills */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800 space-y-2">
                      <div className="text-[11px] font-mono uppercase text-slate-400">Flagged UPI Addresses:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {activeScan.ocrAnalysis.iocs.upiIds.map((u, i) => (
                          <span
                            key={i}
                            className="font-mono text-xs bg-red-950/60 text-red-300 border border-red-800/80 px-2 py-0.5 rounded"
                          >
                            {u}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800 space-y-2">
                      <div className="text-[11px] font-mono uppercase text-slate-400">Suspect Phone Numbers:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {activeScan.ocrAnalysis.iocs.phoneNumbers.map((ph, i) => (
                          <span
                            key={i}
                            className="font-mono text-xs bg-amber-950/60 text-amber-300 border border-amber-800/80 px-2 py-0.5 rounded"
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
              <div className="bg-[#090e17] border border-slate-800 rounded-xl p-5">
                <div className="flex items-center gap-2 text-xs font-mono uppercase text-slate-400 mb-3 tracking-wider">
                  <Lock className="w-4 h-4 text-cyan-400" />
                  <span>Statutory Indian Cyber Law Citations Applicable:</span>
                </div>
                <div className="space-y-2">
                  {activeScan.legalClausesApplicable.map((clause, idx) => (
                    <div
                      key={idx}
                      className="text-xs font-mono p-2.5 rounded bg-[#0c121e] border border-slate-800/80 text-slate-300 flex items-center gap-2.5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0"></span>
                      <span>{clause}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Rail: Corsair Automations Trigger Card */}
          <div className="space-y-6">
            <div className="bg-gradient-to-b from-[#0c1626] to-[#090e17] border border-cyan-900/60 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold font-mono text-white tracking-wide">
                  CORSAIR AUTONOMOUS DISPATCH
                </h3>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                When NETRA flags an incident exceeding the <strong className="text-cyan-400">60% Threat Threshold</strong>, Corsair autonomously orchestrates multi-platform remediation:
              </p>

              <div className="space-y-2.5 text-xs font-mono">
                <div className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-pink-400 shrink-0" />
                  <span>Slack Broadcast (#cyber-threat-desk)</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>GitHub Security Advisory with SHA-256</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Emergency Triage on Google Calendar</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-red-400 shrink-0" />
                  <span>CERT-In Legal Evidence FIR via Gmail</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-[#25D366] shrink-0" />
                  <span>WhatsApp Citizen Security Alert</span>
                </div>
              </div>

              <div className="pt-2">
                {workflowResult ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-lg text-xs font-mono text-emerald-300 flex items-center justify-between">
                      <span>✓ 5 Incident Actions Executed</span>
                      <span className="text-[10px] text-emerald-400 font-bold">{workflowResult.workflowId}</span>
                    </div>
                    <button
                      onClick={onNavigateToAutomations}
                      className="w-full py-2.5 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-900/40"
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
                    className="w-full py-2.5 px-4 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-900/40"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Trigger Corsair Response</span>
                  </button>
                ) : (
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-400 text-center">
                    Media verified authentic. Incident threshold (60%) not triggered.
                  </div>
                )}
              </div>
            </div>

            {/* Cryptographic SHA-256 Proof Card */}
            <div className="bg-[#090e17] border border-slate-800 rounded-xl p-4 space-y-2 font-mono text-xs">
              <div className="text-[11px] text-slate-500 uppercase tracking-wider">SHA-256 Evidence Signature:</div>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800/80 text-[11px] text-cyan-400 break-all select-all">
                {activeScan.sha256}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
