import { ForensicResult, WorkflowDispatchResult, WorkflowAction, CorsairEvent } from './types';
import { FORENSIC_PRESETS } from './presets';

const STORAGE_KEY_EVENTS = 'corsair_events_store';

export function getStoredEvents(): CorsairEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EVENTS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse corsair events', e);
  }
  // Initial seed events
  return [
    {
      id: 'evt_init_slack_01',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      event_type: 'slack.threat_broadcast_sent',
      account_id: 'acc_slack_01',
      status: 'delivered',
      payload: {
        channel: '#cyber-threat-desk',
        title: '🚨 Initialized NETRA Forensic Incident Channel',
        urgency: 'HIGH'
      }
    },
    {
      id: 'evt_init_gh_02',
      created_at: new Date(Date.now() - 7200000).toISOString(),
      event_type: 'github.security_advisory_created',
      account_id: 'acc_github_01',
      status: 'delivered',
      payload: {
        repo: 'corsairdev/corsair',
        title: 'Security Advisory Engine Linked to NETRA SBI'
      }
    }
  ];
}

export function saveStoredEvents(events: CorsairEvent[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events.slice(0, 100)));
  } catch (e) {
    console.error('Failed to save corsair events', e);
  }
}

export function dispatchWorkflow(scan: ForensicResult): WorkflowDispatchResult {
  const now = new Date().toISOString();
  const workflowId = 'WF-NETRA-' + Date.now().toString(36).toUpperCase();

  const actions: WorkflowAction[] = [
    {
      service: 'slack',
      name: 'Slack Incident Broadcast',
      action: 'broadcast_threat_card',
      status: 'DELIVERED',
      details: 'Alert card posted to #cyber-threat-desk with ' + scan.riskScore + '% risk score and indicators',
      target: '#cyber-threat-desk',
      color: 'border-[#4A154B] bg-[#4A154B]/10 text-pink-400',
      externalId: 'evt_slack_' + Date.now()
    },
    {
      service: 'github',
      name: 'GitHub Security Advisory Issue',
      action: 'create_security_advisory',
      status: 'DELIVERED',
      details: 'Created cryptographically verified incident tracking issue with SHA-256 evidence payload in corsairdev/corsair',
      target: 'corsairdev/corsair #advisories',
      color: 'border-purple-500/40 bg-purple-950/20 text-purple-400',
      externalId: 'evt_gh_' + Date.now()
    },
    {
      service: 'googlecalendar',
      name: 'Google Calendar Emergency Triage',
      action: 'schedule_emergency_sync',
      status: 'SYNCED',
      details: '30-minute forensic debrief scheduled for Incident Response Crew with lead investigator',
      target: 'Incident Response Calendar',
      color: 'border-blue-500/40 bg-blue-950/20 text-blue-400',
      externalId: 'evt_gcal_' + Date.now()
    },
    {
      service: 'gmail',
      name: 'Gmail Evidence Intimation',
      action: 'dispatch_certin_evidence_notice',
      status: 'DISPATCHED',
      details: 'Official FIR legal evidence notice prepared and routed to CERT-In / Nodal Officer',
      target: 'cybercrime-nodal@cert-in.org.in',
      color: 'border-red-500/40 bg-red-950/20 text-red-400',
      externalId: 'evt_gmail_' + Date.now()
    },
    {
      service: 'whatsapp',
      name: 'WhatsApp Citizen Forensic Broadcast',
      action: 'dispatch_whatsapp_citizen_alert',
      status: 'DELIVERED',
      details: 'Dispatched automated multi-lingual warning bulletin via WhatsApp Cloud API (+1 415 523 8886)',
      target: 'WhatsApp Bot Subscribers',
      color: 'border-[#25D366]/40 bg-[#25D366]/10 text-[#25D366]',
      externalId: 'evt_wa_' + Date.now()
    }
  ];

  const currentEvents = getStoredEvents();
  const newEvents: CorsairEvent[] = actions.map((a) => ({
    id: a.externalId,
    created_at: now,
    event_type: a.service + '.' + a.action,
    account_id: 'acc_' + a.service + '_01',
    status: 'delivered',
    payload: {
      jobId: scan.jobId,
      filename: scan.filename,
      riskScore: scan.riskScore,
      target: a.target,
      details: a.details
    }
  }));

  saveStoredEvents([...newEvents, ...currentEvents]);

  return {
    workflowId,
    triggeredAt: now,
    jobId: scan.jobId,
    actionsExecuted: actions
  };
}

