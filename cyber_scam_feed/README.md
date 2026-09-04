# Live Cyber Scam Feed (Powered By Tavily)

A production-grade, real-time cyber threat intelligence pipeline and multi-channel alert dispatcher engineered in Python. The system continuously discovers, normalizes, deduplicates, and alerts on active national and regional cybercrime threats (Digital Arrest, Fake APK Trojans, Deepfake Impersonation, and Investment Syndicates) using the Tavily Search API.

---

## 🌟 Key Features

1. **Authentic Real-Time Intelligence Ingestion**:
   - High-precision search parameters against Tavily's `news` endpoint.
   - Zero synthetic or placeholder data — every alert corresponds to a live cybercrime report from major investigative reporting agencies (CBI, Supreme Court of India, The Hindu, Financial Express, Indian Express, PTI, Cyber Police).

2. **NLP Entity Normalization**:
   - **Monetary Loss Extraction**: Normalizes Indian Rupee currency formats (`₹150+ Crore`, `₹6,00,000`, `₹11 Crore`) into standardized display strings and machine-sortable float values.
   - **Threat Severity Assessment**: Automatically assigns `CRITICAL` (losses ≥ ₹1 Cr or targeting judicial/constitutional offices) or `HIGH` based on financial damage and exploit complexity.
   - **Geographic Impact**: Identifies affected jurisdictions (`Pan-India`, `Maharashtra (Mumbai/Pune)`, `Karnataka (Bengaluru)`, `NCR`, etc.).
   - **Modus Operandi (MO) Summarization**: Generates crisp, actionable 1-2 sentence descriptions of attacker techniques.

3. **Persistent Deduplication Engine**:
   - SQLite state store (`scam_feed.db`) with deterministic SHA-256 content hashes.
   - 100% duplicate suppression across consecutive runs.

4. **Broadcast Dispatch Ready**:
   - WhatsApp broadcast templates with formatted markdown.

5. **Visual Feed Dashboard**:
   - Standalone dark-mode HTML dashboard (`dashboard.html`) faithfully recreating the obsidian dark-mode interface seen in the reference UI.
   - Exported machine-readable `feed.json` schema.

---

## 🚀 Quickstart

### 1. Requirements
- Python 3.10+ (Standard library only; zero external pip dependencies required).
- Tavily API key (auto-detected from environment or Antigravity MCP config).

### 2. Run Single Intelligence Sync
```bash
python3 -m cyber_scam_feed.main --run
```

### 3. Run with WhatsApp Alert Previews
```bash
python3 -m cyber_scam_feed.main --run --previews
```

### 4. Continuous 24-Hour Synchronization Daemon
```bash
python3 -m cyber_scam_feed.main --sync --interval-hours 24
```

### 5. Run Empirical Verification & Multi-Run Analysis
```bash
python3 cyber_scam_feed/run_and_analyze.py
```

### 6. Run Automated Test Suite
```bash
python3 -m unittest discover -s cyber_scam_feed/tests
```

---

## 📁 Architecture Overview

```
cyber_scam_feed/
├── __init__.py               # Package metadata
├── config.py                 # API keys, scam search vectors, trusted domains
├── models.py                 # Typed data models (ScamReport, FeedSummary)
├── tavily_engine.py          # Tavily search client with retries & thread pool
├── nlp_extractor.py          # Loss, location, severity, and MO extractors
├── storage.py                # SQLite persistence and deduplication engine
├── notifications.py          # Telegram & WhatsApp broadcast message formatters
├── dashboard.py              # Dark-mode HTML visual feed generator
├── pipeline.py               # Ingestion orchestrator
├── main.py                   # Unified CLI entrypoint
├── run_and_analyze.py        # Multi-run empirical verification script
└── tests/
    └── test_feed.py          # Comprehensive unit test suite
```
