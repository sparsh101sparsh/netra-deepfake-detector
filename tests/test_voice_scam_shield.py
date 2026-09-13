import os
import sys
import unittest

backend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from netra.services.voice_scam_lexicon import analyze_voice_scam_lexicon, normalize_transcript, extract_iocs
from netra.services.gnani_stt import transcribe_with_gnani


class TestVoiceScamShield(unittest.TestCase):

    def test_lallantop_transcript_scam_detection(self):
        """Tests that Lallantop Digital Arrest audio transcript is flagged as CONFIRMED_SCAM."""
        lallantop_transcript = (
            "परेशान करने वाले और धोखाधड़ी वाले आपने टैक्स संदेश भी नहीं कई लोगों ने "
            "रिपोर्ट दर्ज करवाई है आपके खिलाफ नहीं नहीं ऐसा तो कुछ नहीं है जी ये नंबर आपका ही है "
            "77503575125 03575125 ये नंबर आपका ही है आपका संपर्क नंबर चाहिए 9560462552 "
            "ऐसा किसने कराया 10 सितंबर को आप कहाँ पे थे किस स्टेट 10 सितंबर को"
        )
        res = analyze_voice_scam_lexicon(lallantop_transcript)
        self.assertTrue(res["is_scam"])
        self.assertEqual(res["verdict"], "CONFIRMED_SCAM")
        self.assertEqual(res["risk_level"], "HIGH")
        self.assertGreaterEqual(res["threat_score"], 90)
        self.assertIn("L", res["triggered_packs"])
        self.assertIn("C", res["triggered_packs"])

        # Check IOCs
        phones = res["extracted_iocs"]["phones"]
        self.assertTrue(any("9560462552" in p for p in phones))
        self.assertTrue(any("7750357512" in p for p in phones))

        # Check statutory citations
        self.assertIn("BNS 2023 Sec 204", res["legal_citations"])
        self.assertIn("IT Act 2000 Sec 66D", res["legal_citations"])

    def test_digital_arrest_exact_match(self):
        """Tests that direct digital arrest phrases trigger 96% score."""
        text = "सुनिए आपका डिजिटल अरेस्ट हो चुका है, कैमरा ऑन रखिए और फोन मत काटना।"
        res = analyze_voice_scam_lexicon(text)
        self.assertTrue(res["is_scam"])
        self.assertEqual(res["verdict"], "CONFIRMED_SCAM")
        self.assertIn("D", res["triggered_packs"])

    def test_kinship_extortion_match(self):
        """Tests that beta in jail + money ask triggers CONFIRMED_SCAM."""
        text = "मम्मी मैं थाने में हूँ एक्सीडेंट हो गया है, तुरंत वकील को बीस हजार रुपये यूपीआई कर दो।"
        res = analyze_voice_scam_lexicon(text)
        self.assertTrue(res["is_scam"])
        self.assertEqual(res["verdict"], "CONFIRMED_SCAM")
        self.assertEqual(res["scam_type"], "Kinship Emergency Extortion (Beta Arrested / Accident)")

    def test_benign_conversational_audio(self):
        """Tests that everyday family conversation remains AUTHENTIC."""
        text = "नमस्ते आंटी, आज शाम को डिनर के लिए क्या बना रहे हैं? मैं कॉलेज से 6 बजे आऊंगा।"
        res = analyze_voice_scam_lexicon(text)
        self.assertFalse(res["is_scam"])
        self.assertEqual(res["verdict"], "AUTHENTIC")
        self.assertEqual(res["risk_level"], "LOW")


if __name__ == "__main__":
    unittest.main()