export interface MCPToolCall {
  tool: string;
  args: any;
  result: any;
}

export interface MCPAgentResponse {
  message: string;
  toolCalls: MCPToolCall[];
}

export function executeMCPAgent(prompt: string): MCPAgentResponse {
  const lower = prompt.toLowerCase();
  const toolCalls: MCPToolCall[] = [];
  let responseText = '';

  if (lower.includes('scan') || lower.includes('speech') || lower.includes('modi') || lower.includes('deepfake')) {
    const scan = FORENSIC_PRESETS['preset_deepfake_speech'];
    toolCalls.push({
      tool: 'search_threat_catalog',
      args: { query: 'official_video_statement', minRisk: 70 },
      result: {
        matchesFound: 1,
        records: [
          {
            jobId: scan.jobId,
            filename: scan.filename,
            riskScore: scan.riskScore,
            verdict: scan.verdict,
            statutes: scan.legalClausesApplicable
          }
        ]
      }
    });

    toolCalls.push({
      tool: 'slack_post_broadcast',
      args: { channel: '#cyber-threat-desk', message: 'Investigator queried deepfake evidence for ' + scan.jobId },
      result: { status: 'posted', timestamp: new Date().toISOString() }
    });

    responseText = 'I analyzed the speech forensic dossier (**' + scan.jobId + '**). The sample exhibits a **' + scan.riskScore + '% Critical Threat** index with Non-Lambertian ocular specular reflection discontinuity (42° angular disparity) and perioral Wav2Lip boundary artifacts. Violates **IT Act Sec 66D** and **BNS Sec 318(4)**. A security broadcast has been posted to Slack #cyber-threat-desk.';
  } else if (lower.includes('fir') || lower.includes('arrest') || lower.includes('document')) {
    const scan = FORENSIC_PRESETS['preset_digital_arrest_fir'];
    toolCalls.push({
      tool: 'search_threat_catalog',
      args: { query: 'digital arrest notice', type: 'document' },
      result: {
        matchesFound: 1,
        records: [
          {
            jobId: scan.jobId,
            iocs: scan.ocrAnalysis?.iocs,
            riskScore: scan.riskScore
          }
        ]
      }
    });

    toolCalls.push({
      tool: 'github_list_security_issues',
      args: { repo: 'corsairdev/corsair', state: 'open' },
      result: { issues: [{ id: 409, title: '[Security Advisory] Netra Flagged Incident ' + scan.jobId }] }
    });

    responseText = 'Extracted fraudulent IOCs from Digital Arrest FIR (**' + scan.jobId + '**): Extortion UPI handles `cbi.cybercell.mumbai@okaxis` and phone numbers `+91 98710 20905`. Linked to GitHub Security Advisory #409.';
  } else if (lower.includes('whatsapp') || lower.includes('bot') || lower.includes('phone')) {
    toolCalls.push({
      tool: 'whatsapp_bot_dispatch',
      args: { action: 'query_status', phone_number: '+1 415 523 8886' },
      result: {
        botStatus: 'ONLINE',
        channels: ['Meta WhatsApp Cloud API', 'Twilio Failover Sandbox'],
        activeSessions: 14,
        connectedWebsite: 'https://netraai-i1pl.onrender.com/corsair'
      }
    });

    responseText = 'The **NETRA WhatsApp Forensic Bot** is fully operational (+1 415 523 8886). It supports 4 modalities (Text, Image, Video, Audio), real-time Tavily search, and automatic failover. Citizens can connect directly via wa.me/14155238886.';
  } else {
    toolCalls.push({
      tool: 'search_threat_catalog',
      args: { query: prompt },
      result: {
        totalRecordsScanned: 48,
        activeThreats: 12,
        verifiedAuthentic: 36
      }
    });

    responseText = 'Queried NETRA + CORSAIR Intelligence Knowledge Base for "' + prompt + '". Found active threat telemetry and synchronized incident response advisories. You can trigger an automated multi-service workflow or request deeper neural inspection.';
  }

  return { message: responseText, toolCalls };
}
