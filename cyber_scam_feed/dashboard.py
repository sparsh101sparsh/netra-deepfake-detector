"""
Interactive HTML Dashboard Generator for Live Cyber Scam Feed.
Faithfully renders the exact obsidian dark-theme interface specified in the reference design.
"""

from typing import List
from datetime import datetime
import json

from cyber_scam_feed.models import ScamReport, FeedSummary


def generate_html_dashboard(summary: FeedSummary) -> str:
    """Generate modern, responsive standalone HTML file matching the reference UI."""
    reports = summary.reports
    verified_count = len(reports)
    critical_count = sum(1 for r in reports if r.severity == "CRITICAL")
    high_count = sum(1 for r in reports if r.severity == "HIGH")

    cards_html = []
    for r in reports:
        sev_class = "badge-critical" if r.severity == "CRITICAL" else "badge-high"
        sev_dot = "dot-critical" if r.severity == "CRITICAL" else "dot-high"

        # Safe attribute escapes
        title_esc = r.title.replace('"', '&quot;')
        summary_esc = r.summary.replace('"', '&quot;')
        source_esc = r.source_display.replace('"', '&quot;')
        location_esc = r.location.replace('"', '&quot;')

        card = f"""
        <article class="scam-card" data-category="{r.category}" data-severity="{r.severity}">
            <div class="card-thumb-container">
                <img src="{r.image_url}" alt="{r.category}" class="card-thumb" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=400&q=80'" />
                <span class="category-tag">{r.category}</span>
            </div>
            <div class="card-content">
                <div class="card-header-meta">
                    <div class="source-info">
                        <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                            <line x1="8" y1="21" x2="16" y2="21"></line>
                            <line x1="12" y1="17" x2="12" y2="21"></line>
                        </svg>
                        <span class="source-name">{source_esc}</span>
                    </div>
                    <div class="date-info">
                        <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke_width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        <span>{r.published_date}</span>
                    </div>
                </div>

                <h3 class="card-title">
                    <a href="{r.url}" target="_blank" rel="noopener noreferrer">{title_esc}</a>
                </h3>

                <p class="card-summary">{summary_esc}</p>

                <div class="card-footer-tags">
                    <div class="footer-left-tags">
                        <span class="pill-badge {sev_class}">
                            <span class="pulse-dot {sev_dot}"></span>
                            {r.severity}
                        </span>
                        <span class="pill-badge pill-loss">
                            Loss: {r.financial_loss_str}
                        </span>
                        <span class="pill-badge pill-location">
                            <svg class="loc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                            {location_esc}
                        </span>
                    </div>
                    <a href="{r.url}" target="_blank" rel="noopener noreferrer" class="read-news-link">
                        Read News ↗
                    </a>
                </div>
            </div>
        </article>
        """
        cards_html.append(card)

    rendered_cards = "\n".join(cards_html)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Live Cyber Scam Feed (Powered By Tavily)</title>
    <style>
        :root {{
            --bg-base: #111215;
            --bg-card: #18191e;
            --bg-card-hover: #202228;
            --border-color: #272a33;
            --border-hover: #3a3f4d;
            --text-primary: #f0f2f5;
            --text-secondary: #9da4b3;
            --text-muted: #6b7280;
            --accent-red: #ef4444;
            --accent-red-bg: rgba(239, 68, 68, 0.12);
            --accent-amber: #f59e0b;
            --accent-amber-bg: rgba(245, 158, 11, 0.12);
            --accent-green: #10b981;
            --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }}

        * {{
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }}

        body {{
            background-color: var(--bg-base);
            color: var(--text-primary);
            font-family: var(--font-family);
            min-height: 100vh;
            padding: 32px 20px;
            display: flex;
            justify-content: center;
        }}

        .feed-container {{
            width: 100%;
            max-width: 900px;
            margin: 0 auto;
        }}

        /* Header section */
        .feed-header {{
            display: flex;
            align-items: flex-start;
            gap: 16px;
            margin-bottom: 24px;
        }}

        .header-icon-box {{
            width: 52px;
            height: 52px;
            background: #1c1e24;
            border: 1px solid var(--border-color);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }}

        .header-icon-box svg {{
            width: 26px;
            height: 26px;
            color: #94a3b8;
        }}

        .header-titles {{
            flex: 1;
        }}

        .header-title-row {{
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 12px;
            margin-bottom: 6px;
        }}

        .header-title-row h1 {{
            font-size: 24px;
            font-weight: 700;
            letter-spacing: -0.02em;
            color: #ffffff;
        }}

        .tavily-pill {{
            font-size: 13px;
            font-weight: 600;
            background: #242730;
            color: #cbd5e1;
            padding: 4px 12px;
            border-radius: 9999px;
            border: 1px solid #333846;
        }}

        .header-subtitle {{
            font-size: 14px;
            color: var(--text-secondary);
            margin-bottom: 18px;
        }}

        /* Top control / status bar */
        .status-bar {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 12px;
            padding-bottom: 20px;
            border-bottom: 1px solid var(--border-color);
            margin-bottom: 24px;
        }}

        .status-left {{
            display: flex;
            align-items: center;
            gap: 10px;
        }}

        .badge-live {{
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: #1c1f27;
            border: 1px solid #353b49;
            color: #f1f5f9;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.05em;
            padding: 6px 14px;
            border-radius: 9999px;
            text-transform: uppercase;
        }}

        .badge-count {{
            background: #1c1f27;
            border: 1px solid #2e3340;
            color: #94a3b8;
            font-size: 12px;
            font-weight: 500;
            padding: 6px 12px;
            border-radius: 9999px;
        }}

        .status-right {{
            text-align: right;
            font-size: 12px;
        }}

        .sync-active {{
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 6px;
            color: #10b981;
            font-weight: 600;
            margin-bottom: 2px;
        }}

        .sync-note {{
            color: var(--text-muted);
        }}

        /* Pulsing indicator dots */
        .pulse-dot {{
            width: 8px;
            height: 8px;
            border-radius: 50%;
            display: inline-block;
        }}

        .dot-green {{
            background-color: #10b981;
            box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
        }}

        .dot-white {{
            background-color: #ffffff;
            box-shadow: 0 0 8px rgba(255, 255, 255, 0.8);
            animation: pulse-animation 1.5s infinite;
        }}

        .dot-critical {{
            background-color: var(--accent-red);
            box-shadow: 0 0 6px rgba(239, 68, 68, 0.7);
        }}

        .dot-high {{
            background-color: var(--accent-amber);
            box-shadow: 0 0 6px rgba(245, 158, 11, 0.7);
        }}

        @keyframes pulse-animation {{
            0% {{ transform: scale(0.95); opacity: 0.6; }}
            50% {{ transform: scale(1.15); opacity: 1; }}
            100% {{ transform: scale(0.95); opacity: 0.6; }}
        }}

        /* Filter Controls */
        .filter-controls {{
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-bottom: 20px;
        }}

        .search-input-wrapper {{
            position: relative;
            width: 100%;
        }}

        .search-icon {{
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            width: 16px;
            height: 16px;
            color: var(--text-muted);
            pointer-events: none;
        }}

        .search-input-wrapper input {{
            width: 100%;
            background: #181a20;
            border: 1px solid var(--border-color);
            border-radius: 10px;
            padding: 10px 14px 10px 40px;
            color: #ffffff;
            font-size: 13px;
            outline: none;
            transition: border-color 0.15s, background 0.15s;
        }}

        .search-input-wrapper input:focus {{
            border-color: #3b82f6;
            background: #1e2129;
        }}

        .search-input-wrapper input::placeholder {{
            color: #64748b;
        }}

        .category-tabs {{
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }}

        .cat-btn {{
            background: #1b1d24;
            border: 1px solid var(--border-color);
            color: var(--text-secondary);
            font-size: 12px;
            font-weight: 500;
            padding: 6px 14px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.15s;
        }}

        .cat-btn:hover {{
            background: #232630;
            color: #ffffff;
            border-color: var(--border-hover);
        }}

        .cat-btn.active {{
            background: #2d3342;
            color: #ffffff;
            border-color: #4b5563;
            font-weight: 600;
        }}

        .no-results-msg {{
            text-align: center;
            padding: 40px 20px;
            color: var(--text-muted);
            font-size: 14px;
            background: var(--bg-card);
            border: 1px dashed var(--border-color);
            border-radius: 12px;
        }}

        /* Scam Cards Feed */
        .cards-feed {{
            display: flex;
            flex-direction: column;
            gap: 16px;
        }}

        .scam-card {{
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 14px;
            padding: 18px;
            display: flex;
            gap: 20px;
            transition: all 0.2s ease-in-out;
        }}

        .scam-card:hover {{
            background: var(--bg-card-hover);
            border-color: var(--border-hover);
            transform: translateY(-2px);
        }}

        .card-thumb-container {{
            position: relative;
            width: 130px;
            height: 120px;
            border-radius: 10px;
            overflow: hidden;
            flex-shrink: 0;
            background: #0d0e12;
        }}

        .card-thumb {{
            width: 100%;
            height: 100%;
            object-fit: cover;
            filter: brightness(0.85) contrast(1.1);
        }}

        .category-tag {{
            position: absolute;
            top: 8px;
            left: 8px;
            background: rgba(15, 17, 21, 0.85);
            backdrop-filter: blur(4px);
            color: #ffffff;
            font-size: 11px;
            font-weight: 600;
            padding: 3px 8px;
            border-radius: 6px;
            border: 1px solid rgba(255, 255, 255, 0.15);
        }}

        .card-content {{
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }}

        .card-header-meta {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 13px;
            color: var(--text-secondary);
            margin-bottom: 8px;
        }}

        .source-info, .date-info {{
            display: flex;
            align-items: center;
            gap: 6px;
        }}

        .meta-icon {{
            width: 14px;
            height: 14px;
            color: var(--text-muted);
        }}

        .card-title {{
            font-size: 16px;
            font-weight: 600;
            line-height: 1.4;
            margin-bottom: 8px;
        }}

        .card-title a {{
            color: #f8fafc;
            text-decoration: none;
            transition: color 0.15s;
        }}

        .card-title a:hover {{
            color: #38bdf8;
        }}

        .card-summary {{
            font-size: 13px;
            color: var(--text-secondary);
            line-height: 1.5;
            margin-bottom: 14px;
        }}

        .card-footer-tags {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 10px;
        }}

        .footer-left-tags {{
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 8px;
        }}

        .pill-badge {{
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            font-weight: 600;
            padding: 4px 10px;
            border-radius: 6px;
            background: #232630;
            border: 1px solid #333846;
            color: #e2e8f0;
        }}

        .badge-critical {{
            background: var(--accent-red-bg);
            border-color: rgba(239, 68, 68, 0.35);
            color: #fca5a5;
        }}

        .badge-high {{
            background: var(--accent-amber-bg);
            border-color: rgba(245, 158, 11, 0.35);
            color: #fde68a;
        }}

        .pill-loss {{
            font-weight: 500;
            color: #cbd5e1;
        }}

        .pill-location {{
            font-weight: 400;
            color: #94a3b8;
        }}

        .loc-icon {{
            width: 12px;
            height: 12px;
        }}

        .read-news-link {{
            color: #cbd5e1;
            font-size: 13px;
            font-weight: 500;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            transition: color 0.15s;
        }}

        .read-news-link:hover {{
            color: #ffffff;
            text-decoration: underline;
        }}

        @media (max-width: 640px) {{
            .scam-card {{
                flex-direction: column;
            }}
            .card-thumb-container {{
                width: 100%;
                height: 140px;
            }}
            .status-bar {{
                flex-direction: column;
                align-items: flex-start;
            }}
            .status-right {{
                text-align: left;
            }}
        }}
    </style>
