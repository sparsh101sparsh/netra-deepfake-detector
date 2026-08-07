"""
NETRA Amazon Bedrock Forensic Report Generator
Primary: Claude 3.5 Sonnet
Fallback: Amazon Nova Pro (ThrottlingException only)

The LLM NEVER sees raw video or frames.
It ONLY receives structured JSON evidence from the pipeline.
"""
import boto3
import json
import os
import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)

CLAUDE_MODEL_ID = os.getenv("BEDROCK_MODEL_ID", "anthropic.claude-3-5-sonnet-20241022-v2:0")
NOVA_PRO_MODEL_ID = os.getenv("BEDROCK_FALLBACK_MODEL_ID", "amazon.nova-pro-v1:0")
BEDROCK_REGION = os.getenv("BEDROCK_REGION", "us-east-1")

SYSTEM_PROMPT = """You are a senior digital forensics investigator specializing in deepfake detection for Indian media content. You receive structured JSON evidence from multiple specialized ML detectors.

Your job:
1. Synthesize all evidence into a coherent forensic assessment
2. Identify the most likely manipulation type
3. Provide a confidence-calibrated verdict
4. Write a professional, structured forensic report

CRITICAL RULES:
- Do NOT invent evidence not present in the JSON
- If information is missing, explicitly state it's unavailable
- Express uncertainty clearly when evidence is conflicting
- Never make definitive claims without supporting detector evidence
- Reference specific timestamps and frame numbers when available
- The detectors are ML models — they can produce false positives. Weigh evidence carefully."""

USER_PROMPT_TEMPLATE = """Evidence from NETRA Multi-Modal Deepfake Detection System:

{evidence_json}

Generate a professional forensic analysis report with these EXACT sections:

# NETRA FORENSIC ANALYSIS REPORT

## Overall Verdict
[One of: AI_FACE_SWAP | AI_GENERATED_FACE | VOICE_CLONE_ONLY | FACE_SWAP_WITH_VOICE_CLONE | EDITED_VIDEO | AUTHENTIC | INCONCLUSIVE]

## Confidence
[Percentage with brief rationale]

## Evidence Timeline
[Reference specific timestamps and frame numbers from the evidence]

## Audio Analysis
[If audio data present: analyze audio flags and segments. If unavailable: state clearly]

## Metadata Analysis
[Analyze any metadata anomalies found]

## Risk Assessment
[HIGH | MEDIUM | LOW | NEGLIGIBLE — with specific reasoning]

## Uncertainty Notes
[What additional evidence would change or strengthen this conclusion]

## Recommendation
[Flag for human review | Safe to publish | Requires expert examination]

Format as clean markdown. Be specific, cite evidence, avoid speculation."""


class BedrockForensicInvestigator:
    """Amazon Bedrock client for forensic report generation."""

    def __init__(self):
        self.client = boto3.client("bedrock-runtime", region_name=BEDROCK_REGION)
        self.available = True

    def generate_forensic_report(self, evidence_json: str) -> Dict:
        """
        Send structured evidence to Bedrock → get forensic report.
        Primary: Claude 3.5 Sonnet
        Fallback: Nova Pro (only on ThrottlingException)
        Returns: {full_report, generated_by, model_used}
        """
        # Truncate evidence to prevent token cost blowout
        safe_evidence = evidence_json[:8000]

        user_prompt = USER_PROMPT_TEMPLATE.format(evidence_json=safe_evidence)

        # Try Claude 3.5 Sonnet first
        try:
            report = self._invoke_claude(user_prompt)
            return {
                "full_report": report,
                "generated_by": "Amazon Bedrock (Claude 3.5 Sonnet)",
                "model_used": CLAUDE_MODEL_ID,
            }
        except Exception as e:
            error_str = str(e)
            if "ThrottlingException" in error_str or "throttl" in error_str.lower():
                logger.warning("Claude throttled — falling back to Nova Pro")
                return self._fallback_nova_pro(user_prompt)
            else:
                logger.error(f"Bedrock Claude error: {e}")
                return {
                    "full_report": self._fallback_template(safe_evidence),
                    "generated_by": "NETRA (Bedrock unavailable — template fallback)",
                    "model_used": "template",
                }

    def _invoke_claude(self, user_prompt: str) -> str:
        """Invoke Claude 3.5 Sonnet via Bedrock."""
        response = self.client.invoke_model(
            modelId=CLAUDE_MODEL_ID,
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 2000,
                "system": SYSTEM_PROMPT,
                "messages": [{"role": "user", "content": user_prompt}]
            })
        )
        result = json.loads(response["body"].read())
        return result["content"][0]["text"]

    def _fallback_nova_pro(self, user_prompt: str) -> Dict:
        """Fallback to Amazon Nova Pro if Claude is throttled."""
        try:
            response = self.client.invoke_model(
                modelId=NOVA_PRO_MODEL_ID,
                body=json.dumps({
                    "messages": [{"role": "user", "content": user_prompt}],
                    "inferenceConfig": {"max_new_tokens": 2000}
                })
            )
            result = json.loads(response["body"].read())
            content = result.get("output", {}).get("message", {}).get("content", [{}])[0].get("text", "")
            return {
                "full_report": content,
                "generated_by": "Amazon Bedrock (Nova Pro — fallback)",
                "model_used": NOVA_PRO_MODEL_ID,
            }
        except Exception as e:
            logger.error(f"Nova Pro fallback also failed: {e}")
            return {
                "full_report": self._fallback_template(""),
                "generated_by": "NETRA (Bedrock unavailable)",
                "model_used": "template",
            }

    def _fallback_template(self, evidence_json: str) -> str:
        """Emergency template when Bedrock is completely unavailable."""
        return """# NETRA FORENSIC ANALYSIS REPORT

## Overall Verdict
INCONCLUSIVE — Bedrock LLM unavailable for report generation

## Note
The NETRA ML detectors completed their analysis successfully. 
The forensic narrative report could not be generated because Amazon Bedrock was temporarily unavailable.

Please check the detector scores in the Evidence section for raw results.

## Recommendation
Review detector confidence scores manually. Re-submit for a complete forensic report."""
