export interface AnomalyRegion {
  region: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x, y, w, h]
  description: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
}

export interface ForensicResult {
  jobId: string;
  filename: string;
  mediaType: 'image' | 'video_frame' | 'document';
  sha256: string;
  analyzedAt: string;
  branch: 'BRANCH_A_FACE' | 'BRANCH_B_DOCUMENT' | 'BRANCH_C_HYBRID';
  riskScore: number; // 0 - 100
  verdict: 'CRITICAL_THREAT' | 'ELEVATED_RISK' | 'AUTHENTIC_VERIFIED';
  faceAnalysis?: {
    facesDetected: number;
    fakeProbability: number;
    spatialSBIModelScore: number;
    anomalies: AnomalyRegion[];
  };
  ocrAnalysis?: {
    extractedText: string;
    iocs: {
      upiIds: string[];
      phoneNumbers: string[];
      fakeBadges: string[];
    };
    scamRisk: number;
    indicators: string[];
  };
  legalClausesApplicable: string[];
}

export interface WorkflowAction {
  service: 'slack' | 'github' | 'googlecalendar' | 'gmail' | 'whatsapp';
  action: string;
  status: 'SUCCESS' | 'QUEUED' | 'DELIVERED' | 'SYNCED' | 'DISPATCHED';
  details: string;
  target: string;
  externalId: string;
  color?: string;
  name?: string;
}

export interface WorkflowDispatchResult {
  workflowId: string;
  triggeredAt: string;
  jobId: string;
  actionsExecuted: WorkflowAction[];
}

export interface CorsairEvent {
  id: string;
  created_at: string;
  event_type: string;
  account_id: string;
  status: string;
  payload: any;
}

export interface MCPAgentResponse {
  message: string;
  toolCalls: Array<{
    tool: string;
    args: any;
    result: any;
  }>;
}

