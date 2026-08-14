"use client";

import React, { useState, useEffect } from "react";

interface NetraArchitectureIntroProps {
  onSkip?: () => void;
}

const introCss = `
  /* ── AMBIENT ── */
  .n-bg-grid{
    position:absolute;inset:0;
    background-image:radial-gradient(circle,rgba(255,255,255,1) 1px,transparent 1px);
    background-size:30px 30px;opacity:.09;
  }
  .n-bg-scan{
    position:absolute;left:0;right:0;top:-160px;height:160px;
    background:linear-gradient(to bottom,transparent,rgba(255,255,255,.06),transparent);
    animation:n-bgScanMove 8s linear infinite;
  }
  @keyframes n-bgScanMove{0%{transform:translateY(0)}100%{transform:translateY(calc(100vh + 160px))}}
  .n-bg-scan.n-rev{animation-name:n-bgScanMoveRev;animation-duration:11s;opacity:.7}
  @keyframes n-bgScanMoveRev{0%{transform:translateY(calc(100vh + 160px))}100%{transform:translateY(0)}}
  .n-noise-px{
    position:absolute;width:3px;height:3px;background:#fff;border-radius:1px;
    opacity:0;animation:n-noiseFlicker ease-in-out infinite;
  }
  @keyframes n-noiseFlicker{0%,100%{opacity:0}50%{opacity:var(--peak,.14)}}
  .n-ring{
    position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
    border:1px solid rgba(255,255,255,0.42);border-radius:50%;
    width:20px;height:20px;opacity:0;
    animation:n-ringPulse 4.2s cubic-bezier(.2,.6,.3,1) infinite;
  }
  @keyframes n-ringPulse{
    0%{width:26px;height:26px;opacity:.38}
    75%{opacity:0}
    100%{width:480px;height:480px;opacity:0}
  }
  .n-glow-breathe{
    position:absolute;top:50%;left:50%;width:70vw;height:70vw;
    max-width:900px;max-height:900px;transform:translate(-50%,-50%);
    background:radial-gradient(circle,rgba(255,255,255,.05) 0%,transparent 62%);
    animation:n-breathe 6s ease-in-out infinite;
  }
  @keyframes n-breathe{
    0%,100%{opacity:.6;transform:translate(-50%,-50%) scale(1)}
    50%{opacity:1;transform:translate(-50%,-50%) scale(1.08)}
  }
  .n-diag-line{
    position:absolute;top:50%;left:50%;width:220vmax;height:1px;
    background:linear-gradient(90deg,transparent,rgba(255,255,255,.06) 45%,rgba(255,255,255,.06) 55%,transparent);
    transform-origin:center;animation:n-diagDrift 22s linear infinite;
  }
  .n-diag-line.n-d2{animation-duration:28s;animation-direction:reverse;opacity:.7}
  @keyframes n-diagDrift{
    0%{transform:translate(-50%,-50%) rotate(28deg)}
    100%{transform:translate(-50%,-50%) rotate(388deg)}
  }

  /* ── EMBLEM / SVG ── */
  .n-emblem-wrap{
    position:relative;
    width:clamp(210px,27vw,280px);
    height:clamp(210px,27vw,280px);
  }
  .n-emblem-wrap svg{width:100%;height:100%;overflow:visible}

  /* bracket tick corners */
  .n-tick{
    fill:none;stroke:#fff;stroke-width:1.4;stroke-linecap:square;
    stroke-dasharray:14;stroke-dashoffset:14;opacity:0;
    animation:n-tickDraw .3s cubic-bezier(.5,0,.15,1) forwards;
  }
  @keyframes n-tickDraw{
    0%{stroke-dashoffset:14;opacity:0}5%{opacity:1}100%{stroke-dashoffset:0;opacity:1}
  }

  /* node glyphs */
  .n-node-glyph rect,.n-node-glyph line{fill:#fff;stroke:#fff}
  .n-node-cluster{animation:n-nodeOut .2s ease-in 2.15s forwards}
  @keyframes n-nodeOut{to{opacity:0}}

  .n-px{opacity:0;animation:n-pxIn .18s ease-out forwards,n-pxHold .3s ease-in-out infinite alternate}
  @keyframes n-pxIn{to{opacity:.85}}
  @keyframes n-pxHold{0%{opacity:.5}100%{opacity:.9}}

  .n-bar{transform-box:fill-box;transform-origin:bottom;animation:n-barJit .5s ease-in-out infinite alternate}
  @keyframes n-barJit{0%{transform:scaleY(.35)}100%{transform:scaleY(1)}}

  .n-tok{stroke:#fff;stroke-width:2;stroke-linecap:round;opacity:0;
    animation:n-tokIn .3s ease-out forwards,n-tokHold .6s ease-in-out infinite alternate}
  @keyframes n-tokIn{to{opacity:.8}}
  @keyframes n-tokHold{0%{opacity:.45}100%{opacity:.85}}

  /* lead lines */
  .n-lead-line{
    fill:none;stroke:#fff;stroke-width:1;vector-effect:non-scaling-stroke;
    stroke-dasharray:63;stroke-dashoffset:63;opacity:0;
    animation:n-leadDraw .55s cubic-bezier(.5,0,.15,1) forwards,n-leadOut .25s ease-in forwards;
  }
  @keyframes n-leadDraw{0%{stroke-dashoffset:63;opacity:0}4%{opacity:.6}100%{stroke-dashoffset:0;opacity:.6}}
  @keyframes n-leadOut{to{opacity:0}}

  /* convergence pulse dots */
  .n-pulse{fill:#fff}

  /* ── MARK INLINE (diamond emblem) ── */
  .n-mark-inline{
    opacity:0;transform-box:fill-box;transform-origin:center;
    animation:n-markPop .5s 2.15s cubic-bezier(.34,1.56,.64,1) forwards;
  }
  @keyframes n-markPop{0%{opacity:0;transform:scale(.55)}100%{opacity:1;transform:scale(1)}}

  /* ── WORDMARK ── */
  .n-wordmark{
    margin-top:clamp(20px,2.6vw,30px);
    font-family:'Inter',sans-serif;font-weight:700;
    font-size:clamp(36px,5vw,52px);letter-spacing:.15em;
    color:#fff;padding-left:.15em;
    opacity:0;transform:translateY(4px);
    animation:n-lockIn .45s 2.2s cubic-bezier(.2,.7,.2,1) forwards;
  }
  @keyframes n-lockIn{
    0%{opacity:0;letter-spacing:.36em;filter:blur(3.5px);transform:translateY(4px)}
    45%{filter:blur(1px)}
    75%{filter:blur(0)}
    100%{opacity:1;letter-spacing:.15em;filter:blur(0);transform:translateY(0)}
  }
  .n-hairline{
    margin-top:clamp(22px,2.8vw,30px);width:1.5px;height:0;
    background:rgba(255,255,255,0.6);
    animation:n-hairGrow .45s 2.7s cubic-bezier(.2,.7,.2,1) forwards;
  }
  @keyframes n-hairGrow{0%{height:0;opacity:0}15%{opacity:1}100%{height:30px;opacity:1}}

  /* ── MOTTO ── */
  .n-motto-slot{
    position:relative;margin-top:clamp(16px,2.2vw,24px);height:3.6em;
    width:min(90vw,760px);display:flex;align-items:center;
    justify-content:center;text-align:center;
  }
  .n-motto-line{position:absolute;left:0;right:0;opacity:0;color:#fff;line-height:1.5}
  .n-motto-line.n-sanskrit{
    font-family:'Noto Sans Devanagari',sans-serif;font-weight:500;
    font-size:clamp(21px,3vw,28px);
  }
  .n-motto-line.n-english{
    font-family:'JetBrains Mono',monospace;font-weight:600;
    font-size:clamp(13px,1.7vw,16px);letter-spacing:.2em;color:#94A3B8;
  }
  .n-motto-line.n-sanskrit{animation:n-rhe 1.4s 3.2s cubic-bezier(.3,.6,.3,1) forwards}
  .n-motto-line.n-english {animation:n-rhf 1.9s 4.7s cubic-bezier(.3,.6,.3,1) forwards}
  @keyframes n-rhe{
    0%{opacity:0;filter:blur(9px);clip-path:inset(0 100% 0 0)}
    25%{opacity:1;filter:blur(0);clip-path:inset(0 0% 0 0)}
    75%{opacity:1;filter:blur(0);clip-path:inset(0 0% 0 0)}
    100%{opacity:0;filter:blur(7px)}
  }
  @keyframes n-rhf{
    0%{opacity:0;filter:blur(9px);clip-path:inset(0 100% 0 0)}
    30%{opacity:1;filter:blur(0);clip-path:inset(0 0% 0 0)}
    100%{opacity:1;filter:blur(0)}
  }
  .n-motto-scan{
    position:absolute;top:0;bottom:0;width:1.5px;background:#fff;
    box-shadow:0 0 10px 1px rgba(255,255,255,.4);left:0%;opacity:0;pointer-events:none;
  }
  #n-scan0{animation:n-scanWipeX .5s 3.2s cubic-bezier(.6,0,.05,1) forwards}
  #n-scan1{animation:n-scanWipeX .5s 4.7s cubic-bezier(.6,0,.05,1) forwards}
  @keyframes n-scanWipeX{0%{left:0%;opacity:0}8%{opacity:1}88%{opacity:1}100%{left:100%;opacity:0}}

  /* ── CLOSING + SKIP ── */
  .n-closing{
    margin-top:18px;font-family:'JetBrains Mono',monospace;font-weight:500;
    font-size:clamp(11px,1.2vw,13px);letter-spacing:.18em;color:#64748B;
    opacity:0;transform:translateY(4px);
    animation:n-closeIn .5s 5.8s ease forwards;
  }
  @keyframes n-closeIn{to{opacity:1;transform:translateY(0)}}
  .n-skip-btn{
    font-family:'JetBrains Mono',monospace;font-weight:500;font-size:11px;
    letter-spacing:.24em;color:#64748B;background:transparent;
    border:1px solid rgba(255,255,255,0.35);padding:11px 20px;cursor:pointer;
    opacity:0;transition:border-color .25s,color .25s;
    animation:n-fadeIn .6s 2.0s ease forwards;
  }
  .n-skip-btn:hover{border-color:rgba(255,255,255,.6);color:#fff}
  @keyframes n-fadeIn{to{opacity:1}}

  @media(prefers-reduced-motion:reduce){*{animation-duration:.01s!important;animation-delay:0s!important}}
`;

