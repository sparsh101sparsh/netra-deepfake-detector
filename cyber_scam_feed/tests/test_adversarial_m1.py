"""
Adversarial Stress Test Suite for Milestone 1:
NLP Entity Extraction, Date Normalization, and Alert Formatting.

Challenges:
1. extract_financial_loss:
   - Tricky decimal amounts, large scales, zero amounts, multiple amounts
   - Word boundary false triggers ("crimes", "crowd", "crew", "crooks", "crisis", "credit", "criteria")
   - Plural forms ("crores", "lakhs", "crs", "lacs")
2. normalize_published_date:
   - Weird, malformed, non-standard, empty, None, and non-string dates
   - Non-leap year edge cases (e.g. 2026-02-29)
   - RFC-2822, ISO-8601 with fractional seconds / offsets, slash-separated dates
"""

import unittest
import re
from datetime import datetime, timezone

from cyber_scam_feed.models import ScamReport
from cyber_scam_feed.nlp_extractor import (
    extract_financial_loss,
    normalize_published_date,
    extract_category,
    extract_severity,
    extract_location,
    extract_publisher,
    parse_raw_tavily_result
)
from cyber_scam_feed.notifications import AlertNotifier


class TestFinancialLossAdversarial(unittest.TestCase):
    """Adversarial stress testing of financial loss extraction regex engine."""

    def test_false_triggers_word_boundary(self):
        """Ensure words starting with 'cr' or containing 'cr' do NOT falsely trigger loss extraction."""
        false_triggers = [
            ("Police arrested 10 criminals for 5 crimes across the state", "criminals / crimes"),
            ("A crowd of 50 people gathered outside the police station", "crowd"),
            ("The airline deployed 6 crew members on the rescue flight", "crew"),
            ("Special cell busted a gang of 4 crooks operating from Nuh", "crooks"),
            ("Country witnessed 2 major financial crisis episodes this decade", "crisis"),
            ("Victim was issued 50 credit cards illegally without KYC", "credit"),
            ("The committee evaluated 10 criteria before blacklisting the app", "criteria"),
            ("Traffic halted at 2 railway crossings during police pursuit", "crossings"),
            ("Fraudsters stole 3 antique crown ornaments from museum", "crown"),
            ("Security engine identified 100 crawling bot instances", "crawling"),
            ("Forensic team recovered 2 cross-cut paper documents", "cross-cut"),
            ("Enforcement agency raided 5 crack houses in joint operation", "crack houses"),
            ("Local artisans designed 2 craft models for the awareness campaign", "craft"),
            ("The highway patrol recorded 3 crash incidents in heavy fog", "crash"),
            ("Environmental activists cleaned 5 lakes in Bengaluru", "lakes"),
            ("Smugglers attempted to transport 10 lacquer wooden boxes", "lacquer"),
            ("The cyber cell analyzed 20 credential stuffing attempts", "credential"),
            ("The attacker exploited 4 cryptographic flaws in the protocol", "crypto flaws"),
        ]

        for text, label in false_triggers:
            loss_str, val = extract_financial_loss(text)
            self.assertEqual(
                val, 0.0,
                f"False trigger '{label}' improperly extracted {val} ({loss_str}) from: '{text}'"
            )
            self.assertEqual(
                loss_str, "Loss Under Investigation",
                f"Expected 'Loss Under Investigation' for '{label}', got '{loss_str}'"
            )

    def test_valid_abbreviations_and_decimals(self):
        """Test tricky amounts, decimal amounts, and cr/lakh variations."""
        cases = [
            ("Cyber gang siphons off Rs. 10.5 cr from retired doctor", 105_000_000.0, "10.5"),
            ("Elderly woman duped of Rs 0.75 crore in fake CBI probe", 7_500_000.0, "0.75"),
            ("Victim lost ₹ 0.5 Lakh in electricity bill phishing", 50_000.0, "0.5"),
            ("Scam worth INR 12.34 Cr uncovered in Hyderabad", 123_400_000.0, "12.34"),
            ("Looted Rs 10.5cr in digital arrest scam", 105_000_000.0, "10.5"),
            ("Defrauded of Rs 10.5 cr. through APK sideload", 105_000_000.0, "10.5"),
            ("Stole ₹100 Crore in multi-state syndicate", 1_000_000_000.0, "100"),
            ("Victim lost Rs 43 lakh in fake stock trading", 4_300_000.0, "43"),
            ("Scammers took ₹6,00,000 via malicious banking app", 600_000.0, "6,00,000"),
            ("Loss of Rs 1,50,00,000 in investment trap", 15_000_000.0, "1,50,00,000"),
            ("Lost Rs 50,000 through UPI QR code fraud", 50_000.0, "50,000"),
        ]

        for text, expected_val, expected_sub in cases:
            loss_str, val = extract_financial_loss(text)
            self.assertEqual(
                val, expected_val,
                f"Expected {expected_val} from '{text}', got {val}"
            )
            self.assertIn(
                expected_sub, loss_str,
                f"Expected substring '{expected_sub}' in '{loss_str}'"
            )

    def test_zero_and_qualitative_amounts(self):
        """Test zero amounts, negligible loss, or purely qualitative reports."""
        cases = [
            ("Victim filed complaint with Rs. 0 financial loss", 0.0),
            ("Police prevented fraud; reported ₹0 loss to customer", 0.0),
            ("Fraudsters attempted extortion but victim suffered 0 crore loss", 0.0),
            ("Prompt alert resulted in 0 lakh transferred", 0.0),
            ("Victim lost huge financial sum to fake trading group", 0.0),
            ("Life savings stolen by impersonators in Skype call", 0.0),
            ("Undisclosed amount siphoned from senior citizen account", 0.0),
        ]

        for text, expected_val in cases:
            loss_str, val = extract_financial_loss(text)
            self.assertEqual(
                val, expected_val,
                f"Expected {expected_val} for zero/qualitative case '{text}', got {val} ({loss_str})"
            )

    def test_multiple_amounts_prioritization(self):
        """Test behavior when multiple financial figures appear in the text."""
        # Text containing both a lakh and crore figure: crore should be prioritized
        text1 = "Gang demanded Rs 50 lakh upfront, but total scam uncovered is Rs 25 crore."
        loss_str1, val1 = extract_financial_loss(text1)
        self.assertEqual(val1, 250_000_000.0)
        self.assertIn("25", loss_str1)

        # Text with nationwide scale and victim count
        text2 = "Supreme Court directs CBI probe into Rs 150+ Crore nationwide scam across victims"
        loss_str2, val2 = extract_financial_loss(text2)
        self.assertEqual(val2, 1_500_000_000.0)
        self.assertIn("150", loss_str2)
        self.assertIn("Nationwide", loss_str2)

    def test_bug_plural_crores_extraction(self):
        """
        EMPIRICAL BUG 1: extract_financial_loss fails on plural 'crores' and 'crs'.
        Pattern r'(?:crore|cr)\b' fails because 's' in 'crores' prevents word boundary matching.
        """
        # Plural 'crores' with currency symbol
        loss_str1, val1 = extract_financial_loss("Victims lost Rs 15 crores in scam")
        self.assertEqual(
            val1, 150_000_000.0,
            f"BUG: extract_financial_loss failed on plural 'crores': got {val1} ({loss_str1})"
        )

        # Standalone 'crores' without Rs prefix
        loss_str2, val2 = extract_financial_loss("Scam of 100 crores nationwide")
        self.assertEqual(
            val2, 1_000_000_000.0,
            f"BUG: extract_financial_loss failed on standalone 'crores': got {val2} ({loss_str2})"
        )

    def test_bug_inr_prefix_on_comma_numbers(self):
        r"""
        EMPIRICAL BUG 2: extract_financial_loss fails on 'INR 5,00,000'.
        Pattern r'(?:₹|Rs\.?)\s*...' omits 'INR' prefix, unlike crore and lakh patterns.
        """
        loss_str, val = extract_financial_loss("Victim lost INR 5,00,000 in banking fraud")
        self.assertEqual(
            val, 500_000.0,
            f"BUG: extract_financial_loss failed on 'INR 5,00,000': got {val} ({loss_str})"
        )


