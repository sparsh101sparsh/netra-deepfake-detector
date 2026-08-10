import os
import json
import joblib
from typing import Dict, Any
from openai import OpenAI

class ScamDetector:
    def __init__(self):
        # 1. Load the Random Forest and TF-IDF Vectorizer
        models_dir = os.path.join(os.path.dirname(__file__), "models")
        rf_path = os.path.join(models_dir, "scam_rf_model.pkl")
        tfidf_path = os.path.join(models_dir, "tfidf_vectorizer.pkl")
        
        try:
            self.vectorizer = joblib.load(tfidf_path)
            self.rf_model = joblib.load(rf_path)
            self.rf_loaded = True
            print("Successfully loaded Random Forest Scam Detector models.")
        except Exception as e:
            self.rf_loaded = False
            print(f"Failed to load RF models: {e}")

        # 2. Initialize Moonshot Kimi API client
        moonshot_key = os.getenv("MOONSHOT_API_KEY")
        if moonshot_key:
            self.openai_client = OpenAI(
                api_key=moonshot_key,
                base_url="https://api.moonshot.cn/v1",
            )
        else:
            self.openai_client = None
            print("Warning: MOONSHOT_API_KEY not set. Kimi LLM fallback disabled.")

    def _call_kimi_llm(self, text: str, rf_score: int) -> Dict[str, Any]:
        if not self.openai_client:
            return {
                "is_scam": rf_score > 50,
                "confidence": rf_score,
                "reason": "Moonshot API not available, relied on Random Forest.",
                "scam_type": "Unknown"
            }
            
        prompt = f"""
        You are the Forensic Judge for Project NETRA. Analyze the following text extracted from a video or image.
        Text: "{text}"
        Random Forest ML Probability Score: {rf_score}%
        
        Is this a scam? (Look for manipulative phrasing, financial demands, phishing links, or digital arrest patterns).
        
        Reply ONLY in raw JSON format with the following keys:
        {{
            "is_scam": true/false,
            "confidence": 0-100 (integer),
            "reason": "Short explanation (1-2 sentences) on exactly why it is a scam.",
            "scam_type": "phishing / romance / crypto / job_scam / digital_arrest / etc or None"
        }}
        """
        
        try:
            response = self.openai_client.chat.completions.create(
                model="moonshot-v1-8k",
                messages=[
                    {"role": "system", "content": "You are a specialized JSON-only scam detection API."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                max_tokens=200,
            )
            
            text_response = response.choices[0].message.content
            
            # Extract JSON from potential markdown blocks
            if "```json" in text_response:
                json_str = text_response.split("```json")[1].split("```")[0].strip()
            elif "```" in text_response:
                json_str = text_response.split("```")[1].strip()
            else:
                json_str = text_response.strip()
                
            return json.loads(json_str)
            
        except Exception as e:
            print(f"Moonshot Kimi Fallback failed: {e}")
            return {
                "is_scam": rf_score > 50,
                "confidence": rf_score,
                "reason": f"Fallback error: {str(e)[:50]}. Used RF engine.",
                "scam_type": "Unknown"
            }

    def detect(self, text: str) -> Dict[str, Any]:
        score = 0
        
        # Stage 1: Random Forest Inference
        if self.rf_loaded:
            try:
                X = self.vectorizer.transform([text.lower()])
                # predict_proba returns probabilities for [safe, scam]
                proba = self.rf_model.predict_proba(X)[0]
                score = int(proba[1] * 100)
            except Exception as e:
                print(f"RF Inference failed: {e}")
                
        # Fast Path: If Random Forest says it's extremely safe, skip LLM to save costs/time
        if score < 20:
            return {
                "is_scam": False,
                "confidence": 100 - score,
                "reason": "Random Forest detected no suspicious patterns.",
                "scam_type": "None",
                "risk_score": score,
                "matched_rules": [],
                "analysis_method": "random_forest",
            }
            
        # Stage 2: Kimi Deep Contextual Analysis
        llm_result = self._call_kimi_llm(text, score)
        
        llm_result["risk_score"] = score
        llm_result["matched_rules"] = []
        llm_result["analysis_method"] = "random_forest + moonshot_kimi_2.5"
        llm_result["llm_reason"] = llm_result.pop("reason", None)
        
        return llm_result

# Singleton instance
scam_detector_engine = ScamDetector()