export const NetraArchitectureIntro: React.FC<NetraArchitectureIntroProps> = ({ onSkip }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: introCss }} />

      {/* ─── STAGE ─── */}
      <div style={{position:"relative",width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",background:"#060608",overflow:"hidden"}}>

        {/* Ambient */}
        <div style={{position:"absolute",inset:0,zIndex:0,pointerEvents:"none"}}>
          <div className="n-bg-grid" />
          <div className="n-glow-breathe" />
          <div className="n-diag-line" />
          <div className="n-diag-line n-d2" />
          <div className="n-bg-scan" />
          <div className="n-bg-scan n-rev" />
          {[
            ["8%","18%",.26,"3.4s",".2s"],["14%","62%",.20,"4.1s","1.4s"],
            ["22%","34%",.18,"2.8s",".7s"],["6%","78%",.24,"3.7s","2.1s"],
            ["88%","22%",.22,"3.1s",".5s"],["92%","58%",.19,"4.4s","1.9s"],
            ["80%","76%",.25,"2.6s",".3s"],["85%","40%",.18,"3.9s","2.6s"],
            ["50%","10%",.16,"4.6s","1.1s"],["36%","88%",.22,"3.3s",".9s"],
            ["64%","88%",.20,"3.6s","2.3s"],["12%","46%",.16,"4.0s","1.7s"],
            ["90%","86%",.19,"2.9s",".4s"],["6%","8%",.17,"4.3s","2.8s"],
            ["95%","12%",.20,"3.2s","1.2s"],["3%","50%",.18,"3.8s","2.4s"],
            ["48%","92%",.19,"4.2s",".6s"],["76%","6%",.17,"3.5s","1.8s"],
          ].map(([l,t,p,d,dl],i) => (
            <span key={i} className="n-noise-px" style={{left:l as string,top:t as string,["--peak" as any]:p,animationDuration:d as string,animationDelay:dl as string}} />
          ))}
        </div>

        {/* Rig */}
        <div style={{position:"relative",zIndex:1,display:"flex",flexDirection:"column",alignItems:"center"}}>

          {/* Emblem */}
          <div className="n-emblem-wrap">
            <div className="n-ring" style={{animationDelay:"3.2s"}} />
            <div className="n-ring" style={{animationDelay:"4.35s"}} />
            <div className="n-ring" style={{animationDelay:"5.5s"}} />
            <div className="n-ring" style={{animationDelay:"6.65s"}} />

            <svg viewBox="0 0 200 200">

              {/* ── LEAD-IN LINES ── */}
              <path className="n-lead-line" d="M100,38 L100,100" style={{animationDelay:".9s, 2.15s"}} />
              <path className="n-lead-line" d="M46,131 L100,100"  style={{animationDelay:".98s, 2.15s"}} />
              <path className="n-lead-line" d="M154,131 L100,100" style={{animationDelay:"1.06s, 2.15s"}} />

              {/* ── NODE: VISUAL (top) — pixel field ── */}
              <g className="n-node-cluster">
                <path className="n-tick" d="M92,26 V18 H100"  style={{animationDelay:"0s"}} />
                <path className="n-tick" d="M108,26 V18 H100" style={{animationDelay:".03s"}} />
                <g className="n-node-glyph" transform="translate(100,38)">
                  <rect className="n-px" x="-11" y="-11" width="6" height="6" style={{animationDelay:".10s"}} />
                  <rect className="n-px" x="-3"  y="-11" width="6" height="6" style={{animationDelay:".22s"}} />
                  <rect className="n-px" x="5"   y="-11" width="6" height="6" style={{animationDelay:".16s"}} />
                  <rect className="n-px" x="-11" y="-3"  width="6" height="6" style={{animationDelay:".30s"}} />
                  <rect className="n-px" x="-3"  y="-3"  width="6" height="6" style={{animationDelay:".12s"}} />
                  <rect className="n-px" x="5"   y="-3"  width="6" height="6" style={{animationDelay:".26s"}} />
                  <rect className="n-px" x="-11" y="5"   width="6" height="6" style={{animationDelay:".20s"}} />
                  <rect className="n-px" x="-3"  y="5"   width="6" height="6" style={{animationDelay:".34s"}} />
                  <rect className="n-px" x="5"   y="5"   width="6" height="6" style={{animationDelay:".14s"}} />
                </g>
              </g>

              {/* ── NODE: VOCAL (bottom-left) — waveform ── */}
              <g className="n-node-cluster">
                <path className="n-tick" d="M34,140 V148 H42" style={{animationDelay:".06s"}} />
                <path className="n-tick" d="M50,140 V148 H58" style={{animationDelay:".09s"}} />
                <g className="n-node-glyph" transform="translate(46,131)">
                  <rect className="n-bar" x="-11"  y="-6"  width="3.4" height="12" style={{animationDelay:".15s"}} />
                  <rect className="n-bar" x="-5.5" y="-11" width="3.4" height="22" style={{animationDelay:".05s"}} />
                  <rect className="n-bar" x="0"    y="-4"  width="3.4" height="8"  style={{animationDelay:".25s"}} />
                  <rect className="n-bar" x="5.5"  y="-9"  width="3.4" height="18" style={{animationDelay:".10s"}} />
                  <rect className="n-bar" x="11"   y="-6"  width="3.4" height="12" style={{animationDelay:".20s"}} />
                </g>
              </g>

              {/* ── NODE: SEMANTIC (bottom-right) — token dashes ── */}
              <g className="n-node-cluster">
                <path className="n-tick" d="M142,140 V148 H150" style={{animationDelay:".12s"}} />
                <path className="n-tick" d="M158,140 V148 H166" style={{animationDelay:".15s"}} />
                <g className="n-node-glyph" transform="translate(154,131)">
                  <line className="n-tok" x1="-11" y1="-9" x2="6"  y2="-9" style={{animationDelay:".10s"}} />
                  <line className="n-tok" x1="-11" y1="-3" x2="11" y2="-3" style={{animationDelay:".25s"}} />
                  <line className="n-tok" x1="-11" y1="3"  x2="-1" y2="3"  style={{animationDelay:".16s"}} />
                  <line className="n-tok" x1="-11" y1="9"  x2="9"  y2="9"  style={{animationDelay:".30s"}} />
                </g>
              </g>

              {/* ── CONVERGENCE PULSES ── */}
              <circle className="n-pulse" r="2.6">
                <animateMotion path="M100,38 L100,100" dur="0.55s" begin="1.6s" fill="freeze" />
                <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.05;0.85;1" dur="0.55s" begin="1.6s" fill="freeze" />
              </circle>
              <circle className="n-pulse" r="2.6">
                <animateMotion path="M46,131 L100,100" dur="0.55s" begin="1.6s" fill="freeze" />
                <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.05;0.85;1" dur="0.55s" begin="1.6s" fill="freeze" />
              </circle>
              <circle className="n-pulse" r="2.6">
                <animateMotion path="M154,131 L100,100" dur="0.55s" begin="1.6s" fill="freeze" />
                <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.05;0.85;1" dur="0.55s" begin="1.6s" fill="freeze" />
              </circle>

              {/* ── TRUTH MARK — diamond emblem (pops in at 2.15s) ── */}
              <g className="n-mark-inline">
                {/* Outer diamond */}
                <polygon points="100,56 148,100 100,144 52,100"
                  stroke="#fff" strokeWidth="3" fill="none" strokeLinejoin="miter" />
                {/* Inner diamond */}
                <polygon points="100,74 122,100 100,126 78,100"
                  stroke="#fff" strokeWidth="1.6" fill="none" strokeLinejoin="miter" />
                {/* Facet: top → inner L/R */}
                <line x1="100" y1="56"  x2="78"  y2="100" stroke="#fff" strokeWidth="1.2" />
                <line x1="100" y1="56"  x2="122" y2="100" stroke="#fff" strokeWidth="1.2" />
                {/* Facet: bottom → inner L/R */}
                <line x1="100" y1="144" x2="78"  y2="100" stroke="#fff" strokeWidth="1.2" />
                <line x1="100" y1="144" x2="122" y2="100" stroke="#fff" strokeWidth="1.2" />
                {/* Facet: left → inner T/B */}
                <line x1="52"  y1="100" x2="100" y2="74"  stroke="#fff" strokeWidth="1.2" />
                <line x1="52"  y1="100" x2="100" y2="126" stroke="#fff" strokeWidth="1.2" />
                {/* Facet: right → inner T/B */}
                <line x1="148" y1="100" x2="100" y2="74"  stroke="#fff" strokeWidth="1.2" />
                <line x1="148" y1="100" x2="100" y2="126" stroke="#fff" strokeWidth="1.2" />
                {/* Horizontal axis */}
                <line x1="52" y1="100" x2="148" y2="100" stroke="#fff" strokeWidth="1.6" />
                {/* Center dot */}
                <circle cx="100" cy="100" r="8" fill="#fff" />
              </g>

            </svg>
          </div>

          {/* Wordmark */}
          <div className="n-wordmark">NETRA</div>
          <div className="n-hairline" />

          {/* Motto */}
          <div className="n-motto-slot">
            <div className="n-motto-scan" id="n-scan0" />
            <div className="n-motto-scan" id="n-scan1" />
            <div className="n-motto-line n-sanskrit">मायातीतं सत्यस्य चक्षुः</div>
            <div className="n-motto-line n-english">BEYOND&nbsp;ILLUSION.&nbsp;THE&nbsp;ARCHITECTURE&nbsp;OF&nbsp;TRUTH.</div>
          </div>

          <div className="n-closing">DEFENDING&nbsp;INDIA&apos;S&nbsp;DIGITAL&nbsp;MEDIA&nbsp;INTEGRITY</div>

          {onSkip && (
            <button
              className="n-skip-btn"
              style={{marginTop:"clamp(22px,3vw,30px)"}}
              onClick={e => { e.stopPropagation(); onSkip(); }}
            >
              SKIP&nbsp;INTRO
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default NetraArchitectureIntro;