class TestDateNormalizationAdversarial(unittest.TestCase):
    """Adversarial stress testing of date parser and normalizer."""

    def test_none_empty_and_non_string_inputs(self):
        """Ensure date normalizer never throws exceptions on unexpected types or empty values."""
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        bad_inputs = [
            None,
            "",
            "   ",
            "\t\n\r",
            1234567890,
            123.456,
            [],
            {},
            object(),
        ]
        for item in bad_inputs:
            res = normalize_published_date(item)
            self.assertEqual(res, today, f"Failed fallback for type {type(item)}: {res}")

    def test_invalid_calendar_dates_and_leap_years(self):
        """Test impossible dates (e.g. Feb 29 in non-leap year 2026, month 13, day 32)."""
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        # 2026 is NOT a leap year: Feb 29 is invalid calendar date
        self.assertEqual(normalize_published_date("2026-02-29"), today)

        # 2024 IS a leap year: Feb 29 is valid
        self.assertEqual(normalize_published_date("2024-02-29"), "2024-02-29")

        # Invalid month 13, day 32, month 00
        self.assertEqual(normalize_published_date("2026-13-01"), today)
        self.assertEqual(normalize_published_date("2026-01-32"), today)
        self.assertEqual(normalize_published_date("2026-00-00"), today)
        self.assertEqual(normalize_published_date("2026-04-31"), today)  # April has 30 days

        # Out-of-bounds year
        self.assertEqual(normalize_published_date("10000-01-01"), today)

        # Boundary years
        self.assertEqual(normalize_published_date("9999-12-31"), "9999-12-31")
        self.assertEqual(normalize_published_date("0001-01-01"), "0001-01-01")

    def test_rfc2822_variations(self):
        """Test varied RFC-2822 timestamps from Indian and global news RSS feeds."""
        self.assertEqual(
            normalize_published_date("Sat, 09 Mar 2026 12:00:00 GMT"),
            "2026-03-09"
        )
        self.assertEqual(
            normalize_published_date("Thu, 03 Sep 2026 06:34:33 +0530"),
            "2026-09-03"
        )
        self.assertEqual(
            normalize_published_date("09 Mar 2026 14:20:00 +0000"),
            "2026-03-09"
        )
        self.assertEqual(
            normalize_published_date("Tue, 01 Dec 2026 00:00:00 -0500"),
            "2026-12-01"
        )

    def test_iso8601_and_news_formats(self):
        """Test ISO-8601 timestamps with varied precision and common human-readable formats."""
        self.assertEqual(normalize_published_date("2026-09-03"), "2026-09-03")
        self.assertEqual(normalize_published_date("2026-09-03T01:04:33Z"), "2026-09-03")
        self.assertEqual(normalize_published_date("2026-09-03T06:34:33.123456+05:30"), "2026-09-03")
        self.assertEqual(normalize_published_date("2026-09-03 14:00:00"), "2026-09-03")

        # Human news date formats
        self.assertEqual(normalize_published_date("3 Sep 2026"), "2026-09-03")
        self.assertEqual(normalize_published_date("03 September 2026"), "2026-09-03")
        self.assertEqual(normalize_published_date("Sep 03, 2026"), "2026-09-03")
        self.assertEqual(normalize_published_date("September 3, 2026"), "2026-09-03")
        self.assertEqual(normalize_published_date("2026/09/03"), "2026-09-03")
        self.assertEqual(normalize_published_date("03/09/2026"), "2026-09-03")

    def test_bug_hyphenated_date_edge_cases(self):
        """
        EMPIRICAL BUG 3: normalize_published_date fails to parse DD-MM-YYYY ('15-05-2026').
        Silently falls back to today's date because '%d-%m-%Y' is missing from format tuple.
        """
        self.assertEqual(
            normalize_published_date("15-05-2026"), "2026-05-15",
            "BUG: normalize_published_date failed to parse DD-MM-YYYY ('15-05-2026')"
        )

    def test_arbitrary_unparseable_strings(self):
        """Relative or garbage strings safely fall back to current UTC date."""
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        for s in ["yesterday", "2 hours ago", "just now", "breaking news", "N/A", "undefined"]:
            self.assertEqual(normalize_published_date(s), today)


if __name__ == "__main__":
    unittest.main()

