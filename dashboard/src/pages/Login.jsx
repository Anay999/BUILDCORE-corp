import { useState, useEffect, useRef } from "react";
import axios from "axios";

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Barlow+Condensed:wght@700;800;900&display=swap');
@keyframes fadeUp   { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }
@keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
@keyframes slideR   { from { opacity:0; transform:translateX(-24px); } to { opacity:1; transform:translateX(0); } }
@keyframes pulse    { 0%,100% { opacity:.6; } 50% { opacity:1; } }
@keyframes spin     { to { transform:rotate(360deg); } }
@keyframes modalIn  { from { opacity:0; transform:scale(.93) translateY(16px); } to { opacity:1; transform:scale(1) translateY(0); } }
@keyframes overlayIn{ from { opacity:0; } to { opacity:1; } }
@keyframes countUp  { from { opacity:0; transform:scale(.8); } to { opacity:1; transform:scale(1); } }
@keyframes heroIn0 { 0%{transform:scale(1.4) translate(2%,1%);filter:blur(8px);} 28%{transform:scale(1.02) translate(0%,0%);filter:blur(0px);} 100%{transform:scale(1.1) translate(-3%,-2%);filter:blur(0px);} }
@keyframes heroIn1 { 0%{transform:scale(1.4) translate(-2%,-1%);filter:blur(8px);} 28%{transform:scale(1.02) translate(0%,0%);filter:blur(0px);} 100%{transform:scale(1.1) translate(3%,2%);filter:blur(0px);} }
@keyframes heroIn2 { 0%{transform:scale(1.4) translate(1%,2%);filter:blur(8px);} 28%{transform:scale(1.02) translate(0%,0%);filter:blur(0px);} 100%{transform:scale(1.1) translate(-2%,-3%);filter:blur(0px);} }
@keyframes heroIn3 { 0%{transform:scale(1.4) translate(-1%,2%);filter:blur(8px);} 28%{transform:scale(1.02) translate(0%,0%);filter:blur(0px);} 100%{transform:scale(1.1) translate(2%,-2%);filter:blur(0px);} }
@keyframes heroIn4 { 0%{transform:scale(1.4) translate(2%,-1%);filter:blur(8px);} 28%{transform:scale(1.02) translate(0%,0%);filter:blur(0px);} 100%{transform:scale(1.1) translate(-3%,2%);filter:blur(0px);} }
@keyframes heroIn5 { 0%{transform:scale(1.4) translate(-2%,1%);filter:blur(8px);} 28%{transform:scale(1.02) translate(0%,0%);filter:blur(0px);} 100%{transform:scale(1.1) translate(3%,-2%);filter:blur(0px);} }
@keyframes loginIn  { 0%{transform:scale(1.35) translateX(20px);filter:blur(7px);} 30%{transform:scale(1.01) translateX(0);filter:blur(0px);} 100%{transform:scale(1.08) translateX(-10px);filter:blur(0px);} }
@keyframes floatParticle { 0%{opacity:0;transform:translateY(0) scale(0);} 10%{opacity:.8;transform:scale(1);} 90%{opacity:.3;} 100%{opacity:0;transform:translateY(-120px) scale(.5);} }
@keyframes revealUp { from{opacity:0;transform:translateY(50px);} to{opacity:1;transform:translateY(0);} }
@keyframes borderGlow { 0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,0);} 50%{box-shadow:0 0 20px 3px rgba(245,158,11,0.15);} }
.reveal { opacity:0; transform:translateY(40px); transition: opacity .7s ease, transform .7s ease; }
.reveal.visible { opacity:1; transform:translateY(0); }
.reveal-left { opacity:0; transform:translateX(-30px); transition: opacity .7s ease, transform .7s ease; }
.reveal-left.visible { opacity:1; transform:translateX(0); }
.reveal-right { opacity:0; transform:translateX(30px); transition: opacity .7s ease, transform .7s ease; }
.reveal-right.visible { opacity:1; transform:translateX(0); }
.bc-input { transition: border-color .2s, box-shadow .2s; }
.bc-input:focus { border-color: #f59e0b !important; box-shadow: 0 0 0 3px rgba(245,158,11,.15) !important; outline: none; }
.bc-btn-primary:hover:not(:disabled) { background: #fbbf24 !important; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(245,158,11,.35) !important; }
.bc-btn-primary { transition: all .2s !important; }
.bc-feat:hover { transform: translateY(-5px) !important; box-shadow: 0 16px 40px rgba(0,0,0,.35) !important; border-color: rgba(245,158,11,.35) !important; }
.bc-feat { transition: all .22s !important; cursor: pointer; }
.get-started:hover { transform: scale(1.03) translateY(-1px); box-shadow: 0 12px 40px rgba(245,158,11,.5) !important; }
.get-started { transition: all .25s !important; }
.watch-demo:hover { background: rgba(255,255,255,.08) !important; border-color: rgba(255,255,255,.25) !important; transform: translateY(-1px); }
.watch-demo { transition: all .2s !important; }
.nav-link:hover { color: #d97706 !important; }
.nav-link { transition: color .15s; }
.team-card:hover { transform: translateY(-6px); box-shadow: 0 16px 40px rgba(0,0,0,.4) !important; border-color: rgba(245,158,11,.25) !important; }
.team-card { transition: all .22s !important; }
.contact-btn:hover { background: rgba(245,158,11,.15) !important; border-color: rgba(245,158,11,.4) !important; color: #f59e0b !important; transform: translateY(-1px); }
.contact-btn { transition: all .2s !important; }
.faq-item:hover { background: #1a2f4a !important; }
.faq-item { transition: background .15s; cursor: pointer; }
.feat-detail-card:hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(0,0,0,.35) !important; border-color: rgba(245,158,11,.25) !important; }
.feat-detail-card { transition: all .2s; }
.step-card:hover { background: rgba(245,158,11,.06) !important; border-color: rgba(245,158,11,.18) !important; }
.step-card { transition: all .18s; }
.back-btn:hover { background: #f0f0f0 !important; color: #111111 !important; }
.back-btn { transition: all .15s; }
.how-step:hover { background: #1a2f4a !important; }
.how-step { transition: background .15s; }
.bc-stat:hover { transform: scale(1.05); }
.bc-stat { transition: transform .2s; }
@keyframes slideDemo { from { opacity:0; transform:translateX(24px); } to { opacity:1; transform:translateX(0); } }
.demo-slide-enter { animation: slideDemo 0.3s cubic-bezier(0.22,1,0.36,1); }
@keyframes countUpStat { from { opacity:0; transform:scale(0.7) translateY(10px); } to { opacity:1; transform:scale(1) translateY(0); } }
@keyframes heroSlideIn { from { transform:translateX(100%); } to { transform:translateX(0); } }
.bc-stat.visible .stat-val { animation: countUpStat 0.5s cubic-bezier(0.34,1.15,0.64,1) both; }
.feat-badge { transition: all .2s; }
.feat-badge:hover { transform: scale(1.12) rotate(-2deg); }
/* Scroll progress bar */
#bc-progress { position:fixed; top:36px; left:0; height:3px; background:linear-gradient(90deg,#f59e0b,#f97316); z-index:9999; transition:width .1s linear; pointer-events:none; border-radius:0 2px 2px 0; box-shadow:0 0 8px rgba(245,158,11,.6); }
/* Back to top */
.bc-btt { position:fixed; bottom:32px; right:32px; width:44px; height:44px; border-radius:12px; background:rgba(245,158,11,.9); border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; z-index:200; opacity:0; transform:translateY(16px); transition:all .25s; box-shadow:0 4px 20px rgba(245,158,11,.45); }
.bc-btt.visible { opacity:1; transform:translateY(0); }
.bc-btt:hover { background:#f59e0b; transform:translateY(-3px); box-shadow:0 8px 28px rgba(245,158,11,.6); }
/* Active nav */
.nav-link.active { color:#d97706 !important; }
/* Cap icon badge */
.cap-icon { width:42px; height:42px; border-radius:11px; display:flex; align-items:center; justify-content:center; margin-bottom:14px; flex-shrink:0; }
/* Feature nav pill */
.feat-pill:hover { transform:translateY(-2px); }
.feat-pill { transition:all .18s; }
/* Stat glow on hover */
.bc-stat:hover .stat-val { text-shadow:0 0 20px rgba(245,158,11,.6); }
/* Team initials */
.team-initials { width:72px; height:72px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:22px; font-weight:900; font-family:"Barlow Condensed",sans-serif; letter-spacing:.04em; margin:0 auto 18px; }
/* Demo icon */
.demo-icon { width:80px; height:80px; border-radius:20px; display:flex; align-items:center; justify-content:center; margin:0 auto 24px; }
/* Keyboard focus visible */
button:focus-visible,a:focus-visible { outline:2px solid #f59e0b; outline-offset:3px; }
/* Animated underline for section headings */
.section-label { display:inline-flex; align-items:center; gap:8px; }
.section-label::before { content:""; display:inline-block; width:20px; height:2px; background:#f59e0b; border-radius:1px; }
/* Marquee ticker — fixed bar above navbar */
@keyframes marquee { 0%{transform:translateX(0);} 100%{transform:translateX(-50%);} }
.bc-ticker-bar { position:fixed; top:0; left:0; right:0; height:36px; background:rgba(10,14,26,.97); border-bottom:1px solid rgba(245,158,11,.18); z-index:200; overflow:hidden; backdrop-filter:blur(8px); }
.bc-marquee-wrap { position:relative; width:100%; height:36px; overflow:hidden; }
.bc-marquee-track { display:flex; align-items:center; height:36px; animation:marquee 36s linear infinite; width:max-content; white-space:nowrap; }
.bc-marquee-track:hover { animation-play-state:paused; }
.bc-marquee-wrap::before,.bc-marquee-wrap::after { content:""; position:absolute; top:0; bottom:0; width:80px; z-index:2; pointer-events:none; }
.bc-marquee-wrap::before { left:0; background:linear-gradient(90deg,rgba(10,14,26,.97),transparent); }
.bc-marquee-wrap::after { right:0; background:linear-gradient(270deg,rgba(10,14,26,.97),transparent); }
/* Mobile responsive */
@media(max-width:768px){
  nav { padding: 0 20px !important; }
  nav .nav-link { display: none !important; }
  h1 { font-size: 44px !important; }
  .bc-btt { bottom:16px; right:16px; }
  #bc-progress { }
  .bc-stat-bar { flex-direction:column !important; border-radius:16px !important; }
  .bc-stat-bar > div { border-right:none !important; border-bottom:none !important; padding:18px 24px !important; }
  .bc-feat-grid { grid-template-columns:1fr !important; }
  .bc-howitworks-grid { grid-template-columns:1fr 1fr !important; }
  .bc-contact-grid { grid-template-columns:1fr 1fr !important; }
  .bc-team-grid { grid-template-columns:1fr !important; }
  .bc-footer-inner { flex-direction:column; align-items:center; text-align:center; gap:12px; }
  .bc-cta-btns { flex-direction:column; align-items:center; }
  .bc-hero-content { padding: 100px 24px 80px !important; }
  .bc-comparison-table { overflow-x:auto; }
  .bc-comparison-table table { min-width:520px; }
}
@media(max-width:480px){
  .bc-stat-bar { display:grid; grid-template-columns:1fr 1fr; }
  nav button[class*="get-started"] { padding: 7px 14px !important; font-size:12px !important; }
}
/* Comparison table */
.bc-compare-row:hover td { background:#1a2f4a !important; }
.bc-compare-row td { transition:background .15s; }
/* Parallax hero bg */
.bc-parallax-bg { will-change:transform; }
/* Notification drawer */
.bc-notif-drawer { position:fixed; top:0; right:0; height:100%; width:360px; background:#0f172a; border-left:1px solid rgba(255,255,255,.08); z-index:500; transform:translateX(100%); transition:transform .35s cubic-bezier(0.22,1,0.36,1); box-shadow:-20px 0 60px rgba(0,0,0,.6); overflow-y:auto; }
.bc-notif-drawer.open { transform:translateX(0); }
/* Cmd+K search overlay */
.bc-search-overlay { position:fixed; inset:0; background:rgba(0,0,0,.65); backdrop-filter:blur(8px); z-index:600; display:flex; align-items:flex-start; justify-content:center; padding-top:14vh; animation:overlayIn .18s ease; }
.bc-search-box { width:100%; max-width:600px; background:#1e293b; border:1px solid rgba(255,255,255,.12); border-radius:18px; overflow:hidden; box-shadow:0 40px 80px rgba(0,0,0,.7); animation:modalIn .22s ease; }
.bc-search-input { width:100%; background:transparent; border:none; outline:none; padding:18px 24px; font-size:17px; color:#f1f5f9; font-family:inherit; }
.bc-search-result:hover { background:#fff8e6 !important; color:#d97706 !important; }
.bc-search-result { transition:all .12s; }
/* Forgot password slide */
@keyframes forgotIn { from{opacity:0;transform:translateX(18px);} to{opacity:1;transform:translateX(0);} }
.forgot-panel { animation:forgotIn .28s ease; }
/* Toast notifications */
@keyframes toastIn { from{opacity:0;transform:translateX(120%);} to{opacity:1;transform:translateX(0);} }
@keyframes toastOut { from{opacity:1;transform:translateX(0);} to{opacity:0;transform:translateX(120%);} }
.bc-toast { animation:toastIn .3s cubic-bezier(0.22,1,0.36,1); }
.bc-toast.exit { animation:toastOut .25s ease forwards; }

@keyframes shimmer { 0%{background-position:-200% center;} 100%{background-position:200% center;} }

@keyframes techPulse { 0%,100%{transform:scale(1);opacity:.5;} 50%{transform:scale(1.4);opacity:1;} }
@keyframes cornerGlow { 0%,100%{opacity:.3;} 50%{opacity:.7;} }


.bc-particle { position:absolute; border-radius:50%; pointer-events:none; }
.bc-health-bar { transition:all .2s; cursor:default; }
.bc-health-bar:hover { background:rgba(255,255,255,.045) !important; border-color:rgba(255,255,255,.1) !important; transform:translateX(3px); }
.bc-quick-card:hover { transform:translateY(-6px) !important; box-shadow:0 20px 48px rgba(245,158,11,.14) !important; border-color:rgba(245,158,11,.3) !important; }
.bc-quick-card { transition:all .22s; }
@keyframes blinkCaret { 0%,100%{opacity:1;} 50%{opacity:0;} }
.bc-caret { display:inline-block; animation:blinkCaret .75s step-end infinite; color:#f59e0b; WebkitTextFillColor:#f59e0b; fontWeight:100; margin-left:2px; }
.bc-notif-badge { position:absolute; top:-4px; right:-4px; width:16px; height:16px; borderRadius:"50%"; background:"#ef4444"; border:"2px solid #070b16"; display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:800; color:#fff; pointer-events:none; }
.bc-tilt-card { transition:transform .08s ease, box-shadow .08s ease !important; transform-style:preserve-3d; }
.bc-tilt-card:not(:hover) { transition:transform .4s ease, box-shadow .4s ease !important; }
.bc-activity-item { transition:all .15s; border-left:2px solid rgba(255,255,255,.06); }
.bc-activity-item:hover { background:rgba(255,255,255,.04) !important; border-left-color:rgba(245,158,11,.3) !important; padding-left:10px; }
.bc-deadline-row { transition:all .15s; }
.bc-deadline-row:hover { background:#1a2f4a !important; transform:translateX(4px); }
/* Exit transition */
@keyframes landingExit { 0%{opacity:1;transform:scale(1) translateY(0);} 100%{opacity:0;transform:scale(.97) translateY(-28px);} }
.bc-landing-exit { animation:landingExit .42s cubic-bezier(.4,0,.2,1) forwards !important; pointer-events:none; }
/* Skeleton shimmer */
@keyframes shimmerBg { 0%{background-position:-600px 0;} 100%{background-position:600px 0;} }
.bc-skeleton { background:linear-gradient(90deg,#1a2f4a 25%,#1e3650 50%,#1a2f4a 75%); background-size:800px 100%; animation:shimmerBg 1.6s ease-in-out infinite; border-radius:6px; }
/* Custom scrollbar */
::-webkit-scrollbar { width:5px; height:5px; }
::-webkit-scrollbar-track { background:#0d1b2e; }
::-webkit-scrollbar-thumb { background:rgba(245,158,11,.22); border-radius:3px; }
::-webkit-scrollbar-thumb:hover { background:rgba(245,158,11,.45); }
/* Section divider */
.bc-divider { height:1px; background:linear-gradient(90deg,transparent 0%,rgba(245,158,11,.18) 30%,rgba(245,158,11,.28) 50%,rgba(245,158,11,.18) 70%,transparent 100%); position:relative; }
.bc-divider::after { content:""; position:absolute; top:-2px; left:50%; transform:translateX(-50%); width:6px; height:6px; borderRadius:50%; background:#f59e0b; boxShadow:0 0 10px #f59e0b; }
/* Notice body smooth expand */
.bc-notice-body { overflow:hidden; transition:max-height .35s cubic-bezier(.4,0,.2,1), opacity .3s ease; }
/* Quick access arrow */
.bc-quick-arrow { opacity:0; transform:translateX(-4px); transition:all .2s; }
.bc-quick-card:hover .bc-quick-arrow { opacity:1; transform:translateX(0); }
/* Refined focus */
button:focus-visible,a:focus-visible,[tabindex]:focus-visible { outline:2px solid #f59e0b; outline-offset:3px; border-radius:4px; }
.bc-notice-card { transition:all .2s; }
.bc-notice-card:hover { transform:translateX(4px); }
.bc-stat-stripe:hover { transform:scale(1.04); }
.bc-stat-stripe { transition:transform .2s; }
`;


function Ic({ n, s=20, c="currentColor" }) {
  const P = {
    ai:        [["M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.5V11h2a2 2 0 0 1 2 2v1h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-1H5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1v-1a2 2 0 0 1 2-2h2V9.5A4 4 0 0 1 8 6a4 4 0 0 1 4-4z"],["M9 16a1 1 0 1 0 2 0a1 1 0 0 0-2 0","fill"],["M15 16a1 1 0 1 0 2 0a1 1 0 0 0-2 0","fill"]],
    dashboard: [["M3 3h7v7H3z"],["M14 3h7v7h-7z"],["M3 14h7v7H3z"],["M14 14h7v7h-7z"]],
    team:      [["M9 7a4 4 0 1 0 8 0a4 4 0 0 0-8 0"],["M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2"],["M19 8a3 3 0 0 1 0 6"],["M22 21v-2a4 4 0 0 0-3-3.87"]],
    issue:     [["M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"],["M12 9L12 13"],["M12 17L12.01 17"]],
    budget:    [["M12 2a10 10 0 1 0 0 20a10 10 0 0 0 0-20"],["M15 9.5a3.5 3.5 0 0 0-6 2.5c0 2 2 3 3.5 4S16 18 16 20"],["M12 6v2"],["M12 18v2"]],
    mobile:    [["M5 2h14a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"],["M12 18L12.01 18"]],
    build:     [["M2 20h20"],["M4 20V8l8-6 8 6v12"],["M10 20v-6h4v6"],["M4 12h16"]],
    check:     [["M12 2a10 10 0 1 0 0 20a10 10 0 0 0 0-20"],["M7 12L10 15 17 9"]],
    report:    [["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"],["M14 2L14 8 20 8"],["M8 13h8"],["M8 17h8"],["M8 9h2"]],
    camera:    [["M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"],["M12 9a4 4 0 1 0 0 8a4 4 0 0 0 0-8"]],
    shield:    [["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"],["M9 12L11 14 15 10"]],
    chart:     [["M18 20L18 10"],["M12 20L12 4"],["M6 20L6 14"],["M2 20h20"]],
    target:    [["M12 2a10 10 0 1 0 0 20a10 10 0 0 0 0-20"],["M12 6a6 6 0 1 0 0 12a6 6 0 0 0 0-12"],["M12 10a2 2 0 1 0 0 4a2 2 0 0 0 0-4"]],
    mail:      [["M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"],["M22 6L12 13 2 6"]],
    user:      [["M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"],["M12 3a4 4 0 1 0 0 8a4 4 0 0 0 0-8"]],
    inst:      [["M3 22h18"],["M6 18L6 11"],["M10 18L10 11"],["M14 18L14 11"],["M18 18L18 11"],["M12 2L20 7H4z"]],
    rocket:    [["M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"],["M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"],["M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"],["M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"]],
    lock:      [["M7 11V7a5 5 0 0 1 10 0v4"],["M3 11h18a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z"]],
    zap:       [["M13 2L3 14h9l-1 8 10-12h-9l1-8z", "fill"]],
    up:        [["M12 19L12 5"],["M5 12L12 5 19 12"]],
    eye:       [["M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"],["M12 9a3 3 0 1 0 0 6a3 3 0 0 0 0-6"]],
  };
  const segs = P[n] || P["check"];
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" style={{display:"block",flexShrink:0}}>
      {segs.map(([d, type], i) => (
        <path key={i} d={d} fill={type==="fill" ? c : "none"} stroke={type==="fill" ? "none" : c} />
      ))}
    </svg>
  );
}


function StatCounter({ val, duration = 1400, delay = 0 }) {
  const num = parseFloat(String(val).replace(/[^0-9.]/g, ""));
  const suffix = String(val).replace(/[0-9.]/g, "");
  const isNonNum = isNaN(num) || String(val).includes("/") || String(val) === "AI";
  const [disp, setDisp] = useState(0);
  const frameRef = useRef(null);
  useEffect(() => {
    if (isNonNum) return;
    const timer = setTimeout(() => {
      let start = null;
      const animate = (ts) => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        setDisp(Math.round(ease * num));
        if (p < 1) frameRef.current = requestAnimationFrame(animate);
      };
      frameRef.current = requestAnimationFrame(animate);
    }, delay);
    return () => { clearTimeout(timer); cancelAnimationFrame(frameRef.current); };
  }, [num, duration, delay, isNonNum]);
  if (isNonNum) return <>{val}</>;
  return <>{disp}{suffix}</>;
}


/* ===== INTERNAL PORTAL LANDING ===== */
function LandingPage({ onGetStarted }) {
  const companyName = localStorage.getItem("bc_company") || "BuildCore Construction";
  const lastLogin   = localStorage.getItem("bc_last_login") || null;
  const [openNotice, setOpenNotice] = useState(null);
  const [scrolled, setScrolled]     = useState(false);
  const [scrollPct, setScrollPct]   = useState(0);
  const [showBtt, setShowBtt]       = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [heroIdx, setHeroIdx]       = useState(0);
  const heroRef      = useRef(null);
  const statsBannerRef = useRef(null);
  const [clock, setClock]           = useState("");
  const [showNotif, setShowNotif]   = useState(false);
  const [notifRead, setNotifRead]   = useState(false);
  const [typedText, setTypedText]   = useState("");
  const [statsAnim, setStatsAnim]   = useState(false);
  const [cursor, setCursor]         = useState({ x:-999, y:-999, on:false });
  const [exiting, setExiting]       = useState(false);
  const [mounted, setMounted]       = useState(false);
  const [liveStats, setLiveStats]   = useState(null);

  useEffect(() => {
    const h = () => {
      const el = document.body;
      const st = el.scrollTop || document.documentElement.scrollTop;
      const total = el.scrollHeight - el.clientHeight;
      setScrolled(st > 20);
      setScrollPct(total > 0 ? (st / total) * 100 : 0);
      setShowBtt(st > 300);
    };
    document.body.addEventListener("scroll", h);
    return () => document.body.removeEventListener("scroll", h);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setShowSearch(s => !s); setSearchQuery(""); }
      if (e.key === "Escape") setShowSearch(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Hero image slideshow
  useEffect(() => {
    const t = setInterval(() => setHeroIdx(i => (i + 1) % HERO_IMAGES.length), 6000);
    return () => clearInterval(t);
  }, []);

  // Restart heroSlideIn animation on slide change (forced reflow)
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    el.style.animation = "none";
    void el.offsetHeight;
    el.style.animation = "heroSlideIn 1.2s cubic-bezier(0.22,1,0.36,1) forwards";
  }, [heroIdx]);

  // Scroll-reveal — fires immediately so above-fold elements show on load
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible"); }),
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    const trigger = () => document.querySelectorAll(".reveal, .reveal-left, .reveal-right").forEach(el => obs.observe(el));
    trigger();
    // Re-run after a tick so elements rendered in the same paint are picked up
    const t = setTimeout(trigger, 80);
    return () => { obs.disconnect(); clearTimeout(t); };
  }, []);

  // Live IST clock
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false,timeZone:"Asia/Kolkata"}));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // Typewriter hero heading
  useEffect(() => {
    let i = 0;
    setTypedText("");
    const t = setInterval(() => {
      i++;
      setTypedText(companyName.slice(0, i));
      if (i >= companyName.length) clearInterval(t);
    }, 72);
    return () => clearInterval(t);
  }, [companyName]);

  // Cursor spotlight
  useEffect(() => {
    const onMove = e => setCursor({ x:e.clientX, y:e.clientY, on:true });
    const onLeave = () => setCursor(c => ({ ...c, on:false }));
    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    return () => { window.removeEventListener("mousemove", onMove); document.removeEventListener("mouseleave", onLeave); };
  }, []);

  // Stats counter trigger
  useEffect(() => {
    if (!statsBannerRef.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setStatsAnim(true); obs.disconnect(); } }, { threshold:0.25 });
    obs.observe(statsBannerRef.current);
    return () => obs.disconnect();
  }, []);

  // Close notif drawer on Escape
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") setShowNotif(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Content mount (drives skeleton timing)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 900);
    return () => clearTimeout(t);
  }, []);

  // Live stats from backend (no auth needed)
  useEffect(() => {
    fetch("http://localhost:5000/api/stats/public")
      .then(r => r.json())
      .then(d => setLiveStats(d))
      .catch(() => {}); // silently fail — hardcoded fallback stays visible
  }, []);

  // After skeleton swap, spin up a fresh observer so newly-rendered .reveal elements
  // work whether they're already in view OR the user scrolls to them later
  useEffect(() => {
    if (!mounted) return;
    let obs;
    const t = setTimeout(() => {
      obs = new IntersectionObserver(
        (entries) => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); obs.unobserve(e.target); } }),
        { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
      );
      document.querySelectorAll(".reveal, .reveal-left, .reveal-right").forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight + 60) {
          el.classList.add("visible"); // already on screen — mark immediately
        } else {
          obs.observe(el); // off screen — let the observer catch it on scroll
        }
      });
    }, 60);
    return () => { clearTimeout(t); obs && obs.disconnect(); };
  }, [mounted]);

  const scrollTop = () => { document.body.scrollTop = 0; document.documentElement.scrollTop = 0; };
  const handleSignIn = () => {
    setExiting(true);
    setTimeout(onGetStarted, 420);
  };

  const notices = [
    { id: 1, tag: "Safety",   color: "#ef4444", date: "14 Jun", title: "Mandatory safety audit — all sites", body: "All project managers must submit site safety checklists by Friday 17 June. Attach signed copies to the Documents tab of each project." },
    { id: 2, tag: "Finance",  color: "#f59e0b", date: "13 Jun", title: "Q2 budget review — 18 June", body: "Boss-level review of Q2 expenditure vs forecast on 18 June at 11 AM. Ensure all expense logs are up to date in the system before then." },
    { id: 3, tag: "System",   color: "#3b82f6", date: "12 Jun", title: "Scheduled maintenance — Sunday 2–4 AM", body: "BuildCore servers will be unavailable Sunday 15 June between 2:00 AM and 4:00 AM IST for database maintenance. Plan accordingly." },
    { id: 4, tag: "Project",  color: "#10b981", date: "11 Jun", title: "Tower B handover rescheduled to 25 June", body: "Client has confirmed the new handover date for Tower B is 25 June 2026. Update your Gantt charts and milestone trackers accordingly." },
  ];

  const quickLinks = [
    { icon: "chart",   label: "Dashboard",    desc: "Live KPIs" },
    { icon: "build",   label: "Projects",     desc: "All projects" },
    { icon: "team",    label: "Team",         desc: "Members & roles" },
    { icon: "report",  label: "Reports",      desc: "PDF & Excel" },
    { icon: "budget",  label: "Budget",       desc: "P&L tracking" },
    { icon: "issue",   label: "Issues",       desc: "Track & resolve" },
  ];

  const searchItems = [
    { icon:"chart",  label:"Dashboard",   hint:"Overview" },
    { icon:"build",  label:"Projects",    hint:"All projects" },
    { icon:"team",   label:"Team",        hint:"Members" },
    { icon:"report", label:"Reports",     hint:"PDF & Excel" },
    { icon:"budget", label:"Budget",      hint:"P&L" },
    { icon:"issue",  label:"Issues",      hint:"Tracker" },
    { icon:"ai",     label:"AI Analysis", hint:"Site photos" },
    { icon:"mobile", label:"Mobile App",  hint:"PWA" },
  ];

  const activities = [
    { icon:"build",  color:"#3b82f6", text:"Tower B inspection report uploaded",           user:"Rajesh K.",  time:"2h ago" },
    { icon:"chart",  color:"#10b981", text:"Site A concrete pour milestone completed",      user:"Priya M.",   time:"5h ago" },
    { icon:"issue",  color:"#ef4444", text:"Structural crack flagged at Site C column 7",  user:"Arjun S.",   time:"8h ago" },
    { icon:"report", color:"#f59e0b", text:"Q2 budget report submitted for review",        user:"Admin",      time:"1d ago" },
    { icon:"team",   color:"#8b5cf6", text:"Karthik Raj added to Tower A team",            user:"Admin",      time:"2d ago" },
  ];
  const deadlines = [
    { label:"Safety Audit Submit",    date:"17 Jun", days:3,  color:"#ef4444", status:"Urgent"   },
    { label:"Q2 Budget Review",       date:"18 Jun", days:4,  color:"#f59e0b", status:"Pending"  },
    { label:"Site C Foundation",      date:"20 Jun", days:6,  color:"#f59e0b", status:"At Risk"  },
    { label:"Tower B Handover",       date:"25 Jun", days:11, color:"#10b981", status:"On Track" },
    { label:"Site A Phase 2 Kickoff", date:"30 Jun", days:16, color:"#10b981", status:"On Track" },
  ];
  const notifItems = [
    { icon:"issue",  color:"#f59e0b", title:"Safety audit due Friday",     body:"Submit signed checklists for all sites before 17 Jun 5 PM", time:"2h ago",  unread:true },
    { icon:"build",  color:"#3b82f6", title:"Server maintenance Sunday",   body:"BuildCore offline 2:00–4:00 AM IST for database migration", time:"5h ago",  unread:true },
    { icon:"chart",  color:"#10b981", title:"Tower A milestone completed", body:"Concrete pour for floors 4–6 completed on schedule",        time:"1d ago",  unread:false },
    { icon:"issue",  color:"#ef4444", title:"Crack flagged at Site C",     body:"Structural issue in column 7 — requires urgent review",      time:"2d ago",  unread:false },
  ];

  return (
    <div className={exiting ? "bc-landing-exit" : ""} style={{ minHeight:"100vh", background:"#0d1b2e", fontFamily:"'Inter',sans-serif", overflowX:"hidden", position:"relative" }}>
      <style>{STYLES}</style>

      {/* ══ BACKGROUND ══ */}
      <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none", background:"#0d1b2e" }}>
        <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(0,0,0,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.03) 1px,transparent 1px)", backgroundSize:"48px 48px" }} />
      </div>

      {/* Scroll progress — above bg layer */}
      <div id="bc-progress" style={{ width: scrollPct + "%", zIndex:9999 }} />

      {/* Back to top */}
      <button className={"bc-btt" + (showBtt ? " visible" : "")} onClick={scrollTop} aria-label="Back to top">
        <Ic n="up" s={20} c="#0f172a"/>
      </button>

      {/* Cmd+K Search */}
      {showSearch && (
        <div className="bc-search-overlay" onClick={() => setShowSearch(false)}>
          <div className="bc-search-box" onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex", alignItems:"center", gap:12, padding:"0 20px", borderBottom:"1px solid rgba(94,145,200,.15)" }}>
              <Ic n="eye" s={18} c="#64748b"/>
              <input autoFocus className="bc-search-input" placeholder="Search the portal…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              <kbd style={{ padding:"3px 8px", background:"#0e2038", border:"1px solid rgba(255,255,255,.07)", borderRadius:6, fontSize:11, color:"rgba(255,255,255,.5)", fontFamily:"inherit", flexShrink:0 }}>ESC</kbd>
            </div>
            <div style={{ padding:"8px 0", maxHeight:320, overflowY:"auto" }}>
              {searchItems.filter(r => !searchQuery || r.label.toLowerCase().includes(searchQuery.toLowerCase())).map(r => (
                <div key={r.label} className="bc-search-result" onClick={() => { setShowSearch(false); handleSignIn(); }}
                  style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 20px", color:"rgba(255,255,255,.8)", fontSize:14, cursor:"pointer" }}>
                  <Ic n={r.icon} s={16} c="#f59e0b"/>
                  <span>{r.label}</span>
                  <span style={{ marginLeft:"auto", fontSize:11, color:"rgba(255,255,255,.35)" }}>{r.hint}</span>
                </div>
              ))}
            </div>
            <div style={{ padding:"10px 20px", borderTop:"1px solid rgba(94,145,200,.10)", fontSize:11, color:"rgba(255,255,255,.35)" }}>↵ select · ESC close · ⌘K toggle</div>
          </div>
        </div>
      )}

      {/* ── Notification drawer ── */}
      {showNotif && <div style={{ position:"fixed", inset:0, zIndex:490, background:"rgba(0,0,0,.45)", backdropFilter:"blur(4px)" }} onClick={() => { setShowNotif(false); setNotifRead(true); }} />}
      <div style={{ position:"fixed", top:0, right:0, height:"100%", width:360, background:"#0c1220", borderLeft:"1px solid rgba(94,145,200,.15)", zIndex:500, transform:showNotif ? "translateX(0)" : "translateX(100%)", transition:"transform .35s cubic-bezier(.22,1,.36,1)", boxShadow:"-24px 0 60px rgba(0,0,0,.6)", overflowY:"auto", display:"flex", flexDirection:"column" }}>
        <div style={{ padding:"22px 20px 18px", borderBottom:"1px solid rgba(94,145,200,.10)", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:900, color:"#ffffff", fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:".06em" }}>NOTIFICATIONS</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,.35)", marginTop:2, fontWeight:600 }}>{notifItems.filter(n=>n.unread && !notifRead).length} unread · {notifItems.length} total</div>
          </div>
          <button onClick={() => { setShowNotif(false); setNotifRead(true); }} style={{ background:"#e8e0d4", border:"1px solid rgba(94,145,200,.15)", color:"rgba(255,255,255,.55)", cursor:"pointer", borderRadius:8, width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, transition:"all .15s" }}
            onMouseEnter={e=>{e.currentTarget.style.color="#f1f5f9";e.currentTarget.style.borderColor="rgba(255,255,255,.15)";}}
            onMouseLeave={e=>{e.currentTarget.style.color="#64748b";e.currentTarget.style.borderColor="#ebebeb";}}>✕</button>
        </div>
        <div style={{ flex:1, overflowY:"auto" }}>
          {notifItems.map((n,i) => (
            <div key={i} style={{ padding:"16px 20px", borderBottom:"1px solid rgba(255,255,255,.04)", display:"flex", gap:12, alignItems:"flex-start", background: (n.unread && !notifRead) ? "rgba(245,158,11,.025)" : "transparent", transition:"background .15s" }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,215,140,.04)"}
              onMouseLeave={e=>e.currentTarget.style.background=(n.unread && !notifRead) ? "rgba(245,158,11,.025)" : "transparent"}>
              <div style={{ width:38, height:38, borderRadius:10, background:n.color+"18", border:"1px solid "+n.color+"30", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
                <Ic n={n.icon} s={16} c={n.color}/>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#ffffff", marginBottom:4, display:"flex", alignItems:"center", gap:8 }}>
                  {n.title}
                  {n.unread && !notifRead && <span style={{ width:6, height:6, borderRadius:"50%", background:n.color, flexShrink:0, display:"inline-block" }} />}
                </div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,.55)", lineHeight:1.65, marginBottom:6 }}>{n.body}</div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,.35)", fontWeight:600 }}>{n.time}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding:"14px 20px", borderTop:"1px solid rgba(255,255,255,.06)", flexShrink:0 }}>
          <button onClick={() => { handleSignIn(); setShowNotif(false); }} style={{ width:"100%", padding:"11px", background:"rgba(245,158,11,.08)", border:"1px solid rgba(245,158,11,.2)", borderRadius:10, color:"#f59e0b", fontSize:12, fontWeight:700, cursor:"pointer", transition:"all .15s", letterSpacing:".04em" }}
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(245,158,11,.14)";}}
            onMouseLeave={e=>{e.currentTarget.style.background="rgba(245,158,11,.08)";}}>VIEW ALL IN DASHBOARD →</button>
        </div>
      </div>

      {/* ── Ticker strip ── */}
      <div className="bc-ticker-bar">
        <div className="bc-marquee-wrap">
          <div className="bc-marquee-track">
            {["Internal Portal","Authorised Personnel Only","BuildCore ERP","Confidential","Private Network","Role-Based Access","JWT Secured","Gemini AI Enabled","Real-Time Sync","PostgreSQL Backend",
              "Internal Portal","Authorised Personnel Only","BuildCore ERP","Confidential","Private Network","Role-Based Access","JWT Secured","Gemini AI Enabled","Real-Time Sync","PostgreSQL Backend"
            ].map((item, i) => (
              <span key={i} style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"0 28px", flexShrink:0 }}>
                <span style={{ width:5, height:5, borderRadius:"50%", background:"#f59e0b", display:"inline-block", flexShrink:0 }} />
                <span style={{ fontSize:10, color:"rgba(255,255,255,.55)", fontWeight:700, letterSpacing:".1em", textTransform:"uppercase" }}>{item}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Navbar ── */}
      <nav style={{ position:"fixed", top:36, left:0, right:0, zIndex:100, padding:"0 40px", height:60, display:"flex", alignItems:"center", justifyContent:"space-between", background: scrolled ? "rgba(10,14,26,.97)" : "transparent", backdropFilter: scrolled ? "blur(12px)" : "none", borderBottom: scrolled ? "1px solid rgba(94,145,200,.10)" : "none", transition:"all .3s" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:"#f59e0b", display:"flex", alignItems:"center", justifyContent:"center" }}><Ic n="build" s={17} c="#0f172a"/></div>
          <div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:17, fontWeight:900, color:"#ffffff", letterSpacing:".08em" }}>{companyName.toUpperCase()}</div>
            <div style={{ fontSize:9, color:"rgba(255,255,255,.35)", fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", marginTop:-2 }}>Internal Portal</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 12px", borderRadius:20, background:"rgba(16,185,129,.08)", border:"1px solid rgba(16,185,129,.2)" }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:"#10b981", animation:"pulse 2s infinite" }} />
            <span style={{ fontSize:11, color:"#10b981", fontWeight:700 }}>All Systems Operational</span>
          </div>
          <button onClick={() => setShowSearch(true)} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 12px", background:"#0e2038", border:"1px solid rgba(255,255,255,.07)", borderRadius:8, color:"rgba(255,255,255,.55)", fontSize:11, fontWeight:600, cursor:"pointer", transition:"all .18s" }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(245,158,11,.3)";e.currentTarget.style.color="#f59e0b";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="#ebebeb";e.currentTarget.style.color="#64748b";}}>
            <Ic n="eye" s={13} c="currentColor"/> <span style={{fontSize:10}}>⌘K</span>
          </button>
          {/* Live clock */}
          <div style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", background:"#0e2038", border:"1px solid rgba(255,255,255,.07)", borderRadius:8 }}>
            <span style={{ fontSize:10, color:"rgba(255,255,255,.35)", fontWeight:700, letterSpacing:".06em" }}>IST</span>
            <span style={{ fontSize:12, fontWeight:800, color:"rgba(255,255,255,.55)", fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:".04em", minWidth:70, textAlign:"center" }}>{clock}</span>
          </div>
          {/* Notification bell */}
          <button onClick={() => setShowNotif(s => !s)} style={{ position:"relative", width:38, height:38, borderRadius:10, background: showNotif ? "rgba(245,158,11,.12)" : "rgba(255,215,140,.05)", border:"1px solid "+(showNotif ? "rgba(245,158,11,.3)" : "#ebebeb"), display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", transition:"all .18s" }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(245,158,11,.3)";e.currentTarget.style.background="rgba(245,158,11,.08)";}}
            onMouseLeave={e=>{ if(!showNotif){e.currentTarget.style.borderColor="#ebebeb";e.currentTarget.style.background="#112035";}}}>
            <Ic n="issue" s={15} c={showNotif ? "#f59e0b" : "#64748b"}/>
            {!notifRead && <div style={{ position:"absolute", top:6, right:6, width:7, height:7, borderRadius:"50%", background:"#ef4444", border:"2px solid #070b16" }} />}
          </button>
          <button onClick={handleSignIn} className="get-started" style={{ padding:"9px 24px", background:"#f59e0b", border:"none", borderRadius:8, color:"#0f172a", fontWeight:800, fontSize:13, cursor:"pointer" }}>Sign In →</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div style={{ position:"relative", minHeight:"100vh", display:"flex", flexDirection:"column", justifyContent:"flex-end", zIndex:1, overflow:"hidden" }}>

        {/* Slideshow background */}
        <div style={{ position:"absolute", inset:0, zIndex:0 }}>
          <div style={{ position:"absolute", inset:0, backgroundImage:`url(${HERO_IMAGES[(heroIdx-1+HERO_IMAGES.length)%HERO_IMAGES.length].url})`, backgroundSize:"cover", backgroundPosition:"center" }} />
          <div ref={heroRef} style={{ position:"absolute", inset:0, animation:"heroSlideIn 1.4s cubic-bezier(0.22,1,0.36,1) forwards" }}>
            <div style={{ position:"absolute", inset:0, backgroundImage:`url(${HERO_IMAGES[heroIdx].url})`, backgroundSize:"cover", backgroundPosition:"center" }} />
          </div>
          {/* Overlay: stronger on left where text lives, fades right */}
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(105deg, rgba(8,12,20,.96) 0%, rgba(7,17,31,.82) 45%, rgba(7,17,31,.38) 100%)" }} />
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(8,12,20,1) 0%, rgba(8,12,20,.5) 40%, transparent 75%)" }} />
        </div>

        {/* Vertical slide indicator — right edge */}
        <div style={{ position:"absolute", right:36, top:"50%", transform:"translateY(-50%)", zIndex:10, display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
          {HERO_IMAGES.map((_,i) => (
            <div key={i} onClick={()=>setHeroIdx(i)} style={{ width:2, height:i===heroIdx?32:10, background:i===heroIdx?"#f59e0b":"rgba(255,255,255,.25)", borderRadius:2, cursor:"pointer", transition:"all .4s ease" }} />
          ))}
        </div>

        {/* Main hero content */}
        <div style={{ position:"relative", zIndex:10, padding:"0 64px 0", paddingTop:120, flex:1, display:"flex", alignItems:"center" }}>
          <div style={{ maxWidth:640 }}>
            {/* Access badge */}
            <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"5px 14px", border:"1px solid rgba(245,158,11,.35)", borderRadius:3, marginBottom:40 }}>
              <div style={{ width:5, height:5, borderRadius:"50%", background:"#f59e0b", animation:"pulse 2s infinite" }} />
              <span style={{ fontSize:10, color:"#f59e0b", fontWeight:700, letterSpacing:".14em" }}>AUTHORISED ACCESS ONLY</span>
            </div>

            {/* Brand name — no effects, just bold white */}
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", textTransform:"uppercase" }}>
              <div style={{ fontSize:"clamp(64px,8.5vw,120px)", fontWeight:900, color:"#ffffff", lineHeight:.95, letterSpacing:"-.01em" }}>
                {companyName}
              </div>
              <div style={{ fontSize:"clamp(28px,4vw,52px)", fontWeight:400, color:"rgba(255,255,255,.45)", lineHeight:1.1, letterSpacing:".06em", marginBottom:36 }}>
                Construction ERP
              </div>
            </div>

            <p style={{ fontSize:15, color:"rgba(255,255,255,.6)", lineHeight:1.8, margin:"0 0 48px", maxWidth:460, fontWeight:400 }}>
              Internal project management and site tracking platform for {companyName} team members. Authorised personnel only.
            </p>

            {/* CTAs */}
            <div style={{ display:"flex", gap:14, flexWrap:"wrap", alignItems:"center", marginBottom:36 }}>
              <button onClick={handleSignIn} className="get-started" style={{ padding:"15px 44px", background:"#f59e0b", border:"none", borderRadius:4, color:"#0a0d14", fontWeight:800, fontSize:14, cursor:"pointer", letterSpacing:".04em", textTransform:"uppercase" }}>
                Sign In →
              </button>
              <a href="mailto:admin@buildcore.in" style={{ padding:"14px 28px", background:"transparent", border:"1px solid rgba(255,255,255,.18)", borderRadius:4, color:"rgba(255,255,255,.55)", fontWeight:600, fontSize:13, textDecoration:"none", letterSpacing:".03em", transition:"all .18s" }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(245,158,11,.4)";e.currentTarget.style.color="#f59e0b";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,.25)";e.currentTarget.style.color="rgba(255,255,255,.55)";}}>
                IT Support
              </a>
            </div>

            {lastLogin && (
              <div style={{ fontSize:12, color:"rgba(255,255,255,.45)", fontWeight:500 }}>
                Last signed in: {lastLogin}
              </div>
            )}
          </div>
        </div>

        {/* Bottom stat strip — live data from API */}
        <div style={{ position:"relative", zIndex:10, display:"grid", gridTemplateColumns:"repeat(4,1fr)", borderTop:"1px solid rgba(94,145,200,.15)", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)", background:"rgba(7,17,31,.70)" }}>
          {[
            { val: liveStats ? String(liveStats.activeProjects) : "—",         label:"Active Projects",  accent:"#f59e0b" },
            { val: liveStats ? String(liveStats.teamMembers)    : "—",         label:"Team Members",     accent:"#ffffff" },
            { val: liveStats ? String(liveStats.openIssues)     : "—",         label:"Open Issues",      accent: liveStats && liveStats.openIssues > 0 ? "#ef4444" : "#ffffff" },
            { val: liveStats ? `${liveStats.taskCompletion}%`   : "—",         label:"Tasks This Month", accent:"#ffffff" },
          ].map((s,i) => (
            <div key={s.label} style={{ padding:"28px 40px", borderRight:i<3?"1px solid rgba(94,145,200,.10)":"none" }}>
              <div style={{ fontSize:"clamp(28px,3vw,44px)", fontWeight:900, color:s.accent, fontFamily:"'Barlow Condensed',sans-serif", lineHeight:1, transition:"color .3s" }}>{s.val}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", fontWeight:600, marginTop:6, textTransform:"uppercase", letterSpacing:".09em" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ STATS BANNER ══ */}
      <div style={{ background:"#060d18", position:"relative", zIndex:1 }}>
        <div ref={statsBannerRef} style={{ maxWidth:1200, margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(4,1fr)" }}>
          {[
            {num:47,  pfx:"",  sfx:"+",  label:"Projects Delivered", sub:"since 2018",        color:"#f59e0b"},
            {num:6,   pfx:"",  sfx:"",   label:"Active Sites",       sub:"across Tamil Nadu",  color:"#f59e0b"},
            {num:84,  pfx:"₹", sfx:"Cr", label:"Assets Managed",     sub:"this fiscal year",   color:"#f59e0b"},
            {num:98,  pfx:"",  sfx:"%",  label:"On-Time Delivery",   sub:"rolling 12 months",  color:"#f59e0b"},
          ].map((s,i) => (
            <div key={s.label} className="reveal bc-stat-stripe" style={{ padding:"56px 40px", borderRight:i<3?"1px solid rgba(255,255,255,.05)":"none", transitionDelay:(i*.08)+"s" }}>
              <div style={{ fontSize:"clamp(40px,4.5vw,64px)", fontWeight:800, fontFamily:"'Barlow Condensed',sans-serif", lineHeight:1, color:"#ffffff", letterSpacing:"-.01em" }}>
                {s.pfx}{statsAnim ? <StatCounter val={s.num} duration={1400} delay={i*120}/> : 0}<span style={{ fontSize:"0.5em", fontWeight:700, color:"#f59e0b" }}>{s.sfx}</span>
              </div>
              <div style={{ marginTop:14, fontSize:13, fontWeight:600, color:"rgba(255,255,255,.85)", letterSpacing:".01em" }}>{s.label}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginTop:4, fontWeight:500 }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ ANNOUNCEMENTS ══ */}
      <div style={{ background:"#080d17", position:"relative", zIndex:1, padding:"80px 0" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 40px" }}>

          {/* Header */}
          <div className="reveal" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:48 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:600, color:"#f59e0b", textTransform:"uppercase", letterSpacing:".12em", marginBottom:12 }}>Announcements</div>
              <h2 style={{ margin:0, fontSize:"clamp(24px,3vw,34px)", fontWeight:700, color:"#ffffff", lineHeight:1.1 }}>Latest Updates</h2>
            </div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.25)", fontWeight:500 }}>{new Date().toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}</div>
          </div>

          {/* Cards */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(440px,1fr))", gap:2, background:"rgba(255,255,255,.04)", borderRadius:12, overflow:"hidden" }}>
            {!mounted ? [...Array(4)].map((_,i) => (
              <div key={i} style={{ background:"#0b1523", padding:"28px 32px" }}>
                <div className="bc-skeleton" style={{ height:10, width:50, borderRadius:4, marginBottom:14 }} />
                <div className="bc-skeleton" style={{ height:15, width:"75%", marginBottom:10 }} />
                <div className="bc-skeleton" style={{ height:10, width:"40%" }} />
              </div>
            )) : notices.map((n,i) => (
              <div key={n.id} className="reveal bc-notice-card"
                onClick={() => setOpenNotice(openNotice===n.id ? null : n.id)}
                style={{ background:"#0b1523", padding:"28px 32px", cursor:"pointer", position:"relative", transitionDelay:(i*.05)+"s", transition:"background .15s" }}
                onMouseEnter={e=>e.currentTarget.style.background="#0e1c2f"}
                onMouseLeave={e=>e.currentTarget.style.background="#0b1523"}>
                <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:n.color }} />
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
                  <span style={{ fontSize:10, fontWeight:700, color:n.color, textTransform:"uppercase", letterSpacing:".1em" }}>{n.tag}</span>
                  <span style={{ fontSize:11, color:"rgba(255,255,255,.25)", fontWeight:500 }}>{n.date}</span>
                </div>
                <div style={{ fontSize:15, fontWeight:600, color:"#ffffff", lineHeight:1.45, marginBottom:openNotice===n.id?14:0 }}>{n.title}</div>
                <div className="bc-notice-body" style={{ maxHeight:openNotice===n.id?"120px":"0", opacity:openNotice===n.id?1:0 }}>
                  <div style={{ fontSize:13, color:"rgba(255,255,255,.45)", lineHeight:1.7, paddingTop:14, borderTop:"1px solid rgba(255,255,255,.06)" }}>{n.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ SERVICE HEALTH ══ */}
      <div style={{ background:"#060d18", position:"relative", zIndex:1, padding:"80px 0" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 40px" }}>

          <div className="reveal" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:40 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:600, color:"#f59e0b", textTransform:"uppercase", letterSpacing:".12em", marginBottom:12 }}>Infrastructure</div>
              <h2 style={{ margin:0, fontSize:"clamp(24px,3vw,34px)", fontWeight:700, color:"#ffffff", lineHeight:1.1 }}>Service Health</h2>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 14px", background:"rgba(16,185,129,.08)", borderRadius:6 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#10b981", animation:"pulse 2s infinite" }} />
              <span style={{ fontSize:11, color:"#10b981", fontWeight:600 }}>3 of 4 Operational</span>
            </div>
          </div>

          <div style={{ borderRadius:10, overflow:"hidden", border:"1px solid rgba(255,255,255,.05)" }}>
            {[
              {name:"PostgreSQL Database",  uptime:"99.98%", ping:"12ms", status:"Operational", color:"#10b981", pct:99},
              {name:"API Gateway",          uptime:"99.95%", ping:"34ms", status:"Operational", color:"#10b981", pct:99},
              {name:"AI Analysis Engine",   uptime:"99.71%", ping:"87ms", status:"Degraded",    color:"#f59e0b", pct:82},
              {name:"Notification Service", uptime:"100%",   ping:"8ms",  status:"Operational", color:"#10b981", pct:100},
            ].map((svc,i,arr) => (
              <div key={svc.name} className="reveal bc-health-bar"
                style={{ display:"flex", alignItems:"center", gap:24, padding:"20px 28px", background:"#0b1523", borderBottom:i<arr.length-1?"1px solid rgba(255,255,255,.04)":"none", transitionDelay:(i*.06)+"s" }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:svc.color, flexShrink:0, boxShadow:`0 0 8px ${svc.color}` }} />
                <div style={{ flex:"0 0 220px" }}>
                  <div style={{ fontSize:14, fontWeight:600, color:"#ffffff" }}>{svc.name}</div>
                </div>
                <div style={{ flex:1, height:3, background:"rgba(255,255,255,.07)", borderRadius:2, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:svc.pct+"%", background:svc.color, borderRadius:2, transition:"width 1.4s ease .3s" }} />
                </div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", fontWeight:500, flex:"0 0 60px", textAlign:"right" }}>{svc.uptime}</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,.3)", flex:"0 0 48px", textAlign:"right" }}>{svc.ping}</div>
                <div style={{ padding:"4px 12px", borderRadius:4, background:svc.color+"14", fontSize:11, fontWeight:700, color:svc.color, flex:"0 0 100px", textAlign:"center" }}>{svc.status}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ QUICK ACCESS ══ */}
      <div style={{ background:"#080d17", position:"relative", zIndex:1, padding:"80px 0" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 40px" }}>

          <div className="reveal" style={{ marginBottom:40 }}>
            <div style={{ fontSize:11, fontWeight:600, color:"#f59e0b", textTransform:"uppercase", letterSpacing:".12em", marginBottom:12 }}>Navigation</div>
            <h2 style={{ margin:0, fontSize:"clamp(24px,3vw,34px)", fontWeight:700, color:"#ffffff", lineHeight:1.1 }}>Quick Access</h2>
          </div>

          <div className="reveal" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:2, background:"rgba(255,255,255,.04)", borderRadius:12, overflow:"hidden" }}>
            {quickLinks.map((q,i) => (
              <div key={q.label} onClick={handleSignIn} className="bc-quick-card"
                style={{ display:"flex", flexDirection:"column", gap:0, padding:"28px 24px", background:"#0b1523", cursor:"pointer", transition:"background .15s", transitionDelay:(i*.04)+"s" }}
                onMouseEnter={e=>e.currentTarget.style.background="#0e1c2f"}
                onMouseLeave={e=>e.currentTarget.style.background="#0b1523"}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
                  <div style={{ width:38, height:38, borderRadius:8, background:"rgba(245,158,11,.1)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <Ic n={q.icon} s={16} c="#f59e0b"/>
                  </div>
                  <span style={{ fontSize:16, color:"rgba(255,255,255,.15)" }}>→</span>
                </div>
                <div style={{ fontSize:14, fontWeight:600, color:"#ffffff", marginBottom:4 }}>{q.label}</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,.35)", lineHeight:1.4 }}>{q.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ ACTIVITY + DEADLINES ══ */}
      <div style={{ background:"#060d18", position:"relative", zIndex:1, padding:"80px 0 100px" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 40px" }}>

          <div className="reveal" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:48 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:600, color:"#f59e0b", textTransform:"uppercase", letterSpacing:".12em", marginBottom:12 }}>Live Feed</div>
              <h2 style={{ margin:0, fontSize:"clamp(24px,3vw,34px)", fontWeight:700, color:"#ffffff", lineHeight:1.1 }}>Activity & Deadlines</h2>
            </div>
            <button onClick={handleSignIn}
              style={{ fontSize:12, color:"rgba(255,255,255,.45)", background:"transparent", border:"1px solid rgba(255,255,255,.1)", borderRadius:6, padding:"8px 18px", cursor:"pointer", fontWeight:500, letterSpacing:".03em", transition:"all .15s" }}
              onMouseEnter={e=>{e.currentTarget.style.color="#ffffff";e.currentTarget.style.borderColor="rgba(255,255,255,.25)";}}
              onMouseLeave={e=>{e.currentTarget.style.color="rgba(255,255,255,.45)";e.currentTarget.style.borderColor="rgba(255,255,255,.1)";}}>
              Open Dashboard →
            </button>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:40 }}>

            {/* Activity Feed */}
            <div className="reveal">
              <div style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:".1em", marginBottom:24 }}>Recent Activity</div>
              <div style={{ display:"flex", flexDirection:"column" }}>
                {!mounted ? [...Array(5)].map((_,i) => (
                  <div key={i} style={{ display:"flex", gap:14, alignItems:"flex-start", padding:"14px 0", borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                    <div className="bc-skeleton" style={{ width:32, height:32, borderRadius:8, flexShrink:0 }} />
                    <div style={{ flex:1 }}>
                      <div className="bc-skeleton" style={{ height:11, width:"80%", marginBottom:8 }} />
                      <div className="bc-skeleton" style={{ height:9, width:"35%" }} />
                    </div>
                  </div>
                )) : activities.map((a,i) => (
                  <div key={i} className="bc-activity-item"
                    style={{ display:"flex", gap:14, alignItems:"flex-start", padding:"14px 0", borderBottom:i<activities.length-1?"1px solid rgba(255,255,255,.04)":"none", transitionDelay:(i*.04)+"s" }}>
                    <div style={{ width:32, height:32, borderRadius:8, background:a.color+"14", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <Ic n={a.icon} s={13} c={a.color}/>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, color:"rgba(255,255,255,.65)", lineHeight:1.5, marginBottom:5 }}>{a.text}</div>
                      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                        <span style={{ fontSize:11, color:"rgba(255,255,255,.5)", fontWeight:600 }}>{a.user}</span>
                        <span style={{ fontSize:11, color:"rgba(255,255,255,.2)" }}>·</span>
                        <span style={{ fontSize:11, color:"rgba(255,255,255,.25)" }}>{a.time}</span>
                      </div>
                    </div>
                    {i===0 && <div style={{ width:5, height:5, borderRadius:"50%", background:a.color, marginTop:8, flexShrink:0 }} />}
                  </div>
                ))}
              </div>
            </div>

            {/* Deadlines */}
            <div className="reveal" style={{ transitionDelay:".1s" }}>
              <div style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:".1em", marginBottom:24 }}>Upcoming Deadlines</div>
              <div style={{ borderRadius:10, overflow:"hidden", border:"1px solid rgba(255,255,255,.05)" }}>
                {!mounted ? [...Array(5)].map((_,i) => (
                  <div key={i} style={{ display:"flex", gap:14, alignItems:"center", padding:"16px 20px", background:"#0b1523", borderBottom:i<4?"1px solid rgba(255,255,255,.04)":"none" }}>
                    <div className="bc-skeleton" style={{ width:40, height:40, borderRadius:8, flexShrink:0 }} />
                    <div style={{ flex:1 }}>
                      <div className="bc-skeleton" style={{ height:12, width:"65%", marginBottom:8 }} />
                      <div className="bc-skeleton" style={{ height:9, width:"30%" }} />
                    </div>
                    <div className="bc-skeleton" style={{ height:20, width:55, borderRadius:4 }} />
                  </div>
                )) : deadlines.map((d,i) => (
                  <div key={i} className="bc-deadline-row"
                    style={{ display:"flex", alignItems:"center", gap:16, padding:"16px 20px", background:"#0b1523", borderBottom:i<deadlines.length-1?"1px solid rgba(255,255,255,.04)":"none", transition:"background .15s", transitionDelay:(i*.05)+"s" }}
                    onMouseEnter={e=>e.currentTarget.style.background="#0e1c2f"}
                    onMouseLeave={e=>e.currentTarget.style.background="#0b1523"}>
                    <div style={{ width:42, height:42, borderRadius:8, background:d.color+"12", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <div style={{ fontSize:17, fontWeight:800, color:d.color, fontFamily:"'Barlow Condensed',sans-serif", lineHeight:1 }}>{d.days}</div>
                      <div style={{ fontSize:8, color:d.color+"77", fontWeight:700, letterSpacing:".05em", marginTop:1 }}>DAYS</div>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:"#ffffff", marginBottom:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.label}</div>
                      <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", fontWeight:500 }}>{d.date}</div>
                    </div>
                    <div style={{ padding:"3px 10px", borderRadius:4, background:d.color+"12", fontSize:10, fontWeight:700, color:d.color, flexShrink:0 }}>{d.status}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ borderTop:"1px solid rgba(245,158,11,.15)", position:"relative", zIndex:1, background:"linear-gradient(to top,rgba(4,6,12,.8),transparent)" }}>
        {/* Amber glow on border */}
        <div style={{ position:"absolute", top:-1, left:"10%", right:"10%", height:1, background:"linear-gradient(90deg,transparent,rgba(245,158,11,.5),transparent)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(245,158,11,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(245,158,11,.025) 1px,transparent 1px)", backgroundSize:"40px 40px" }} />
        <div style={{ position:"relative", maxWidth:1100, margin:"0 auto", padding:"28px 40px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:26, height:26, borderRadius:7, background:"linear-gradient(135deg,#f59e0b,#f97316)", display:"flex", alignItems:"center", justifyContent:"center" }}><Ic n="build" s={13} c="#0f172a"/></div>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, fontWeight:900, color:"rgba(255,255,255,.35)", letterSpacing:".08em" }}>{companyName.toUpperCase()}</span>
          </div>
          <div style={{ display:"flex", gap:20, alignItems:"center" }}>
            <a href="mailto:admin@buildcore.in" style={{ fontSize:12, color:"rgba(255,255,255,.55)", textDecoration:"none", display:"flex", alignItems:"center", gap:5, fontWeight:600 }}
              onMouseEnter={e=>e.currentTarget.style.color="#f59e0b"}
              onMouseLeave={e=>e.currentTarget.style.color="#334155"}>
              <Ic n="mail" s={12} c="currentColor"/> IT Support
            </a>
            <span style={{ fontSize:11, color:"rgba(255,255,255,.3)", fontWeight:500 }}>Private & Confidential</span>
          </div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", fontWeight:600 }}>© 2026 · BuildCore ERP · RMK Engineering College · Tamil Nadu</div>
        </div>
      </div>
    </div>
  );
}

const HERO_IMAGES = [
  { url: "https://images.unsplash.com/photo-1517089596392-fb9a9033e05b?w=1600&q=90", label: "City Skyline Under Construction" },
  { url: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1600&q=90", label: "Urban Infrastructure at Scale" },
  { url: "https://images.unsplash.com/photo-1431576901776-e539bd916ba2?w=1600&q=90", label: "Towers Rising High" },
  { url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1600&q=90", label: "Foundation to Finish" },
  { url: "https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=1600&q=90", label: "Precision Engineering" },
  { url: "https://images.unsplash.com/photo-1590856029826-c7a73142bbf1?w=1600&q=90", label: "Architecture Perfected" },
];

const SLIDE_IMAGES = [
  { url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=900&q=85", caption: "Building the Future" },
  { url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=900&q=85", caption: "Precision on Every Floor" },
  { url: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=900&q=85", caption: "Steel & Sky" },
  { url: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=900&q=85", caption: "Cranes at Work" },
  { url: "https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=900&q=85", caption: "Rising Higher" },
  { url: "https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=900&q=85", caption: "Skyline in the Making" },
];

/* ===== LOGIN FORM ===== */
function LoginForm({ onBack }) {
  const companyName = localStorage.getItem("bc_company") || "BuildCore Construction";
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [showPass, setShowPass]       = useState(false);
  const [slideIdx, setSlideIdx]       = useState(0);
  // OTP login state
  const [otpLoginMode, setOtpLoginMode] = useState(false);   // show otp-login panel
  const [otpLoginStep, setOtpLoginStep] = useState("email"); // "email" | "otp"
  const [otpEmail, setOtpEmail]       = useState("");
  const [otpCode, setOtpCode]         = useState("");
  const [otpSending, setOtpSending]   = useState(false);
  const [otpErr, setOtpErr]           = useState("");
  const [sentOtp, setSentOtp]         = useState("");  // dev: store otp for display
  const [rememberMe, setRememberMe]   = useState(false);
  const [forgotMode, setForgotMode]   = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStep, setForgotStep]   = useState("email"); // "email"|"otp"|"newpw"|"done"
  const [forgotOtp, setForgotOtp]     = useState("");
  const [forgotNewPw, setForgotNewPw] = useState("");
  const [forgotNewPw2, setForgotNewPw2] = useState("");
  const [forgotOtpErr, setForgotOtpErr] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotDevOtp, setForgotDevOtp] = useState("");
  const [toast, setToast]             = useState(null); // {msg, type}

  const slideRef = useRef(null);

  useEffect(() => {
    const savedEmail = localStorage.getItem("bc_remember_email");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    const t = setInterval(() => setSlideIdx(i => (i + 1) % SLIDE_IMAGES.length), 5000);
    return () => clearInterval(t);
  }, []);

  // Restart slide-in animation on every slide change (forced reflow)
  useEffect(() => {
    const el = slideRef.current;
    if (!el) return;
    el.style.animation = "none";
    void el.offsetHeight;
    el.style.animation = "heroSlideIn 1s cubic-bezier(0.22,1,0.36,1) forwards";
  }, [slideIdx]);

  const handleLogin = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", { email, password });
      if (rememberMe) localStorage.setItem("bc_remember_email", email);
      else localStorage.removeItem("bc_remember_email");
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      showToast("Login successful! Redirecting…", "success");
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password.");
    } finally { setLoading(false); }
  };

  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const forgotReset = () => { setForgotMode(false); setForgotStep("email"); setForgotEmail(""); setForgotOtp(""); setForgotNewPw(""); setForgotNewPw2(""); setForgotOtpErr(""); setForgotDevOtp(""); };

  const handleForgotSendOtp = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true); setForgotOtpErr("");
    try {
      const r = await axios.post("http://localhost:5000/api/auth/request-otp", { email: forgotEmail });
      setForgotDevOtp(r.data.otp || "");
      setForgotStep("otp");
      showToast("OTP sent to your email.", "success");
    } catch (err) {
      setForgotOtpErr(err.response?.data?.message || "Failed to send OTP. Check the email address.");
    } finally { setForgotLoading(false); }
  };

  const handleForgotVerifyOtp = async (e) => {
    e.preventDefault();
    if (forgotOtp.length !== 6) return;
    setForgotLoading(true); setForgotOtpErr("");
    try {
      await axios.post("http://localhost:5000/api/auth/verify-otp", { email: forgotEmail, otp: forgotOtp });
      setForgotStep("newpw");
    } catch (err) {
      setForgotOtpErr(err.response?.data?.message || "Incorrect or expired OTP.");
    } finally { setForgotLoading(false); }
  };

  const handleForgotSetPassword = async (e) => {
    e.preventDefault();
    if (forgotNewPw.length < 6) { setForgotOtpErr("Password must be at least 6 characters."); return; }
    if (forgotNewPw !== forgotNewPw2) { setForgotOtpErr("Passwords do not match."); return; }
    setForgotLoading(true); setForgotOtpErr("");
    try {
      await axios.post("http://localhost:5000/api/auth/reset-password", { email: forgotEmail, newPassword: forgotNewPw });
      setForgotStep("done");
      showToast("Password reset successfully!", "success");
    } catch (err) {
      setForgotOtpErr(err.response?.data?.message || "Failed to reset password.");
    } finally { setForgotLoading(false); }
  };

  const inputSt = { width:"100%", padding:"13px 16px", background:"#0e2038", border:"1px solid rgba(94,145,200,.18)", borderRadius:10, color:"#ffffff", fontSize:14, fontFamily:"'Inter',sans-serif", boxSizing:"border-box" };

  return (
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: "'Inter',sans-serif" }}>
      {/* Left panel — auto slideshow */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden", minHeight: "100vh" }}>
        {/* Layer 1: previous slide — static underneath */}
        <div style={{ position: "absolute", inset: 0, zIndex: 1, backgroundImage: "url(" + SLIDE_IMAGES[(slideIdx - 1 + SLIDE_IMAGES.length) % SLIDE_IMAGES.length].url + ")", backgroundSize: "cover", backgroundPosition: "center", transform: "scale(1.06)" }} />
        <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "linear-gradient(to bottom,rgba(15,23,42,0.25) 0%,rgba(15,23,42,0.65) 80%,rgba(15,23,42,0.9) 100%)" }} />
        {/* Layer 2: current slide — remounts on change */}
        <div ref={slideRef} style={{ position: "absolute", inset: 0, zIndex: 2, animation: "heroSlideIn 1s cubic-bezier(0.22,1,0.36,1) forwards" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "url(" + SLIDE_IMAGES[slideIdx].url + ")", backgroundSize: "cover", backgroundPosition: "center" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,rgba(15,23,42,0.25) 0%,rgba(15,23,42,0.65) 80%,rgba(15,23,42,0.9) 100%)" }} />
        </div>
        {/* Logo overlay */}
        <div style={{ position: "absolute", top: 32, left: 40, zIndex: 10, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic n="build" s={22} c="#0f172a"/></div>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 22, fontWeight: 900, color: "#f1f5f9", letterSpacing: ".1em" }}>{companyName.toUpperCase()}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>Construction ERP Platform</div>
          </div>
        </div>
        {/* Caption + dots */}
        <div style={{ position: "absolute", bottom: 64, left: 40, right: 40, zIndex: 10 }}>
          <div style={{ fontSize: "clamp(20px,2.5vw,32px)", fontWeight: 900, color: "#f1f5f9", fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: ".04em", textShadow: "0 2px 20px rgba(0,0,0,.6)", marginBottom: 6 }}>{SLIDE_IMAGES[slideIdx].caption}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 20, letterSpacing: ".04em" }}>{companyName} — Construction ERP</div>
          <div style={{ display: "flex", gap: 6 }}>
            {SLIDE_IMAGES.map((_, i) => (
              <div key={i} onClick={() => setSlideIdx(i)} style={{ width: i === slideIdx ? 28 : 8, height: 8, borderRadius: 4, background: i === slideIdx ? "#f59e0b" : "rgba(255,255,255,0.3)", transition: "all 0.35s ease", cursor: "pointer" }} />
            ))}
          </div>
        </div>
        {/* Back button */}
        <button onClick={onBack} style={{ position: "absolute", bottom: 22, left: 40, zIndex: 10, background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: 0 }}>← Back to home</button>
      </div>
      {/* Right panel */}
      <div style={{ width: "min(480px,100%)", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 48px", borderLeft: "1px solid rgba(94,145,200,.10)", position:"relative", overflowX:"hidden" }}>
        {/* Toast notification */}
        {toast && (
          <div className={"bc-toast"} style={{ position:"absolute", top:20, right:20, left:20, padding:"14px 18px", borderRadius:12, background: toast.type === "success" ? "rgba(16,185,129,.12)" : "rgba(239,68,68,.12)", border:"1px solid " + (toast.type === "success" ? "rgba(16,185,129,.3)" : "rgba(239,68,68,.3)"), color: toast.type === "success" ? "#10b981" : "#ef4444", fontSize:13, fontWeight:700, zIndex:10, display:"flex", alignItems:"center", gap:10 }}>
            {toast.type === "success" ? <Ic n="check" s={16} c="#10b981"/> : <Ic n="issue" s={16} c="#ef4444"/>} {toast.msg}
          </div>
        )}
        <div style={{ width: "100%" }}>
          {forgotMode ? (
            <div className="forgot-panel">
              <button onClick={forgotReset} style={{ display:"flex", alignItems:"center", gap:6, background:"none", border:"none", color:"rgba(255,255,255,.55)", fontSize:13, cursor:"pointer", marginBottom:28, padding:0 }}>← Back to sign in</button>

              {/* Step indicator */}
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:28 }}>
                {["Email","OTP","New Password","Done"].map((s,i) => {
                  const stepIdx = {email:0,otp:1,newpw:2,done:3}[forgotStep];
                  const done = i < stepIdx, active = i === stepIdx;
                  return (
                    <div key={s} style={{ display:"contents" }}>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                        <div style={{ width:24, height:24, borderRadius:"50%", background: done ? "#10b981" : active ? "#f59e0b" : "#f0f0f0", border: "2px solid " + (done ? "#10b981" : active ? "#f59e0b" : "#ebebeb"), display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, color: done||active ? "#0f172a" : "#334155", transition:"all .3s" }}>
                          {done ? "✓" : i+1}
                        </div>
                        <span style={{ fontSize:9, color: active ? "#f59e0b" : done ? "#10b981" : "#334155", fontWeight:700, letterSpacing:".04em", textTransform:"uppercase" }}>{s}</span>
                      </div>
                      {i < 3 && <div style={{ flex:1, height:1, background: i < stepIdx ? "#10b981" : "#f0f0f0", marginBottom:14, transition:"background .3s" }} />}
                    </div>
                  );
                })}
              </div>

              <h2 style={{ margin:"0 0 6px", fontSize:24, fontWeight:800, color:"#ffffff" }}>
                {forgotStep==="email" && "Reset Password"}
                {forgotStep==="otp"   && "Enter OTP"}
                {forgotStep==="newpw" && "Set New Password"}
                {forgotStep==="done"  && "All Done!"}
              </h2>
              <p style={{ margin:"0 0 24px", fontSize:13, color:"rgba(255,255,255,.55)" }}>
                {forgotStep==="email" && "Enter your registered email to receive a one-time code."}
                {forgotStep==="otp"   && `A 6-digit code was sent to ${forgotEmail}.`}
                {forgotStep==="newpw" && "Choose a strong new password for your account."}
                {forgotStep==="done"  && "Your password has been reset. You can sign in now."}
              </p>

              {forgotOtpErr && (
                <div style={{ padding:"11px 14px", borderRadius:9, background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.2)", color:"#ef4444", fontSize:12, fontWeight:600, marginBottom:16 }}>⚠ {forgotOtpErr}</div>
              )}

              {forgotStep === "email" && (
                <form onSubmit={handleForgotSendOtp} style={{ display:"flex", flexDirection:"column", gap:14 }}>
                  <input className="bc-input" type="email" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} placeholder="you@company.com" required autoFocus style={inputSt}/>
                  <button type="submit" disabled={forgotLoading} className="bc-btn-primary" style={{ padding:"13px", background:"#f59e0b", border:"none", borderRadius:10, color:"#0f172a", fontWeight:800, fontSize:14, cursor:forgotLoading?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, opacity:forgotLoading?.7:1 }}>
                    {forgotLoading ? <><span style={{ width:14,height:14,border:"2px solid #0f172a",borderTopColor:"transparent",borderRadius:"50%",display:"inline-block",animation:"spin .6s linear infinite" }}/> Sending…</> : "Send OTP →"}
                  </button>
                </form>
              )}

              {forgotStep === "otp" && (
                <form onSubmit={handleForgotVerifyOtp} style={{ display:"flex", flexDirection:"column", gap:14 }}>
                  {forgotDevOtp && <div style={{ padding:"9px 13px", borderRadius:8, background:"rgba(245,158,11,.1)", border:"1px solid rgba(245,158,11,.2)", color:"#f59e0b", fontSize:12, fontWeight:700 }}>🔑 Dev OTP: {forgotDevOtp}</div>}
                  <input className="bc-input" type="text" maxLength={6} value={forgotOtp} onChange={e=>setForgotOtp(e.target.value.replace(/\D/g,""))} placeholder="6-digit code" autoFocus style={{ ...inputSt, fontSize:22, letterSpacing:".3em", textAlign:"center" }}/>
                  <button type="submit" disabled={forgotOtp.length!==6||forgotLoading} className="bc-btn-primary" style={{ padding:"13px", background:"#f59e0b", border:"none", borderRadius:10, color:"#0f172a", fontWeight:800, fontSize:14, cursor:(forgotOtp.length!==6||forgotLoading)?"not-allowed":"pointer", opacity:(forgotOtp.length!==6||forgotLoading)?.6:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                    {forgotLoading ? <><span style={{ width:14,height:14,border:"2px solid #0f172a",borderTopColor:"transparent",borderRadius:"50%",display:"inline-block",animation:"spin .6s linear infinite" }}/> Verifying…</> : "Verify OTP →"}
                  </button>
                  <button type="button" onClick={()=>{setForgotStep("email");setForgotOtp("");setForgotOtpErr("");}} style={{ background:"none",border:"none",color:"rgba(255,255,255,.55)",fontSize:12,cursor:"pointer",textAlign:"center" }}>← Resend OTP</button>
                </form>
              )}

              {forgotStep === "newpw" && (
                <form onSubmit={handleForgotSetPassword} style={{ display:"flex", flexDirection:"column", gap:14 }}>
                  <input className="bc-input" type="password" value={forgotNewPw} onChange={e=>setForgotNewPw(e.target.value)} placeholder="New password (min 6 chars)" autoFocus style={inputSt}/>
                  <input className="bc-input" type="password" value={forgotNewPw2} onChange={e=>setForgotNewPw2(e.target.value)} placeholder="Confirm new password" style={inputSt}/>
                  <button type="submit" disabled={forgotLoading} className="bc-btn-primary" style={{ padding:"13px", background:"#f59e0b", border:"none", borderRadius:10, color:"#0f172a", fontWeight:800, fontSize:14, cursor:forgotLoading?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, opacity:forgotLoading?.7:1 }}>
                    {forgotLoading ? <><span style={{ width:14,height:14,border:"2px solid #0f172a",borderTopColor:"transparent",borderRadius:"50%",display:"inline-block",animation:"spin .6s linear infinite" }}/> Resetting…</> : "Reset Password →"}
                  </button>
                </form>
              )}

              {forgotStep === "done" && (
                <div style={{ textAlign:"center", padding:"20px" }}>
                  <div style={{ width:64, height:64, borderRadius:"50%", background:"rgba(16,185,129,.12)", border:"2px solid rgba(16,185,129,.3)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
                    <Ic n="check" s={28} c="#10b981"/>
                  </div>
                  <div style={{ fontSize:14, color:"rgba(255,255,255,.55)", marginBottom:24 }}>Your password has been updated. Sign in with your new password.</div>
                  <button onClick={forgotReset} style={{ padding:"12px 32px", background:"#f59e0b", border:"none", borderRadius:10, color:"#0f172a", fontWeight:800, fontSize:14, cursor:"pointer" }}>Sign In Now →</button>
                </div>
              )}
            </div>
          ) : !otpLoginMode ? (
            <>
              <h2 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800, color: "#f1f5f9" }}>Welcome back</h2>
              <p style={{ margin: "0 0 36px", fontSize: 13, color: "#475569" }}>Sign in to your {companyName} account</p>
              <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 7, textTransform: "uppercase", letterSpacing: ".07em" }}>Email address</label>
                  <input className="bc-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required style={inputSt} />
                </div>
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".07em" }}>Password</label>
                    <button type="button" onClick={() => setForgotMode(true)} style={{ background:"none", border:"none", color:"#f59e0b", fontSize:11, fontWeight:700, cursor:"pointer", padding:0, textDecoration:"underline" }}>Forgot password?</button>
                  </div>
                  <div style={{ position: "relative" }}>
                    <input className="bc-input" type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={{ ...inputSt, paddingRight: 44 }} />
                    <button type="button" onClick={() => setShowPass(p => !p)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 16, padding: 0 }}>{showPass ? "🙈" : "👁️"}</button>
                  </div>
                </div>
                {/* Remember me */}
                <label
                  onClick={(e) => {
                    e.preventDefault();
                    setRememberMe(prev => !prev);
                  }}
                  style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", userSelect:"none" }}
                >
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    readOnly
                    style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
                  />
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 5,
                      border: "1px solid " + (rememberMe ? "#f59e0b" : "rgba(255,255,255,.3)"),
                      background: rememberMe ? "#f59e0b" : "rgba(255,255,255,.05)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all .15s",
                      flexShrink: 0
                    }}
                  >
                    {rememberMe && (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </div>
                  <span style={{ fontSize: 12, color: rememberMe ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.55)", fontWeight: 500, transition: "color .15s" }}>
                    Remember me on this device
                  </span>
                </label>
                {error && (
                  <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(239,68,68,.25)" }}>
                    <div style={{ padding: "12px 16px", background: "rgba(239,68,68,.1)", color: "#ef4444", fontSize: 13 }}>⚠ {error}</div>
                    <button type="button" onClick={() => { setOtpLoginMode(true); setError(""); setOtpErr(""); setOtpCode(""); setOtpLoginStep("email"); }}
                      style={{ width: "100%", padding: "10px 16px", background: "rgba(245,158,11,.08)", border: "none", borderTop: "1px solid rgba(239,68,68,.15)", color: "#f59e0b", fontSize: 12, fontWeight: 700, cursor: "pointer", textAlign: "left" }}>
                      ✉️ Login with OTP instead →
                    </button>
                  </div>
                )}
                <button type="submit" disabled={loading} className="bc-btn-primary" style={{ padding: "14px", background: "#f59e0b", border: "none", borderRadius: 10, color: "#0f172a", fontWeight: 800, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, opacity: loading ? .7 : 1 }}>
                  {loading ? (<><span style={{ width: 16, height: 16, border: "2px solid #0f172a", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin .6s linear infinite" }} /> Signing in…</>) : "Sign In →"}
                </button>
              </form>
              <button type="button" onClick={() => { setOtpLoginMode(true); setError(""); setOtpErr(""); setOtpCode(""); setOtpLoginStep("email"); }}
                style={{ width: "100%", marginTop: 12, padding: "11px", background: "none", border: "1px solid rgba(94,145,200,.15)", borderRadius: 10, color: "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all .2s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(245,158,11,.4)"; e.currentTarget.style.color = "#f59e0b"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#ebebeb"; e.currentTarget.style.color = "#64748b"; }}>
                ✉️ Login with OTP
              </button>
              <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid rgba(94,145,200,.10)" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { icon: "lock", label: "End-to-end JWT authentication" },
                    { icon: "ai", label: "Gemini AI site analysis on every upload" },
                    { icon: "chart", label: "Real-time budget & project tracking" },
                  ].map(({ icon, label }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderRadius: 10, background: "rgba(255,215,140,.04)", border: "1px solid rgba(255,255,255,.05)" }}>
                      <Ic n={icon} s={15} c="#f59e0b"/>
                      <span style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* ── OTP Login Panel ── */}
              <button onClick={() => { setOtpLoginMode(false); setOtpEmail(""); setOtpCode(""); setOtpErr(""); setOtpLoginStep("email"); }}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#64748b", fontSize: 13, cursor: "pointer", marginBottom: 28, padding: 0 }}>← Back to sign in</button>
              <h2 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800, color: "#f1f5f9" }}>Login with OTP</h2>
              <p style={{ margin: "0 0 28px", fontSize: 13, color: "#475569" }}>
                {otpLoginStep === "email" ? "Enter your registered email address." : `OTP sent to ${otpEmail}`}
              </p>
              {otpErr && <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)", color: "#ef4444", fontSize: 13, marginBottom: 16 }}>⚠ {otpErr}</div>}
              {sentOtp && <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.25)", color: "#f59e0b", fontSize: 12, marginBottom: 16, fontWeight: 600 }}>🔑 Dev OTP: {sentOtp}</div>}

              {otpLoginStep === "email" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <input
                    key="login-email-input"
                    autoFocus
                    type="email"
                    value={otpEmail}
                    onChange={e => setOtpEmail(e.target.value)}
                    placeholder="you@company.com"
                    style={{ ...inputSt, fontSize: 15 }}
                  />
                  <button
                    disabled={!otpEmail.includes("@") || otpSending}
                    onClick={async () => {
                      setOtpSending(true); setOtpErr("");
                      try {
                        const r1 = await axios.post("http://localhost:5000/api/auth/request-otp", { email: otpEmail });
                        setSentOtp(r1.data.otp || "");
                        setOtpLoginStep("otp");
                      } catch (err) {
                        setOtpErr(err.response?.data?.message || "Failed to send OTP. Check email.");
                      } finally { setOtpSending(false); }
                    }}
                    style={{ width: "100%", padding: "13px", background: "#f59e0b", border: "none", borderRadius: 10, color: "#0f172a", fontWeight: 800, fontSize: 14, cursor: otpSending ? "not-allowed" : "pointer", opacity: (!otpEmail.includes("@") || otpSending) ? .6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    {otpSending ? (<><span style={{ width: 14, height: 14, border: "2px solid #0f172a", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin .6s linear infinite" }} /> Sending…</>) : "Send OTP →"}
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <input
                    key="otp-code-input"
                    autoFocus
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="6-digit code"
                    style={{ ...inputSt, fontSize: 22, letterSpacing: ".3em", textAlign: "center" }}
                  />
                  <button
                    disabled={otpCode.length !== 6}
                    onClick={async () => {
                      setOtpSending(true); setOtpErr("");
                      try {
                        await axios.post("http://localhost:5000/api/auth/verify-otp", { email: otpEmail, otp: otpCode });
                        const r2 = await axios.post("http://localhost:5000/api/auth/otp-login", { email: otpEmail });
                        localStorage.setItem("token", r2.data.token);
                        localStorage.setItem("user", JSON.stringify(r2.data.user));
                        window.location.reload();
                      } catch (err) {
                        setOtpErr(err.response?.data?.message || "Invalid or expired OTP.");
                      } finally { setOtpSending(false); }
                    }}
                    style={{ width: "100%", padding: "13px", background: "#f59e0b", border: "none", borderRadius: 10, color: "#0f172a", fontWeight: 800, fontSize: 14, cursor: otpCode.length !== 6 ? "not-allowed" : "pointer", opacity: otpCode.length !== 6 ? .6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    {otpSending ? (<><span style={{ width: 14, height: 14, border: "2px solid #0f172a", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin .6s linear infinite" }} /> Verifying…</>) : "Verify & Sign In →"}
                  </button>
                  <button type="button" onClick={() => { setOtpLoginStep("email"); setOtpCode(""); setSentOtp(""); setOtpErr(""); }}
                    style={{ background: "none", border: "none", color: "#475569", fontSize: 12, cursor: "pointer", textAlign: "center" }}>← Resend OTP</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  const [showLogin, setShowLogin] = useState(false);
  useEffect(() => {
    document.body.classList.add("landing-scroll");
    return () => document.body.classList.remove("landing-scroll");
  }, []);
  if (showLogin) return <LoginForm onBack={() => setShowLogin(false)} />;
  return <LandingPage onGetStarted={() => setShowLogin(true)} />;
}
