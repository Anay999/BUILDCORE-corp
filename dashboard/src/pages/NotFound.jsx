import { useState, useEffect } from "react";

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Inter:wght@400;500;600;700;800&display=swap');
@keyframes fadeUp { from{opacity:0;transform:translateY(28px);} to{opacity:1;transform:translateY(0);} }
@keyframes pulse { 0%,100%{opacity:.5;} 50%{opacity:1;} }
@keyframes float { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-14px);} }
@keyframes spin { to{transform:rotate(360deg);} }
@keyframes gridScroll { from{transform:translateY(0);} to{transform:translateY(-50%);} }
.nf-back:hover { background:rgba(245,158,11,.15) !important; border-color:rgba(245,158,11,.4) !important; color:#f59e0b !important; }
.nf-back { transition:all .2s; }
.nf-home:hover { transform:translateY(-2px); box-shadow:0 10px 36px rgba(245,158,11,.45) !important; }
.nf-home { transition:all .2s; }
`;

function Ic({ n, s = 20, c = "currentColor" }) {
  const P = {
    build:  [["M2 20h20"],["M4 20V8l8-6 8 6v12"],["M10 20v-6h4v6"]],
    arrow:  [["M19 12H5"],["M12 5l-7 7 7 7"]],
    home:   [["M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"],["M9 22V12h6v10"]],
    search: [["M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z"],["M21 21l-4.35-4.35"]],
  };
  const segs = P[n] || P["build"];
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" style={{ display:"block", flexShrink:0 }}>
      {segs.map(([d], i) => <path key={i} d={d} />)}
    </svg>
  );
}

export default function NotFound({ onGoHome }) {
  const [count, setCount] = useState(10);

  useEffect(() => {
    if (count <= 0) { onGoHome?.(); return; }
    const t = setTimeout(() => setCount(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, onGoHome]);

  const companyName = localStorage.getItem("bc_company") || "BuildCore Construction";

  return (
    <div style={{ minHeight:"100vh", background:"#0f172a", fontFamily:"'Inter',sans-serif", display:"flex", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden" }}>
      <style>{STYLES}</style>

      {/* Animated grid bg */}
      <div style={{ position:"absolute", inset:0, zIndex:0, overflow:"hidden" }}>
        <div style={{ animation:"gridScroll 20s linear infinite", backgroundImage:"linear-gradient(rgba(245,158,11,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(245,158,11,.04) 1px,transparent 1px)", backgroundSize:"60px 60px", height:"200%", width:"100%" }} />
      </div>

      {/* Glow orbs */}
      <div style={{ position:"absolute", top:"20%", left:"10%", width:300, height:300, borderRadius:"50%", background:"radial-gradient(circle,rgba(245,158,11,.06) 0%,transparent 70%)", pointerEvents:"none" }} />
      <div style={{ position:"absolute", bottom:"15%", right:"8%", width:240, height:240, borderRadius:"50%", background:"radial-gradient(circle,rgba(59,130,246,.06) 0%,transparent 70%)", pointerEvents:"none" }} />

      <div style={{ position:"relative", zIndex:1, textAlign:"center", padding:"40px 24px", maxWidth:600 }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:52, animation:"fadeUp .6s ease both" }}>
          <div style={{ width:36, height:36, borderRadius:10, background:"#f59e0b", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Ic n="build" s={18} c="#0f172a"/>
          </div>
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:20, fontWeight:900, color:"#f1f5f9", letterSpacing:".08em" }}>{companyName.toUpperCase()}</span>
        </div>

        {/* 404 number */}
        <div style={{ animation:"float 3.5s ease-in-out infinite", marginBottom:24 }}>
          <div style={{ fontSize:"clamp(100px,20vw,180px)", fontWeight:900, fontFamily:"'Barlow Condensed',sans-serif", lineHeight:1, background:"linear-gradient(135deg,#f59e0b 0%,#f97316 50%,rgba(245,158,11,.3) 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", letterSpacing:"-.02em", filter:"drop-shadow(0 0 40px rgba(245,158,11,.2))" }}>404</div>
        </div>

        {/* Message */}
        <h1 style={{ fontSize:"clamp(20px,3.5vw,32px)", fontWeight:800, color:"#f1f5f9", margin:"0 0 14px", animation:"fadeUp .7s .1s ease both", opacity:0 }}>Page not found</h1>
        <p style={{ fontSize:15, color:"#64748b", lineHeight:1.8, margin:"0 0 40px", animation:"fadeUp .7s .2s ease both", opacity:0 }}>
          The page you're looking for doesn't exist or has been moved.<br/>
          You'll be redirected to the dashboard in <span style={{ color:"#f59e0b", fontWeight:800 }}>{count}s</span>.
        </p>

        {/* Progress ring */}
        <div style={{ display:"flex", justifyContent:"center", marginBottom:36, animation:"fadeUp .7s .3s ease both", opacity:0 }}>
          <svg width={52} height={52} style={{ transform:"rotate(-90deg)" }}>
            <circle cx={26} cy={26} r={22} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={3}/>
            <circle cx={26} cy={26} r={22} fill="none" stroke="#f59e0b" strokeWidth={3}
              strokeDasharray={`${2 * Math.PI * 22}`}
              strokeDashoffset={`${2 * Math.PI * 22 * (count / 10)}`}
              strokeLinecap="round"
              style={{ transition:"stroke-dashoffset 1s linear" }}/>
          </svg>
        </div>

        {/* CTA buttons */}
        <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap", animation:"fadeUp .7s .35s ease both", opacity:0 }}>
          <button onClick={() => onGoHome?.()} className="nf-home"
            style={{ padding:"14px 36px", background:"linear-gradient(135deg,#f59e0b,#f97316)", border:"none", borderRadius:12, color:"#0f172a", fontWeight:800, fontSize:15, cursor:"pointer", display:"flex", alignItems:"center", gap:8, boxShadow:"0 8px 28px rgba(245,158,11,.3)" }}>
            <Ic n="home" s={16} c="#0f172a"/> Go to Dashboard
          </button>
          <button onClick={() => window.history.back()} className="nf-back"
            style={{ padding:"14px 28px", background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.09)", borderRadius:12, color:"#94a3b8", fontWeight:600, fontSize:15, cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}>
            <Ic n="arrow" s={16} c="currentColor"/> Go Back
          </button>
        </div>

        {/* Quick links */}
        <div style={{ marginTop:48, padding:"20px 24px", background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.06)", borderRadius:16, animation:"fadeUp .7s .45s ease both", opacity:0 }}>
          <div style={{ fontSize:11, color:"#334155", fontWeight:700, textTransform:"uppercase", letterSpacing:".1em", marginBottom:16 }}>Quick Links</div>
          <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
            {["Dashboard","Projects","Team","Reports","Settings"].map(link => (
              <button key={link} onClick={() => onGoHome?.()} style={{ padding:"7px 16px", background:"rgba(245,158,11,.06)", border:"1px solid rgba(245,158,11,.15)", borderRadius:20, color:"#94a3b8", fontSize:12, fontWeight:600, cursor:"pointer", transition:"all .18s" }}
                onMouseEnter={e=>{e.currentTarget.style.color="#f59e0b";e.currentTarget.style.borderColor="rgba(245,158,11,.35)";}}
                onMouseLeave={e=>{e.currentTarget.style.color="#94a3b8";e.currentTarget.style.borderColor="rgba(245,158,11,.15)";}}>
                {link}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop:32, fontSize:11, color:"#1e293b", animation:"fadeUp .7s .55s ease both", opacity:0 }}>
          © 2026 {companyName} · Built at RMK Engineering College
        </div>
      </div>
    </div>
  );
}