</head>
<body>
    <div class="feed-container">
        <!-- Header -->
        <header class="feed-header">
            <div class="header-icon-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path>
                </svg>
            </div>
            <div class="header-titles">
                <div class="header-title-row">
                    <h1>Live Cyber Scam Feed</h1>
                    <span class="tavily-pill">(Powered By Tavily)</span>
                </div>
                <p class="header-subtitle">Real-time alerts and reports aggregated from national cybercrime warnings.</p>
            </div>
        </header>

        <!-- Status / Sync Banner -->
        <div class="status-bar">
            <div class="status-left">
                <span class="badge-live">
                    <span class="pulse-dot dot-white"></span>
                    LIVE SCAM ALERTS
                </span>
                <span class="badge-count">{verified_count} Verified Reports</span>
            </div>
            <div class="status-right">
                <div class="sync-active">
                    <span class="pulse-dot dot-green"></span>
                    Syncs every 24h automatically
                </div>
                <div class="sync-note">Daily intelligence sent to WhatsApp & Telegram bots</div>
            </div>
        </div>

        <!-- Interactive Filter & Search Controls -->
        <div class="filter-controls">
            <div class="search-input-wrapper">
                <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input type="text" id="searchInput" placeholder="Search by keyword, location, or loss amount..." autocomplete="off">
            </div>
            <div class="category-tabs" id="categoryTabs">
                <button class="cat-btn active" data-cat="ALL">All ({verified_count})</button>
                <button class="cat-btn" data-cat="Digital Arrest">Digital Arrest</button>
                <button class="cat-btn" data-cat="Apk Trojan">Apk Trojan</button>
                <button class="cat-btn" data-cat="Deepfake Impersonation">Deepfake</button>
                <button class="cat-btn" data-cat="Investment Fraud">Investment Fraud</button>
            </div>
        </div>

        <!-- Feed Cards -->
        <section class="cards-feed" id="cardsFeed">
            {rendered_cards}
        </section>
        
        <div id="noResultsMsg" class="no-results-msg" style="display: none;">
            <p>No cyber scam alerts matching your filter criteria.</p>
        </div>
    </div>

    <script>
        (function() {{
            const searchInput = document.getElementById('searchInput');
            const catButtons = document.querySelectorAll('.cat-btn');
            const cards = document.querySelectorAll('.scam-card');
            const noResults = document.getElementById('noResultsMsg');
            let currentCat = 'ALL';

            function filterCards() {{
                const query = searchInput.value.toLowerCase().trim();
                let visibleCount = 0;

                cards.forEach(card => {{
                    const cardCat = card.getAttribute('data-category') || '';
                    const text = card.innerText.toLowerCase();

                    const matchesCat = (currentCat === 'ALL' || cardCat.toLowerCase() === currentCat.toLowerCase());
                    const matchesQuery = (!query || text.includes(query));

                    if (matchesCat && matchesQuery) {{
                        card.style.display = 'flex';
                        visibleCount++;
                    }} else {{
                        card.style.display = 'none';
                    }}
                }});

                if (noResults) {{
                    noResults.style.display = visibleCount === 0 ? 'block' : 'none';
                }}
            }}

            catButtons.forEach(btn => {{
                btn.addEventListener('click', () => {{
                    catButtons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    currentCat = btn.getAttribute('data-cat');
                    filterCards();
                }});
            }});

            if (searchInput) {{
                searchInput.addEventListener('input', filterCards);
            }}
        }})();
    </script>
</body>
</html>
"""
