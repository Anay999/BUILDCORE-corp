import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";

const API = "http://localhost:5000";
const tok = () => localStorage.getItem("token");
const H   = () => ({ Authorization: `Bearer ${tok()}` });
const HJ  = () => ({ Authorization: `Bearer ${tok()}`, "Content-Type": "application/json" });

/* ═══════════════════════════════ ICONS ══════════════════════════ */
const Ic = {
  Home:    ()=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Folder:  ()=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  Task:    ()=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  Alert:   ()=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  User:    ()=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Check:   ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Back:    ()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  Camera:  ()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  Chart:   ()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
  Money:   ()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  Pin:     ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Cal:     ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Bell:    ()=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  Plus:    ()=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Team:    ()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Doc:     ()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  Logout:  ()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Search:  ()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Clock:   ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Star:    ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  Fire:    ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>,
  Refresh: ()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
  Flag:    ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
  ChevR:   ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  Settings:()=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
};

/* ═══════════════════════════════ COLORS ═════════════════════════ */
const C = { bg:"#0f172a",card:"#1e293b",card2:"#243044",border:"#334155",accent:"#f59e0b",text:"#f1f5f9",muted:"#94a3b8",green:"#10b981",red:"#ef4444",blue:"#3b82f6",purple:"#8b5cf6",orange:"#f97316" };

/* ═══════════════════════════════ HELPERS ════════════════════════ */
const fmt  = n => "₹" + Number(n||0).toLocaleString("en-IN");
const fmtL = n => "₹" + (Number(n||0)/100000).toFixed(2) + "L";
const dFmt = d => d ? new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) : "—";
const ago  = d => { if(!d) return ""; const s=Math.floor((Date.now()-new Date(d))/1000); if(s<60) return "just now"; if(s<3600) return Math.floor(s/60)+"m ago"; if(s<86400) return Math.floor(s/3600)+"h ago"; return Math.floor(s/86400)+"d ago"; };
const daysLeft = d => d ? Math.ceil((new Date(d)-new Date())/86400000) : null;
const sCol = s => ({completed:C.green,ongoing:C.blue,planned:C.purple,delayed:C.red}[s?.toLowerCase()]||C.muted);
const pCol = p => ({critical:C.red,high:C.orange,medium:C.accent,low:C.green}[p?.toLowerCase()]||C.muted);
const inp  = extra => ({ width:"100%",padding:"13px 14px",borderRadius:12,background:"#0a1525",border:`1.5px solid ${C.border}`,color:C.text,fontSize:15,outline:"none",fontFamily:"inherit",...extra });

/* ═══════════════════════════════ TOAST ══════════════════════════ */
function Toast({toasts}){
  return <div style={{position:"fixed",top:58,left:"50%",transform:"translateX(-50%)",zIndex:9999,display:"flex",flexDirection:"column",gap:8,width:"92%",maxWidth:380,pointerEvents:"none"}}>
    {toasts.map(t=><div key={t.id} style={{background:t.type==="error"?C.red:t.type==="success"?C.green:C.blue,color:"#fff",padding:"12px 18px",borderRadius:14,fontSize:13,fontWeight:700,textAlign:"center",boxShadow:"0 6px 24px rgba(0,0,0,.5)"}}>{t.msg}</div>)}
  </div>;
}

/* ═══════════════════════════════ HEADER ═════════════════════════ */
function Header({title,subtitle,onBack,right}){
  return <div style={{padding:"52px 20px 16px",background:C.card,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:12,position:"sticky",top:0,zIndex:50}}>
    {onBack && <button onClick={onBack} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",padding:"4px 4px 4px 0",flexShrink:0}}><Ic.Back/></button>}
    <div style={{flex:1}}>
      <div style={{fontSize:18,fontWeight:800,color:C.text,lineHeight:1.2}}>{title}</div>
      {subtitle && <div style={{fontSize:12,color:C.muted,marginTop:2}}>{subtitle}</div>}
    </div>
    {right}
  </div>;
}

/* ═══════════════════════════════ BADGE ══════════════════════════ */
const Badge = ({label,col})=><span style={{fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:6,background:`${col||C.muted}22`,color:col||C.muted,textTransform:"uppercase",letterSpacing:".04em"}}>{label}</span>;

/* ═══════════════════════════════ CARD ROW ═══════════════════════ */
const Row = ({label,val,icon,last,valCol})=>(
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingBottom:last?0:12,marginBottom:last?0:12,borderBottom:last?"none":`1px solid ${C.border}`}}>
    <div style={{display:"flex",alignItems:"center",gap:8,color:C.muted,fontSize:13}}>{icon}{label}</div>
    <span style={{fontSize:13,fontWeight:600,color:valCol||C.text,textAlign:"right",maxWidth:"55%"}}>{val}</span>
  </div>
);

/* ═══════════════════════════════ PROGRESS BAR ═══════════════════ */
const PBar = ({pct,col,h=6})=><div style={{height:h,background:C.border,borderRadius:h,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(100,pct||0)}%`,background:col||C.accent,borderRadius:h,transition:"width .4s"}}/></div>;

/* ════════════════════════════════════════════════════════════════
   LOGIN
════════════════════════════════════════════════════════════════ */
/* ── Splash / Onboarding ────────────────────────────────────────── */
function SplashScreen({onDone}){
  const [slide,setSlide]=useState(0);
  const slides=[
    {icon:"🏗️",title:"Welcome to BuildCore",sub:"The #1 construction management platform for Indian teams.",col:"#f59e0b"},
    {icon:"🧠",title:"AI Site Analysis",sub:"Upload photos from site. Gemini AI detects progress, delay risk and safety issues instantly.",col:"#3b82f6"},
    {icon:"📊",title:"Real-Time Tracking",sub:"Tasks, budgets, issues and team — all synced live. Nothing slips through the cracks.",col:"#10b981"},
    {icon:"⚠️",title:"Instant Issue Reporting",sub:"Spot a problem on site? Report it in 10 seconds with type, priority and description.",col:"#ef4444"},
  ];
  const s=slides[slide];
  return <div style={{flex:1,display:"flex",flexDirection:"column",background:C.bg,overflow:"hidden"}}>
    {/* Main content */}
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 32px",textAlign:"center"}}>
      <div style={{width:110,height:110,borderRadius:32,background:`${s.col}18`,border:`2px solid ${s.col}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:48,marginBottom:36,boxShadow:`0 0 40px ${s.col}22`}}>
        {s.icon}
      </div>
      <div style={{fontSize:26,fontWeight:900,color:C.text,marginBottom:14,lineHeight:1.2}}>{s.title}</div>
      <div style={{fontSize:15,color:C.muted,lineHeight:1.7,maxWidth:300}}>{s.sub}</div>
    </div>

    {/* Dots */}
    <div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:24}}>
      {slides.map((_,i)=>(
        <div key={i} onClick={()=>setSlide(i)} style={{width:i===slide?24:8,height:8,borderRadius:4,background:i===slide?s.col:C.border,transition:"all .3s",cursor:"pointer"}}/>
      ))}
    </div>

    {/* Buttons */}
    <div style={{padding:"0 24px 48px",display:"flex",flexDirection:"column",gap:12}}>
      {slide < slides.length-1
        ? <button onClick={()=>setSlide(s=>s+1)} style={{padding:"16px",background:s.col,border:"none",borderRadius:14,color:"#0f172a",fontSize:16,fontWeight:800,cursor:"pointer"}}>Next →</button>
        : <button onClick={onDone} style={{padding:"16px",background:C.accent,border:"none",borderRadius:14,color:"#0f172a",fontSize:16,fontWeight:800,cursor:"pointer"}}>Get Started →</button>
      }
      <button onClick={onDone} style={{padding:"12px",background:"none",border:"none",color:C.muted,fontSize:14,cursor:"pointer"}}>Skip</button>
    </div>
  </div>;
}

function LoginScreen({onLogin}){
  const [showSplash,setShowSplash]=useState(!localStorage.getItem("bc_seen"));
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [showPass,setShowPass]=useState(false);
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);

  const doneSplash=()=>{ localStorage.setItem("bc_seen","1"); setShowSplash(false); };

  const submit=async e=>{
    e.preventDefault();setErr("");setLoading(true);
    try{
      const r=await axios.post(`${API}/api/auth/login`,{email,password:pass});
      localStorage.setItem("token",r.data.token);
      onLogin(r.data.user);
    }catch(ex){setErr(ex.response?.data?.message||"Invalid credentials.");}
    finally{setLoading(false);}
  };

  if(showSplash) return <SplashScreen onDone={doneSplash}/>;

  return <div style={{flex:1,display:"flex",flexDirection:"column",background:C.bg,overflow:"hidden"}}>
    {/* Top hero */}
    <div style={{background:"linear-gradient(145deg,#1e3a5f,#0f172a)",padding:"60px 28px 40px",textAlign:"center",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:-40,right:-40,width:200,height:200,borderRadius:"50%",background:"radial-gradient(circle,rgba(245,158,11,.12),transparent 70%)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:-30,left:-30,width:150,height:150,borderRadius:"50%",background:"radial-gradient(circle,rgba(59,130,246,.1),transparent 70%)",pointerEvents:"none"}}/>
      <div style={{width:64,height:64,borderRadius:18,background:"#f59e0b",display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,margin:"0 auto 16px",boxShadow:"0 8px 24px rgba(245,158,11,.4)"}}>🏗️</div>
      <div style={{fontSize:28,fontWeight:900,color:C.text,letterSpacing:-1}}>Build<span style={{color:C.accent}}>Core</span></div>
      <div style={{fontSize:13,color:C.muted,marginTop:6}}>Construction ERP Platform</div>
    </div>

    {/* Form card */}
    <div style={{flex:1,padding:"32px 24px",display:"flex",flexDirection:"column",gap:0}}>
      <div style={{fontSize:20,fontWeight:800,color:C.text,marginBottom:6}}>Sign in</div>
      <div style={{fontSize:13,color:C.muted,marginBottom:28}}>Enter your credentials to continue</div>

      <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:16}}>
        <div>
          <label style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:".07em",display:"block",marginBottom:7}}>Email</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="you@company.com" style={inp()} required
            onFocus={e=>{e.target.style.borderColor=C.accent;e.target.style.boxShadow=`0 0 0 3px ${C.accent}20`;}}
            onBlur={e=>{e.target.style.borderColor=C.border;e.target.style.boxShadow="none";}}
          />
        </div>
        <div>
          <label style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:".07em",display:"block",marginBottom:7}}>Password</label>
          <div style={{position:"relative"}}>
            <input value={pass} onChange={e=>setPass(e.target.value)} type={showPass?"text":"password"} placeholder="••••••••" style={inp({paddingRight:44})} required
              onFocus={e=>{e.target.style.borderColor=C.accent;e.target.style.boxShadow=`0 0 0 3px ${C.accent}20`;}}
              onBlur={e=>{e.target.style.borderColor=C.border;e.target.style.boxShadow="none";}}
            />
            <button type="button" onClick={()=>setShowPass(p=>!p)} style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:16,padding:0}}>{showPass?"🙈":"👁️"}</button>
          </div>
        </div>
        {err&&<div style={{padding:"12px 16px",borderRadius:10,background:`${C.red}15`,border:`1px solid ${C.red}30`,color:C.red,fontSize:13,display:"flex",alignItems:"center",gap:8}}><span>⚠</span>{err}</div>}
        <button type="submit" disabled={loading} style={{marginTop:4,padding:"16px",background:C.accent,border:"none",borderRadius:14,color:"#0f172a",fontSize:16,fontWeight:800,cursor:loading?"not-allowed":"pointer",opacity:loading?.7:1,display:"flex",alignItems:"center",justifyContent:"center",gap:10,boxShadow:"0 4px 20px rgba(245,158,11,.3)"}}>
          {loading?<><span style={{width:18,height:18,border:"2.5px solid #0f172a",borderTopColor:"transparent",borderRadius:"50%",display:"inline-block",animation:"spin .6s linear infinite"}}/>Signing in…</>:"Sign In →"}
        </button>
      </form>

      {/* Role pills */}
      <div style={{marginTop:"auto",paddingTop:32}}>
        <div style={{fontSize:11,color:C.border,textAlign:"center",marginBottom:12,textTransform:"uppercase",letterSpacing:".06em"}}>Role Access</div>
        <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
          {[["Boss","#f59e0b"],["Manager","#3b82f6"],["Engineer","#8b5cf6"],["Worker","#10b981"]].map(([r,col])=>(
            <span key={r} style={{fontSize:11,fontWeight:700,padding:"4px 12px",borderRadius:20,background:`${col}18`,color:col,border:`1px solid ${col}30`}}>{r}</span>
          ))}
        </div>
      </div>
    </div>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>;
}

/* ════════════════════════════════════════════════════════════════
   HOME
════════════════════════════════════════════════════════════════ */
function HomeScreen({user,projects,tasks,issues,navigate,setTab,addToast,refreshAll}){
  const allTasks=Object.values(tasks).flat();
  const myTasks=allTasks.filter(t=>String(t.assigned_to)===String(user.id)||String(t.created_by)===String(user.id));
  const pending=myTasks.filter(t=>!t.completed);
  const overdue=pending.filter(t=>t.due_date&&new Date(t.due_date)<new Date());
  const openIssues=issues.filter(i=>i.status==="open");
  const h=new Date().getHours();
  const greeting=h<12?"Good morning":h<17?"Good afternoon":"Good evening";
  const today=new Date().toLocaleDateString("en-IN",{weekday:"long",day:"2-digit",month:"long"});

  const stats=[
    {label:"Projects",val:projects.length,col:C.blue,tab:"projects"},
    {label:"My Tasks",val:pending.length,col:C.accent,tab:"tasks"},
    {label:"Issues",val:openIssues.length,col:openIssues.length>0?C.red:C.green,tab:"issues"},
    {label:"Overdue",val:overdue.length,col:overdue.length>0?C.red:C.green,tab:"tasks"},
  ];

  const quickActions=[
    {label:"Upload Photo",icon:<Ic.Camera/>,col:C.blue,screen:"upload",desc:"AI site analysis"},
    {label:"Log Progress",icon:<Ic.Chart/>,col:C.green,screen:"progress",desc:"Daily update"},
    {label:"Log Expense",icon:<Ic.Money/>,col:C.purple,screen:"expense",desc:"Record cost"},
    {label:"Report Issue",icon:<Ic.Alert/>,col:C.red,screen:"issue-form",desc:"Flag problem"},
  ];

  const upcoming=projects.filter(p=>p.deadline&&daysLeft(p.deadline)!==null&&daysLeft(p.deadline)>=0&&daysLeft(p.deadline)<=14&&p.status!=="completed").sort((a,b)=>new Date(a.deadline)-new Date(b.deadline));

  return <div style={{flex:1,overflowY:"auto",paddingBottom:80}}>
    {/* Hero */}
    <div style={{background:"linear-gradient(135deg,#1e3a5f 0%,#0f172a 100%)",padding:"52px 20px 24px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div style={{fontSize:13,color:C.muted,marginBottom:4}}>{greeting} 👋</div>
          <div style={{fontSize:24,fontWeight:800,color:C.text}}>{user.name}</div>
          <div style={{fontSize:12,color:C.accent,fontWeight:600,marginTop:4,textTransform:"uppercase",letterSpacing:".06em"}}>{user.role} • {today}</div>
        </div>
        <button onClick={refreshAll} style={{background:`${C.blue}22`,border:`1px solid ${C.blue}44`,borderRadius:10,padding:"8px",color:C.blue,cursor:"pointer"}}><Ic.Refresh/></button>
      </div>
    </div>

    {/* Stats */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:0,background:C.card,borderBottom:`1px solid ${C.border}`,margin:"0 0 0"}}>
      {stats.map(s=>(
        <button key={s.label} onClick={()=>setTab(s.tab)} style={{padding:"16px 8px",background:"none",border:"none",borderRight:`1px solid ${C.border}`,cursor:"pointer",textAlign:"center",transition:"background .15s"}} onMouseDown={e=>e.currentTarget.style.background=`${s.col}15`} onMouseUp={e=>e.currentTarget.style.background="none"}>
          <div style={{fontSize:22,fontWeight:800,color:s.col}}>{s.val}</div>
          <div style={{fontSize:10,color:C.muted,marginTop:2,fontWeight:600}}>{s.label.toUpperCase()}</div>
        </button>
      ))}
    </div>

    {/* Quick Actions */}
    <div style={{padding:"20px 16px 0"}}>
      <div style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em",marginBottom:12}}>Quick Actions</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {quickActions.map(a=>(
          <button key={a.label} onClick={()=>navigate(a.screen)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:"16px 14px",display:"flex",flexDirection:"column",gap:10,cursor:"pointer",textAlign:"left",borderLeft:`3px solid ${a.col}`,transition:"transform .1s"}} onMouseDown={e=>e.currentTarget.style.transform="scale(.97)"} onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}>
            <div style={{color:a.col,display:"flex",alignItems:"center",gap:8}}>{a.icon}<span style={{fontSize:13,fontWeight:700,color:C.text}}>{a.label}</span></div>
            <div style={{fontSize:11,color:C.muted}}>{a.desc}</div>
          </button>
        ))}
      </div>
    </div>

    {/* Overdue tasks */}
    {overdue.length>0&&<div style={{padding:"20px 16px 0"}}>
      <div style={{background:`${C.red}12`,border:`1px solid ${C.red}33`,borderRadius:16,padding:"14px 16px"}}>
        <div style={{fontSize:12,color:C.red,fontWeight:700,marginBottom:10}}>⚠ {overdue.length} OVERDUE {overdue.length===1?"TASK":"TASKS"}</div>
        {overdue.slice(0,3).map(t=>(
          <div key={t.id} onClick={()=>navigate("task-detail",t)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,cursor:"pointer"}}>
            <span style={{fontSize:13,color:C.text,flex:1}}>{t.title}</span>
            <span style={{fontSize:11,color:C.red,marginLeft:10}}>{dFmt(t.due_date)}</span>
          </div>
        ))}
      </div>
    </div>}

    {/* Upcoming deadlines */}
    {upcoming.length>0&&<div style={{padding:"20px 16px 0"}}>
      <div style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em",marginBottom:12}}>Upcoming Deadlines</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {upcoming.slice(0,4).map(p=>{
          const dl=daysLeft(p.deadline);
          return <button key={p.id} onClick={()=>navigate("project-detail",p)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",textAlign:"left"}}>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:C.text}}>{p.title}</div>
              <div style={{fontSize:11,color:C.muted,marginTop:3,display:"flex",alignItems:"center",gap:4}}><Ic.Cal/>{dFmt(p.deadline)}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:18,fontWeight:800,color:dl<=3?C.red:dl<=7?C.orange:C.accent}}>{dl}</div>
              <div style={{fontSize:10,color:C.muted}}>days left</div>
            </div>
          </button>;
        })}
      </div>
    </div>}

    {/* Recent tasks */}
    <div style={{padding:"20px 16px 0"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em"}}>My Pending Tasks</div>
        <button onClick={()=>setTab("tasks")} style={{background:"none",border:"none",color:C.accent,fontSize:12,fontWeight:700,cursor:"pointer"}}>See all →</button>
      </div>
      {pending.length===0
        ?<div style={{background:C.card,borderRadius:14,padding:"24px",textAlign:"center",border:`1px solid ${C.border}`}}><div style={{fontSize:24,marginBottom:6}}>✅</div><div style={{color:C.muted,fontSize:13}}>All tasks complete!</div></div>
        :pending.slice(0,4).map(t=>{
          const od=t.due_date&&new Date(t.due_date)<new Date();
          return <button key={t.id} onClick={()=>navigate("task-detail",t)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 16px",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",width:"100%",textAlign:"left",borderLeft:`3px solid ${od?C.red:C.accent}`}}>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:600,color:C.text}}>{t.title}</div>
              {t.due_date&&<div style={{fontSize:11,color:od?C.red:C.muted,marginTop:3}}>{od?"Overdue: ":""}{dFmt(t.due_date)}</div>}
            </div>
            <Ic.ChevR/>
          </button>;
        })
      }
    </div>

    {/* Open issues */}
    {openIssues.length>0&&<div style={{padding:"20px 16px 0"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em"}}>Open Issues</div>
        <button onClick={()=>setTab("issues")} style={{background:"none",border:"none",color:C.accent,fontSize:12,fontWeight:700,cursor:"pointer"}}>See all →</button>
      </div>
      {openIssues.slice(0,3).map(i=>(
        <button key={i.id} onClick={()=>navigate("issue-detail",i)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 16px",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",width:"100%",textAlign:"left",borderLeft:`3px solid ${pCol(i.priority)}`}}>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:600,color:C.text}}>{i.title}</div>
            <div style={{fontSize:11,color:C.muted,marginTop:3}}>{i.type} • {i.priority}</div>
          </div>
          <Badge label={i.priority} col={pCol(i.priority)}/>
        </button>
      ))}
    </div>}
    <div style={{height:24}}/>
  </div>;
}

/* ════════════════════════════════════════════════════════════════
   PROJECTS LIST
════════════════════════════════════════════════════════════════ */
function ProjectsScreen({projects,tasks,navigate}){
  const [search,setSearch]=useState("");
  const [filter,setFilter]=useState("all");
  const filtered=projects.filter(p=>filter==="all"||p.status?.toLowerCase()===filter).filter(p=>!search||p.title?.toLowerCase().includes(search.toLowerCase())||p.location?.toLowerCase().includes(search.toLowerCase()));

  return <div style={{flex:1,overflowY:"auto",paddingBottom:80}}>
    <div style={{padding:"52px 16px 16px",background:C.card,borderBottom:`1px solid ${C.border}`}}>
      <div style={{fontSize:20,fontWeight:800,color:C.text,marginBottom:12}}>Projects <span style={{fontSize:14,color:C.muted,fontWeight:500}}>({projects.length})</span></div>
      <div style={{position:"relative"}}>
        <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:C.muted}}><Ic.Search/></span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search projects..." style={inp({paddingLeft:38})}/>
      </div>
    </div>
    <div style={{display:"flex",gap:8,padding:"12px 16px",overflowX:"auto"}}>
      {[["all","All"],["ongoing","Ongoing"],["planned","Planned"],["delayed","Delayed"],["completed","Done"]].map(([val,lbl])=>(
        <button key={val} onClick={()=>setFilter(val)} style={{flexShrink:0,padding:"7px 16px",borderRadius:20,border:`1.5px solid ${filter===val?C.accent:C.border}`,background:filter===val?`${C.accent}20`:"transparent",color:filter===val?C.accent:C.muted,fontSize:13,fontWeight:600,cursor:"pointer"}}>{lbl}</button>
      ))}
    </div>
    <div style={{padding:"0 16px",display:"flex",flexDirection:"column",gap:12}}>
      {filtered.length===0?<div style={{background:C.card,borderRadius:14,padding:"40px",textAlign:"center",border:`1px solid ${C.border}`}}><div style={{fontSize:32,marginBottom:8}}>📁</div><div style={{color:C.muted}}>No projects found</div></div>
      :filtered.map(p=>{
        const pt=tasks[p.id]||[]; const done=pt.filter(t=>t.completed).length; const pct=pt.length?Math.round(done/pt.length*100):0; const col=sCol(p.status); const dl=daysLeft(p.deadline);
        return <button key={p.id} onClick={()=>navigate("project-detail",p)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:"16px",cursor:"pointer",textAlign:"left",width:"100%",borderLeft:`4px solid ${col}`,transition:"transform .1s"}} onMouseDown={e=>e.currentTarget.style.transform="scale(.98)"} onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
            <div style={{fontSize:15,fontWeight:700,color:C.text,flex:1,paddingRight:10}}>{p.title}</div>
            <Badge label={p.status||"unknown"} col={col}/>
          </div>
          {p.location&&<div style={{fontSize:12,color:C.muted,marginBottom:8,display:"flex",alignItems:"center",gap:4}}><Ic.Pin/>{p.location}</div>}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <span style={{fontSize:12,color:C.muted}}>{done}/{pt.length} tasks • {pct}%</span>
            {dl!==null&&<span style={{fontSize:12,color:dl<0?C.red:dl<7?C.orange:C.muted,fontWeight:dl<7?700:400}}>{dl<0?`${Math.abs(dl)}d late`:`${dl}d left`}</span>}
          </div>
          <PBar pct={pct} col={col}/>
          {p.budget&&<div style={{fontSize:12,color:C.muted,marginTop:8}}>Budget: {fmtL(p.budget)}</div>}
        </button>;
      })}
    </div>
    <div style={{height:16}}/>
  </div>;
}

/* ════════════════════════════════════════════════════════════════
   PROJECT DETAIL
════════════════════════════════════════════════════════════════ */
function ProjectDetail({project,tasks,expenses,issuesList,navigate,goBack,addToast,refreshAll}){
  const [activeTab,setActiveTab]=useState("overview");
  const [localTasks,setLocalTasks]=useState(tasks[project.id]||[]);
  const [localExpenses,setLocalExpenses]=useState([]);
  const [members,setMembers]=useState([]);
  const [milestones,setMilestones]=useState([]);
  const [loading,setLoading]=useState(false);

  useEffect(()=>{
    setLocalTasks(tasks[project.id]||[]);
    // load expenses
    axios.get(`${API}/api/expenses/${project.id}`,{headers:H()}).then(r=>setLocalExpenses(r.data||[])).catch(()=>{});
    // load members/team
    axios.get(`${API}/api/users`,{headers:H()}).then(r=>setMembers(r.data||[])).catch(()=>{});
    // load milestones
    axios.get(`${API}/api/milestones/${project.id}`,{headers:H()}).then(r=>setMilestones(r.data||[])).catch(()=>{});
  },[project.id,tasks]);

  const done=localTasks.filter(t=>t.completed).length;
  const pct=localTasks.length?Math.round(done/localTasks.length*100):0;
  const dl=daysLeft(project.deadline);
  const col=sCol(project.status);
  const projIssues=(issuesList||[]).filter(i=>String(i.project_id)===String(project.id));
  const totalSpend=localExpenses.reduce((s,e)=>s+Number(e.amount||0),0);
  const budgetPct=project.budget?Math.round(totalSpend/project.budget*100):0;

  const toggleTask=async t=>{
    try{
      await axios.patch(`${API}/api/tasks/${t.id}`,{completed:!t.completed},{headers:HJ()});
      setLocalTasks(prev=>prev.map(x=>x.id===t.id?{...x,completed:!x.completed}:x));
      addToast(t.completed?"Task reopened":"Task completed! ✅","success");
    }catch{addToast("Failed to update task","error");}
  };

  const tabs=["overview","tasks","issues","expenses","team"];

  return <div style={{flex:1,overflowY:"auto",paddingBottom:80}}>
    {/* Header */}
    <div style={{background:"linear-gradient(135deg,#1e3a5f,#0f172a)",padding:"52px 20px 0"}}>
      <button onClick={goBack} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",display:"flex",alignItems:"center",gap:6,marginBottom:12,fontSize:13}}><Ic.Back/>Projects</button>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
        <div style={{flex:1,paddingRight:12}}>
          <div style={{fontSize:20,fontWeight:800,color:C.text,lineHeight:1.3}}>{project.title}</div>
          {project.location&&<div style={{fontSize:13,color:C.muted,marginTop:6,display:"flex",alignItems:"center",gap:4}}><Ic.Pin/>{project.location}</div>}
        </div>
        <Badge label={project.status||"unknown"} col={col}/>
      </div>
      {/* Mini stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",background:`${C.bg}80`,borderRadius:"12px 12px 0 0",overflow:"hidden"}}>
        {[{label:"Tasks",val:`${done}/${localTasks.length}`,col:C.blue},{label:"Progress",val:`${pct}%`,col:C.accent},{label:"Days Left",val:dl!==null?(dl<0?`${Math.abs(dl)}L`:`${dl}d`):"—",col:dl<0?C.red:dl<7?C.orange:C.green},{label:"Spend",val:project.budget?`${budgetPct}%`:"—",col:budgetPct>90?C.red:budgetPct>70?C.orange:C.green}].map(s=>(
          <div key={s.label} style={{textAlign:"center",padding:"14px 4px",borderRight:`1px solid ${C.border}`}}>
            <div style={{fontSize:16,fontWeight:800,color:s.col}}>{s.val}</div>
            <div style={{fontSize:10,color:C.muted,marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>
      {/* Tabs */}
      <div style={{display:"flex",overflowX:"auto",borderTop:`1px solid ${C.border}`}}>
        {tabs.map(t=><button key={t} onClick={()=>setActiveTab(t)} style={{flexShrink:0,padding:"12px 16px",background:"none",border:"none",borderBottom:`2px solid ${activeTab===t?C.accent:"transparent"}`,color:activeTab===t?C.accent:C.muted,fontWeight:activeTab===t?700:500,fontSize:13,cursor:"pointer",textTransform:"capitalize"}}>{t}</button>)}
      </div>
    </div>

    <div style={{padding:"16px"}}>
      {/* OVERVIEW TAB */}
      {activeTab==="overview"&&<>
        <div style={{background:C.card,borderRadius:14,padding:"16px",border:`1px solid ${C.border}`,marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:12}}>Overall Progress</div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <span style={{fontSize:12,color:C.muted}}>{done} of {localTasks.length} tasks done</span>
            <span style={{fontSize:13,fontWeight:700,color:C.accent}}>{pct}%</span>
          </div>
          <PBar pct={pct} col={pct>=100?C.green:col} h={10}/>
          {project.budget&&<><div style={{display:"flex",justifyContent:"space-between",marginBottom:8,marginTop:14}}>
            <span style={{fontSize:12,color:C.muted}}>Budget Used: {fmt(totalSpend)} / {fmt(project.budget)}</span>
            <span style={{fontSize:13,fontWeight:700,color:budgetPct>90?C.red:C.green}}>{budgetPct}%</span>
          </div><PBar pct={budgetPct} col={budgetPct>90?C.red:budgetPct>70?C.orange:C.green} h={8}/></>}
        </div>
        <div style={{background:C.card,borderRadius:14,padding:"16px",border:`1px solid ${C.border}`,marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:12}}>Project Info</div>
          <Row label="Deadline" val={dFmt(project.deadline)} icon={<Ic.Cal/>} valCol={dl!==null&&dl<7?C.red:undefined}/>
          <Row label="Budget" val={project.budget?fmtL(project.budget):"Not set"} icon={<Ic.Money/>}/>
          <Row label="Location" val={project.location||"Not set"} icon={<Ic.Pin/>}/>
          <Row label="Status" val={project.status||"Unknown"} icon={<Ic.Flag/>} valCol={col} last/>
          {project.description&&<div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${C.border}`}}><div style={{fontSize:11,color:C.muted,marginBottom:6}}>Description</div><div style={{fontSize:13,color:C.text,lineHeight:1.6}}>{project.description}</div></div>}
        </div>
        {milestones.length>0&&<div style={{background:C.card,borderRadius:14,padding:"16px",border:`1px solid ${C.border}`,marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:12}}>Milestones</div>
          {milestones.map((m,i)=><div key={m.id||i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:i<milestones.length-1?12:0}}>
            <div style={{width:20,height:20,borderRadius:"50%",background:m.completed?C.green:`${C.border}`,border:`2px solid ${m.completed?C.green:C.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{m.completed&&<span style={{color:"#fff",fontSize:10}}>✓</span>}</div>
            <div style={{flex:1}}><div style={{fontSize:13,color:m.completed?C.muted:C.text,textDecoration:m.completed?"line-through":"none"}}>{m.title||m.name}</div>{m.due_date&&<div style={{fontSize:11,color:C.muted}}>{dFmt(m.due_date)}</div>}</div>
          </div>)}
        </div>}
        {/* Actions */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {[{label:"📷 Upload Photo",col:C.blue,screen:"upload"},{label:"📊 Log Progress",col:C.green,screen:"progress"},{label:"⚠ Report Issue",col:C.red,screen:"issue-form"},{label:"💰 Log Expense",col:C.purple,screen:"expense"}].map(a=>(
            <button key={a.label} onClick={()=>navigate(a.screen,project.id)} style={{padding:"14px",background:`${a.col}18`,border:`1px solid ${a.col}33`,borderRadius:12,color:a.col,fontSize:13,fontWeight:700,cursor:"pointer"}}>{a.label}</button>
          ))}
        </div>
      </>}

      {/* TASKS TAB */}
      {activeTab==="tasks"&&<>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <span style={{fontSize:13,color:C.muted}}>{localTasks.length} tasks • {done} completed</span>
          <button onClick={()=>navigate("task-form",project.id)} style={{background:C.accent,border:"none",borderRadius:10,padding:"6px 14px",color:"#0f172a",fontWeight:700,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}><Ic.Plus/> Add</button>
        </div>
        {localTasks.length===0?<div style={{background:C.card,borderRadius:14,padding:"40px",textAlign:"center",border:`1px solid ${C.border}`}}><div style={{fontSize:28,marginBottom:8}}>📋</div><div style={{color:C.muted}}>No tasks yet</div></div>
        :localTasks.map(t=>{
          const od=!t.completed&&t.due_date&&new Date(t.due_date)<new Date();
          return <div key={t.id} style={{background:C.card,borderRadius:14,padding:"14px 16px",marginBottom:10,border:`1px solid ${C.border}`,borderLeft:`4px solid ${t.completed?C.green:od?C.red:C.accent}`,display:"flex",alignItems:"center",gap:12}}>
            <button onClick={()=>toggleTask(t)} style={{width:24,height:24,borderRadius:6,border:`2px solid ${t.completed?C.green:C.border}`,background:t.completed?C.green:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,padding:0}}>
              {t.completed&&<span style={{color:"#fff"}}><Ic.Check/></span>}
            </button>
            <div onClick={()=>navigate("task-detail",t)} style={{flex:1,cursor:"pointer"}}>
              <div style={{fontSize:14,fontWeight:600,color:t.completed?C.muted:C.text,textDecoration:t.completed?"line-through":"none"}}>{t.title}</div>
              <div style={{fontSize:11,color:od?C.red:C.muted,marginTop:3}}>{t.due_date&&dFmt(t.due_date)}{od?" • OVERDUE":""}</div>
            </div>
            <button onClick={()=>navigate("task-detail",t)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer"}}><Ic.ChevR/></button>
          </div>;
        })}
      </>}

      {/* ISSUES TAB */}
      {activeTab==="issues"&&<>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <span style={{fontSize:13,color:C.muted}}>{projIssues.length} issues</span>
          <button onClick={()=>navigate("issue-form",project.id)} style={{background:C.red,border:"none",borderRadius:10,padding:"6px 14px",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}><Ic.Plus/> Report</button>
        </div>
        {projIssues.length===0?<div style={{background:C.card,borderRadius:14,padding:"40px",textAlign:"center",border:`1px solid ${C.border}`}}><div style={{fontSize:28,marginBottom:8}}>✅</div><div style={{color:C.muted}}>No issues</div></div>
        :projIssues.map(i=>(
          <button key={i.id} onClick={()=>navigate("issue-detail",i)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 16px",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",width:"100%",textAlign:"left",borderLeft:`4px solid ${pCol(i.priority)}`}}>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:600,color:C.text}}>{i.title}</div>
              <div style={{fontSize:11,color:C.muted,marginTop:3}}>{i.type} • {ago(i.created_at)}</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
              <Badge label={i.status} col={i.status==="open"?C.red:i.status==="in_progress"?C.orange:C.green}/>
              <Badge label={i.priority} col={pCol(i.priority)}/>
            </div>
          </button>
        ))}
      </>}

      {/* EXPENSES TAB */}
      {activeTab==="expenses"&&<>
        <div style={{background:C.card,borderRadius:14,padding:"16px",border:`1px solid ${C.border}`,marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <div><div style={{fontSize:12,color:C.muted}}>Total Spent</div><div style={{fontSize:22,fontWeight:800,color:C.accent}}>{fmt(totalSpend)}</div></div>
            {project.budget&&<div style={{textAlign:"right"}}><div style={{fontSize:12,color:C.muted}}>Budget</div><div style={{fontSize:22,fontWeight:800,color:C.text}}>{fmt(project.budget)}</div></div>}
          </div>
          {project.budget&&<><div style={{marginTop:12}}><PBar pct={budgetPct} col={budgetPct>90?C.red:budgetPct>70?C.orange:C.green} h={8}/></div><div style={{fontSize:12,color:budgetPct>90?C.red:C.muted,marginTop:6,textAlign:"right"}}>{budgetPct}% used</div></>}
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <span style={{fontSize:13,color:C.muted}}>{localExpenses.length} entries</span>
          <button onClick={()=>navigate("expense",project.id)} style={{background:C.purple,border:"none",borderRadius:10,padding:"6px 14px",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}><Ic.Plus/> Add</button>
        </div>
        {localExpenses.length===0?<div style={{background:C.card,borderRadius:14,padding:"40px",textAlign:"center",border:`1px solid ${C.border}`}}><div style={{fontSize:28,marginBottom:8}}>💰</div><div style={{color:C.muted}}>No expenses logged</div></div>
        :localExpenses.map((e,i)=>(
          <div key={e.id||i} style={{background:C.card,borderRadius:14,padding:"14px 16px",marginBottom:10,border:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:14,fontWeight:600,color:C.text}}>{e.category}</div>
              <div style={{fontSize:11,color:C.muted,marginTop:3}}>{e.description||"No description"} • {ago(e.created_at)}</div>
            </div>
            <div style={{fontSize:16,fontWeight:800,color:C.accent}}>{fmt(e.amount)}</div>
          </div>
        ))}
      </>}

      {/* TEAM TAB */}
      {activeTab==="team"&&<>
        <div style={{fontSize:13,color:C.muted,marginBottom:12}}>{members.length} members</div>
        {members.length===0?<div style={{background:C.card,borderRadius:14,padding:"40px",textAlign:"center",border:`1px solid ${C.border}`}}><div style={{fontSize:28,marginBottom:8}}>👥</div><div style={{color:C.muted}}>No team data</div></div>
        :members.slice(0,20).map(m=>{
          const rc=({boss:C.accent,manager:C.blue,engineer:C.purple,worker:C.green}[m.role]||C.muted);
          return <div key={m.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 16px",marginBottom:10,display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:42,height:42,borderRadius:"50%",background:`${rc}33`,border:`2px solid ${rc}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:800,color:rc,flexShrink:0}}>{m.name?.[0]?.toUpperCase()||"?"}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:700,color:C.text}}>{m.name}</div>
              <div style={{fontSize:11,color:C.muted,marginTop:2}}>{m.email}</div>
            </div>
            <Badge label={m.role} col={rc}/>
          </div>;
        })}
      </>}
    </div>
  </div>;
}

/* ════════════════════════════════════════════════════════════════
   TASK DETAIL
════════════════════════════════════════════════════════════════ */
function TaskDetail({task:initialTask,projects,addToast,goBack}){
  const [task,setTask]=useState(initialTask);
  const [loading,setLoading]=useState(false);
  const proj=projects.find(p=>String(p.id)===String(task.project_id));

  const toggle=async()=>{
    setLoading(true);
    try{
      await axios.patch(`${API}/api/tasks/${task.id}`,{completed:!task.completed},{headers:HJ()});
      setTask(prev=>({...prev,completed:!prev.completed}));
      addToast(task.completed?"Reopened":"Marked complete ✅","success");
    }catch{addToast("Failed","error");}finally{setLoading(false);}
  };

  const col=task.completed?C.green:task.due_date&&new Date(task.due_date)<new Date()?C.red:C.accent;
  return <div style={{flex:1,overflowY:"auto",paddingBottom:80}}>
    <Header title={task.title} onBack={goBack} subtitle={proj?.title||""}/>
    <div style={{padding:"16px",display:"flex",flexDirection:"column",gap:14}}>
      <div style={{background:C.card,borderRadius:14,padding:"16px",border:`1px solid ${col}44`,borderLeft:`4px solid ${col}`}}>
        <Badge label={task.completed?"Completed":task.due_date&&new Date(task.due_date)<new Date()?"Overdue":"Pending"} col={col}/>
        {task.description&&<div style={{fontSize:13,color:C.text,marginTop:12,lineHeight:1.6}}>{task.description}</div>}
      </div>
      <div style={{background:C.card,borderRadius:14,padding:"16px",border:`1px solid ${C.border}`}}>
        <Row label="Project" val={proj?.title||"Unknown"} icon={<Ic.Folder/>}/>
        <Row label="Due Date" val={dFmt(task.due_date)} icon={<Ic.Cal/>} valCol={task.due_date&&new Date(task.due_date)<new Date()?C.red:undefined}/>
        <Row label="Created" val={dFmt(task.created_at)} icon={<Ic.Clock/>} last/>
      </div>
      <button onClick={toggle} disabled={loading} style={{padding:"16px",background:task.completed?`${C.orange}22`:C.green,border:task.completed?`1px solid ${C.orange}44`:"none",borderRadius:14,color:task.completed?C.orange:"#fff",fontSize:15,fontWeight:800,cursor:"pointer",opacity:loading?.7:1}}>
        {loading?"Updating…":task.completed?"↩ Reopen Task":"✓ Mark Complete"}
      </button>
    </div>
  </div>;
}

/* ════════════════════════════════════════════════════════════════
   ISSUES LIST
════════════════════════════════════════════════════════════════ */
function IssuesListScreen({issues,projects,navigate,addToast,refresh}){
  const [filter,setFilter]=useState("open");
  const [typeFilter,setTypeFilter]=useState("all");
  const filtered=issues.filter(i=>filter==="all"||i.status===filter).filter(i=>typeFilter==="all"||i.type===typeFilter);
  const types=["all",...new Set(issues.map(i=>i.type).filter(Boolean))];

  return <div style={{flex:1,overflowY:"auto",paddingBottom:80}}>
    <div style={{padding:"52px 16px 0",background:C.card,borderBottom:`1px solid ${C.border}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div>
          <div style={{fontSize:20,fontWeight:800,color:C.text}}>Issues</div>
          <div style={{fontSize:12,color:C.muted,marginTop:2}}>{issues.filter(i=>i.status==="open").length} open</div>
        </div>
        <button onClick={()=>navigate("issue-form")} style={{background:C.red,border:"none",borderRadius:12,padding:"10px 16px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}><Ic.Plus/>Report</button>
      </div>
      <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:14}}>
        {[["open","Open"],["in_progress","In Progress"],["resolved","Resolved"],["all","All"]].map(([val,lbl])=>(
          <button key={val} onClick={()=>setFilter(val)} style={{flexShrink:0,padding:"7px 14px",borderRadius:20,border:`1.5px solid ${filter===val?C.accent:C.border}`,background:filter===val?`${C.accent}20`:"transparent",color:filter===val?C.accent:C.muted,fontSize:13,fontWeight:600,cursor:"pointer"}}>{lbl}</button>
        ))}
      </div>
    </div>
    <div style={{display:"flex",gap:8,padding:"12px 16px",overflowX:"auto"}}>
      {types.slice(0,6).map(t=>(
        <button key={t} onClick={()=>setTypeFilter(t)} style={{flexShrink:0,padding:"5px 12px",borderRadius:20,border:`1.5px solid ${typeFilter===t?C.blue:C.border}`,background:typeFilter===t?`${C.blue}20`:"transparent",color:typeFilter===t?C.blue:C.muted,fontSize:12,fontWeight:600,cursor:"pointer",textTransform:"capitalize"}}>{t}</button>
      ))}
    </div>
    <div style={{padding:"0 16px",display:"flex",flexDirection:"column",gap:10}}>
      {filtered.length===0?<div style={{background:C.card,borderRadius:14,padding:"40px",textAlign:"center",border:`1px solid ${C.border}`}}><div style={{fontSize:32,marginBottom:8}}>✅</div><div style={{color:C.muted}}>No {filter} issues</div></div>
      :filtered.map(i=>{
        const pc=pCol(i.priority); const sc=i.status==="open"?C.red:i.status==="in_progress"?C.orange:C.green;
        const proj=projects.find(p=>String(p.id)===String(i.project_id));
        return <button key={i.id} onClick={()=>navigate("issue-detail",i)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 16px",cursor:"pointer",textAlign:"left",width:"100%",borderLeft:`4px solid ${pc}`,transition:"transform .1s"}} onMouseDown={e=>e.currentTarget.style.transform="scale(.98)"} onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
            <div style={{fontSize:14,fontWeight:700,color:C.text,flex:1,paddingRight:8}}>{i.title}</div>
            <Badge label={i.status?.replace("_"," ")} col={sc}/>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:i.description?8:0}}>
            <Badge label={i.type} col={C.blue}/>
            <Badge label={i.priority} col={pc}/>
          </div>
          {proj&&<div style={{fontSize:11,color:C.muted,marginTop:4}}>📁 {proj.title}</div>}
          <div style={{fontSize:11,color:C.muted,marginTop:4}}>{ago(i.created_at)}</div>
        </button>;
      })}
    </div>
    <div style={{height:16}}/>
  </div>;
}

/* ════════════════════════════════════════════════════════════════
   ISSUE DETAIL
════════════════════════════════════════════════════════════════ */
function IssueDetail({issue:init,projects,addToast,goBack}){
  const [issue,setIssue]=useState(init);
  const [loading,setLoading]=useState(false);
  const proj=projects.find(p=>String(p.id)===String(issue.project_id));

  const updateStatus=async status=>{
    setLoading(true);
    try{
      await axios.patch(`${API}/api/issues/${issue.id}/status`,{status},{headers:HJ()});
      setIssue(prev=>({...prev,status}));
      addToast("Status updated","success");
    }catch{addToast("Failed","error");}finally{setLoading(false);}
  };

  const pc=pCol(issue.priority); const sc=issue.status==="open"?C.red:issue.status==="in_progress"?C.orange:C.green;
  return <div style={{flex:1,overflowY:"auto",paddingBottom:80}}>
    <Header title={issue.title} onBack={goBack} subtitle={proj?.title||""}/>
    <div style={{padding:"16px",display:"flex",flexDirection:"column",gap:14}}>
      <div style={{background:C.card,borderRadius:14,padding:"16px",border:`1px solid ${pc}44`,borderLeft:`4px solid ${pc}`}}>
        <div style={{display:"flex",gap:8,marginBottom:issue.description?12:0}}>
          <Badge label={issue.type} col={C.blue}/>
          <Badge label={issue.priority} col={pc}/>
          <Badge label={issue.status?.replace("_"," ")} col={sc}/>
        </div>
        {issue.description&&<div style={{fontSize:13,color:C.text,lineHeight:1.6,marginTop:12}}>{issue.description}</div>}
      </div>
      <div style={{background:C.card,borderRadius:14,padding:"16px",border:`1px solid ${C.border}`}}>
        <Row label="Project" val={proj?.title||"Unknown"} icon={<Ic.Folder/>}/>
        <Row label="Type" val={issue.type||"—"} icon={<Ic.Flag/>}/>
        <Row label="Priority" val={issue.priority||"—"} icon={<Ic.Star/>} valCol={pc}/>
        <Row label="Reported" val={ago(issue.created_at)} icon={<Ic.Clock/>} last/>
      </div>
      {issue.status!=="resolved"&&<div style={{display:"flex",gap:10}}>
        {issue.status==="open"&&<button onClick={()=>updateStatus("in_progress")} disabled={loading} style={{flex:1,padding:"14px",background:`${C.orange}22`,border:`1px solid ${C.orange}44`,borderRadius:12,color:C.orange,fontSize:14,fontWeight:700,cursor:"pointer"}}>▶ Start</button>}
        <button onClick={()=>updateStatus("resolved")} disabled={loading} style={{flex:1,padding:"14px",background:`${C.green}22`,border:`1px solid ${C.green}44`,borderRadius:12,color:C.green,fontSize:14,fontWeight:700,cursor:"pointer"}}>✓ Resolve</button>
      </div>}
      {issue.status==="resolved"&&<button onClick={()=>updateStatus("open")} disabled={loading} style={{padding:"14px",background:`${C.red}22`,border:`1px solid ${C.red}44`,borderRadius:12,color:C.red,fontSize:14,fontWeight:700,cursor:"pointer"}}>↩ Reopen</button>}
    </div>
  </div>;
}

/* ════════════════════════════════════════════════════════════════
   TASKS SCREEN (full list)
════════════════════════════════════════════════════════════════ */
function TasksScreen({user,tasks,projects,navigate,addToast}){
  const [filter,setFilter]=useState("pending");
  const allTasks=Object.values(tasks).flat();
  const myTasks=allTasks.filter(t=>String(t.assigned_to)===String(user.id)||String(t.created_by)===String(user.id));
  const shown=filter==="all"?myTasks:filter==="done"?myTasks.filter(t=>t.completed):myTasks.filter(t=>!t.completed);
  const getProj=id=>projects.find(p=>String(p.id)===String(id))?.title||"";

  return <div style={{flex:1,overflowY:"auto",paddingBottom:80}}>
    <div style={{padding:"52px 16px 0",background:C.card,borderBottom:`1px solid ${C.border}`}}>
      <div style={{fontSize:20,fontWeight:800,color:C.text,marginBottom:4}}>My Tasks</div>
      <div style={{fontSize:12,color:C.muted,marginBottom:14}}>{myTasks.filter(t=>!t.completed).length} pending • {myTasks.filter(t=>t.completed).length} done</div>
      <div style={{display:"flex",gap:8,paddingBottom:14}}>
        {[["pending","Pending"],["done","Done"],["all","All"]].map(([val,lbl])=>(
          <button key={val} onClick={()=>setFilter(val)} style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:filter===val?C.accent:C.card,color:filter===val?"#0f172a":C.muted,fontWeight:700,fontSize:13,cursor:"pointer"}}>{lbl}</button>
        ))}
      </div>
    </div>
    <div style={{padding:"14px 16px",display:"flex",flexDirection:"column",gap:10}}>
      {shown.length===0?<div style={{background:C.card,borderRadius:14,padding:"40px",textAlign:"center",border:`1px solid ${C.border}`}}><div style={{fontSize:32,marginBottom:8}}>🎉</div><div style={{color:C.muted}}>No {filter==="done"?"completed":"pending"} tasks</div></div>
      :shown.map(t=>{
        const od=!t.completed&&t.due_date&&new Date(t.due_date)<new Date();
        return <button key={t.id} onClick={()=>navigate("task-detail",t)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",width:"100%",textAlign:"left",borderLeft:`4px solid ${t.completed?C.green:od?C.red:C.accent}`}}>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:700,color:t.completed?C.muted:C.text,textDecoration:t.completed?"line-through":"none"}}>{t.title}</div>
            <div style={{fontSize:11,color:C.muted,marginTop:3}}>{getProj(t.project_id)}</div>
            {t.due_date&&<div style={{fontSize:11,color:od?C.red:C.muted,marginTop:2}}>{dFmt(t.due_date)}{od?" • OVERDUE":""}</div>}
          </div>
          <Ic.ChevR/>
        </button>;
      })}
    </div>
  </div>;
}

/* ════════════════════════════════════════════════════════════════
   FORM SCREENS (Upload / Progress / Expense / Issue)
════════════════════════════════════════════════════════════════ */
function UploadScreen({user,projects,addToast,goBack,defaultProjectId}){
  const [project,setProject]=useState(defaultProjectId||"");
  const [category,setCategory]=useState("General");
  const [notes,setNotes]=useState("");
  const [photoUrl,setPhotoUrl]=useState("");
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState(null);
  const fileRef=useRef();
  const cats=["General","Concrete","Brickwork","Steel","Plumbing","Electrical","Roofing","Finishing","Foundation","Waterproofing"];

  const handleFile=async e=>{const file=e.target.files[0];if(!file)return;setLoading(true);try{const fd=new FormData();fd.append("file",file);const r=await axios.post(`${API}/api/upload`,fd,{headers:{...H(),"Content-Type":"multipart/form-data"}});setPhotoUrl(r.data.url||r.data.fileUrl||"");addToast("Photo uploaded!","success");}catch{addToast("Upload failed","error");}finally{setLoading(false);};};

  const analyse=async()=>{
    if(!project){addToast("Select a project","error");return;}if(!photoUrl){addToast("Upload a photo or paste URL","error");return;}
    setLoading(true);try{const fd=new FormData();fd.append("project_id",project);fd.append("work_category",category);fd.append("description",notes);fd.append("photo_url",photoUrl);const r=await axios.post(`${API}/api/ai-analysis`,fd,{headers:{...H(),"Content-Type":"multipart/form-data"}});setResult(r.data);addToast("AI analysis complete!","success");}catch{addToast("Analysis failed","error");}finally{setLoading(false);};
  };

  return <div style={{flex:1,overflowY:"auto",paddingBottom:80}}>
    <Header title="Upload Site Photo" subtitle="AI-powered analysis" onBack={goBack}/>
    <div style={{padding:"16px",display:"flex",flexDirection:"column",gap:14}}>
      <div onClick={()=>fileRef.current?.click()} style={{background:C.card,border:`2px dashed ${photoUrl?C.green:C.border}`,borderRadius:16,padding:"28px 20px",textAlign:"center",cursor:"pointer"}}>
        {photoUrl?<><img src={photoUrl} alt="" style={{width:"100%",maxHeight:200,objectFit:"cover",borderRadius:10}} onError={e=>e.target.style.display="none"}/><div style={{color:C.green,fontSize:13,fontWeight:600,marginTop:10}}>✓ Photo ready</div></>
        :<><div style={{color:C.muted,marginBottom:8}}><Ic.Camera/></div><div style={{fontSize:14,fontWeight:600,color:C.text}}>Tap to select photo</div><div style={{fontSize:12,color:C.muted,marginTop:4}}>Supports camera capture</div></>}
      </div>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={handleFile}/>
      <div><label style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",display:"block",marginBottom:6}}>Photo URL (optional)</label><input value={photoUrl} onChange={e=>setPhotoUrl(e.target.value)} placeholder="https://..." style={inp()}/></div>
      <div><label style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",display:"block",marginBottom:6}}>Project *</label><select value={project} onChange={e=>setProject(e.target.value)} style={inp({WebkitAppearance:"none"})}><option value="">Select project...</option>{projects.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></div>
      <div><label style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",display:"block",marginBottom:8}}>Work Category</label><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{cats.map(c=><button key={c} onClick={()=>setCategory(c)} style={{padding:"7px 14px",borderRadius:20,border:`1.5px solid ${category===c?C.blue:C.border}`,background:category===c?`${C.blue}20`:"transparent",color:category===c?C.blue:C.muted,fontSize:12,fontWeight:600,cursor:"pointer"}}>{c}</button>)}</div></div>
      <div><label style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",display:"block",marginBottom:6}}>Notes</label><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} placeholder="Describe today's work..." style={inp({resize:"none"})}/></div>
      <button onClick={analyse} disabled={loading} style={{padding:"16px",background:C.accent,border:"none",borderRadius:14,color:"#0f172a",fontSize:15,fontWeight:800,cursor:"pointer",opacity:loading?.7:1}}>{loading?"Analysing…":"🧠 Upload & Analyse"}</button>
      {result&&<div style={{background:C.card,borderRadius:16,padding:"18px",border:`1px solid ${C.green}40`}}>
        <div style={{fontSize:14,fontWeight:800,color:C.text,marginBottom:14}}>AI Analysis Result</div>
        {[{label:"Stage Detected",val:result.stage_detected||"—"},{label:"Est. Completion",val:result.estimated_completion?result.estimated_completion+"%":"—"},{label:"Delay Risk",val:result.delay_risk||"—",col:result.delay_risk==="High"?C.red:result.delay_risk==="Medium"?C.orange:C.green}].map(r=>(
          <div key={r.label} style={{display:"flex",justifyContent:"space-between",paddingBottom:10,marginBottom:10,borderBottom:`1px solid ${C.border}`}}>
            <span style={{fontSize:12,color:C.muted}}>{r.label}</span>
            <span style={{fontSize:13,fontWeight:700,color:r.col||C.text}}>{r.val}</span>
          </div>
        ))}
        {result.safety_observations&&<div style={{background:`${C.red}18`,border:`1px solid ${C.red}40`,borderRadius:10,padding:"10px 12px"}}><div style={{fontSize:11,color:C.red,fontWeight:700,marginBottom:4}}>⚠ SAFETY</div><div style={{fontSize:12,color:C.text}}>{result.safety_observations}</div></div>}
      </div>}
    </div>
  </div>;
}

function ProgressScreen({user,projects,addToast,goBack,defaultProjectId}){
  const [project,setProject]=useState(defaultProjectId||"");
  const [workDone,setWorkDone]=useState("");
  const [pct,setPct]=useState(50);
  const [workers,setWorkers]=useState(1);
  const [issues,setIssues]=useState("");
  const [plan,setPlan]=useState("");
  const [loading,setLoading]=useState(false);

  const submit=async()=>{if(!project||!workDone.trim()){addToast("Project and work required","error");return;}setLoading(true);try{await axios.post(`${API}/api/daily-logs`,{project_id:project,logged_by:user.id,work_done:workDone,workers_present:workers,issues,next_day_plan:plan},{headers:HJ()});setWorkDone("");setIssues("");setPlan("");setPct(50);setWorkers(1);addToast("Progress submitted! ✅","success");}catch{addToast("Submit failed","error");}finally{setLoading(false);};};

  return <div style={{flex:1,overflowY:"auto",paddingBottom:80}}>
    <Header title="Log Progress" subtitle="Submit daily update" onBack={goBack}/>
    <div style={{padding:"16px",display:"flex",flexDirection:"column",gap:14}}>
      <div><label style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",display:"block",marginBottom:6}}>Project *</label><select value={project} onChange={e=>setProject(e.target.value)} style={inp({WebkitAppearance:"none"})}><option value="">Select...</option>{projects.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></div>
      <div><label style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",display:"block",marginBottom:6}}>Work Completed Today *</label><textarea value={workDone} onChange={e=>setWorkDone(e.target.value)} rows={4} placeholder="Describe what was completed..." style={inp({resize:"none"})}/></div>
      <div><label style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",display:"block",marginBottom:10}}>Progress: <span style={{color:C.accent,fontSize:14,fontWeight:800}}>{pct}%</span></label><input type="range" min={0} max={100} value={pct} onChange={e=>setPct(e.target.value)} style={{width:"100%",accentColor:C.accent}}/><div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.muted,marginTop:4}}><span>0%</span><span>50%</span><span>100%</span></div></div>
      <div><label style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",display:"block",marginBottom:6}}>Workers Present</label><input type="number" value={workers} onChange={e=>setWorkers(e.target.value)} min={1} style={inp()}/></div>
      <div><label style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",display:"block",marginBottom:6}}>Issues / Problems</label><textarea value={issues} onChange={e=>setIssues(e.target.value)} rows={3} placeholder="Any problems faced?" style={inp({resize:"none"})}/></div>
      <div><label style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",display:"block",marginBottom:6}}>Tomorrow's Plan</label><input value={plan} onChange={e=>setPlan(e.target.value)} placeholder="What's planned for tomorrow?" style={inp()}/></div>
      <button onClick={submit} disabled={loading} style={{padding:"16px",background:C.green,border:"none",borderRadius:14,color:"#fff",fontSize:15,fontWeight:800,cursor:"pointer",opacity:loading?.7:1}}>{loading?"Submitting…":"✓ Submit Progress"}</button>
    </div>
  </div>;
}

function ExpenseScreen({user,projects,addToast,goBack,defaultProjectId}){
  const [project,setProject]=useState(defaultProjectId||"");
  const [category,setCategory]=useState("Labour");
  const [amount,setAmount]=useState("");
  const [desc,setDesc]=useState("");
  const [loading,setLoading]=useState(false);
  const cats=["Labour","Material","Equipment","Transport","Subcontractor","Tools","Miscellaneous"];

  const submit=async()=>{if(!project||!amount){addToast("Project and amount required","error");return;}setLoading(true);try{await axios.post(`${API}/api/expenses`,{project_id:project,category,amount:Number(amount),description:desc,recorded_by:user.id},{headers:HJ()});setAmount("");setDesc("");addToast("Expense logged! 💰","success");}catch{addToast("Failed","error");}finally{setLoading(false);};};

  return <div style={{flex:1,overflowY:"auto",paddingBottom:80}}>
    <Header title="Log Expense" subtitle="Record site cost" onBack={goBack}/>
    <div style={{padding:"16px",display:"flex",flexDirection:"column",gap:14}}>
      <div><label style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",display:"block",marginBottom:6}}>Project *</label><select value={project} onChange={e=>setProject(e.target.value)} style={inp({WebkitAppearance:"none"})}><option value="">Select...</option>{projects.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></div>
      <div><label style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",display:"block",marginBottom:8}}>Category</label><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{cats.map(c=><button key={c} onClick={()=>setCategory(c)} style={{padding:"7px 14px",borderRadius:20,border:`1.5px solid ${category===c?C.purple:C.border}`,background:category===c?`${C.purple}22`:"transparent",color:category===c?C.purple:C.muted,fontSize:12,fontWeight:600,cursor:"pointer"}}>{c}</button>)}</div></div>
      <div><label style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",display:"block",marginBottom:6}}>Amount (₹) *</label><input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0" style={inp()}/></div>
      <div><label style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",display:"block",marginBottom:6}}>Description</label><textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={3} placeholder="What was this expense for?" style={inp({resize:"none"})}/></div>
      <button onClick={submit} disabled={loading} style={{padding:"16px",background:C.purple,border:"none",borderRadius:14,color:"#fff",fontSize:15,fontWeight:800,cursor:"pointer",opacity:loading?.7:1}}>{loading?"Saving…":"💰 Log Expense"}</button>
    </div>
  </div>;
}

function IssueFormScreen({user,projects,addToast,goBack,defaultProjectId,onSuccess}){
  const [project,setProject]=useState(defaultProjectId||"");
  const [type,setType]=useState("General");
  const [priority,setPriority]=useState("medium");
  const [title,setTitle]=useState("");
  const [desc,setDesc]=useState("");
  const [loading,setLoading]=useState(false);
  const types=["General","Delay","Safety","Material Shortage","Equipment Failure","Quality","Design","Weather","Labour","Other"];
  const pris=["critical","high","medium","low"];

  const submit=async()=>{if(!project||!title.trim()){addToast("Project and title required","error");return;}setLoading(true);try{await axios.post(`${API}/api/issues`,{project_id:project,type,priority,title,description:desc},{headers:HJ()});setTitle("");setDesc("");addToast("Issue reported! ⚠","success");if(onSuccess)onSuccess();}catch{addToast("Failed","error");}finally{setLoading(false);};};

  return <div style={{flex:1,overflowY:"auto",paddingBottom:80}}>
    <Header title="Report Issue" subtitle="Flag a site problem" onBack={goBack}/>
    <div style={{padding:"16px",display:"flex",flexDirection:"column",gap:14}}>
      <div><label style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",display:"block",marginBottom:6}}>Project *</label><select value={project} onChange={e=>setProject(e.target.value)} style={inp({WebkitAppearance:"none"})}><option value="">Select...</option>{projects.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></div>
      <div><label style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",display:"block",marginBottom:8}}>Issue Type</label><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{types.map(t=><button key={t} onClick={()=>setType(t)} style={{padding:"7px 14px",borderRadius:20,border:`1.5px solid ${type===t?C.red:C.border}`,background:type===t?`${C.red}18`:"transparent",color:type===t?C.red:C.muted,fontSize:12,fontWeight:600,cursor:"pointer"}}>{t}</button>)}</div></div>
      <div><label style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",display:"block",marginBottom:8}}>Priority</label><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>{pris.map(p=><button key={p} onClick={()=>setPriority(p)} style={{padding:"10px 0",borderRadius:10,border:`1.5px solid ${priority===p?pCol(p):C.border}`,background:priority===p?pCol(p)+"22":"transparent",color:priority===p?pCol(p):C.muted,fontSize:12,fontWeight:700,textTransform:"capitalize",cursor:"pointer"}}>{p}</button>)}</div></div>
      <div><label style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",display:"block",marginBottom:6}}>Title *</label><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Brief issue title..." style={inp()}/></div>
      <div><label style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",display:"block",marginBottom:6}}>Description</label><textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={4} placeholder="Describe the issue in detail..." style={inp({resize:"none"})}/></div>
      <button onClick={submit} disabled={loading} style={{padding:"16px",background:C.red,border:"none",borderRadius:14,color:"#fff",fontSize:15,fontWeight:800,cursor:"pointer",opacity:loading?.7:1}}>{loading?"Reporting…":"⚠ Submit Report"}</button>
    </div>
  </div>;
}

/* ════════════════════════════════════════════════════════════════
   PROFILE
════════════════════════════════════════════════════════════════ */
function ProfileScreen({user,onLogout}){
  const [section,setSection]=useState("profile");
  const rc={boss:C.accent,manager:C.blue,engineer:C.purple,worker:C.green}[user.role]||C.muted;

  return <div style={{flex:1,overflowY:"auto",paddingBottom:80}}>
    <div style={{background:"linear-gradient(135deg,#1e3a5f,#0f172a)",padding:"52px 24px 0"}}>
      <div style={{textAlign:"center",paddingBottom:20}}>
        <div style={{width:76,height:76,borderRadius:"50%",background:`${rc}33`,border:`2px solid ${rc}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",fontSize:30,fontWeight:800,color:rc}}>{user.name?.[0]?.toUpperCase()||"?"}</div>
        <div style={{fontSize:20,fontWeight:800,color:C.text}}>{user.name}</div>
        <div style={{fontSize:13,color:C.muted,marginTop:4}}>{user.email}</div>
        <span style={{display:"inline-block",marginTop:10,padding:"4px 16px",borderRadius:20,background:`${rc}22`,color:rc,fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:".06em"}}>{user.role}</span>
      </div>
      <div style={{display:"flex",borderTop:`1px solid ${C.border}`}}>
        {[["profile","Profile"],["settings","Settings"]].map(([val,lbl])=>(
          <button key={val} onClick={()=>setSection(val)} style={{flex:1,padding:"14px",background:"none",border:"none",color:section===val?C.accent:C.muted,fontWeight:section===val?700:500,fontSize:14,cursor:"pointer",borderBottom:`2px solid ${section===val?C.accent:"transparent"}`}}>{lbl}</button>
        ))}
      </div>
    </div>
    <div style={{padding:"20px 16px"}}>
      {section==="profile"?<div style={{display:"flex",flexDirection:"column",gap:10}}>
        {[{label:"Full Name",val:user.name},{label:"Email",val:user.email},{label:"Role",val:user.role},{label:"User ID",val:`#${user.id}`},{label:"App Version",val:"BuildCore Mobile v2.0"}].map(r=>(
          <div key={r.label} style={{background:C.card,borderRadius:14,padding:"16px",border:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:13,color:C.muted}}>{r.label}</span>
            <span style={{fontSize:13,fontWeight:600,color:C.text,textTransform:"capitalize",maxWidth:"55%",textAlign:"right"}}>{r.val}</span>
          </div>
        ))}
        <button onClick={onLogout} style={{marginTop:8,padding:"16px",background:`${C.red}18`,border:`1.5px solid ${C.red}44`,borderRadius:14,color:C.red,fontSize:15,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}><Ic.Logout/>Sign Out</button>
      </div>
      :<div style={{display:"flex",flexDirection:"column",gap:10}}>
        <div style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em",marginBottom:4}}>App Settings</div>
        {[{label:"Theme",val:"Dark"},  {label:"Language",val:"English"},{label:"Currency",val:"Indian Rupee (₹)"},{label:"Date Format",val:"DD/MM/YYYY"},{label:"Notifications",val:"Enabled"}].map(r=>(
          <div key={r.label} style={{background:C.card,borderRadius:14,padding:"16px",border:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:13,color:C.muted}}>{r.label}</span>
            <span style={{fontSize:13,fontWeight:600,color:C.text}}>{r.val}</span>
          </div>
        ))}
        <div style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em",marginTop:8,marginBottom:4}}>System Info</div>
        {[{label:"Backend",val:"localhost:5000"},{label:"Frontend",val:"localhost:5174"},{label:"Database",val:"PostgreSQL"},{label:"Auth",val:"JWT (7 days)"},{label:"Built with",val:"React + Vite"}].map(r=>(
          <div key={r.label} style={{background:C.card,borderRadius:14,padding:"14px 16px",border:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:13,color:C.muted}}>{r.label}</span>
            <span style={{fontSize:12,fontWeight:600,color:C.text,fontFamily:"monospace"}}>{r.val}</span>
          </div>
        ))}
      </div>}
    </div>
  </div>;
}

/* ════════════════════════════════════════════════════════════════
   BOTTOM NAV
════════════════════════════════════════════════════════════════ */
function BottomNav({active,setActive,taskBadge,issueBadge}){
  const tabs=[
    {id:"home",   label:"Home",    Icon:Ic.Home},
    {id:"projects",label:"Projects",Icon:Ic.Folder},
    {id:"tasks",  label:"Tasks",   Icon:Ic.Task,  badge:taskBadge},
    {id:"issues", label:"Issues",  Icon:Ic.Alert, badge:issueBadge},
    {id:"profile",label:"Profile", Icon:Ic.User},
  ];
  return <div style={{position:"fixed",bottom:0,left:0,right:0,background:C.card,borderTop:`1px solid ${C.border}`,display:"flex",paddingBottom:"env(safe-area-inset-bottom)",zIndex:100}}>
    {tabs.map(tab=>{
      const isA=active===tab.id;
      return <button key={tab.id} onClick={()=>setActive(tab.id)} style={{flex:1,padding:"10px 0 8px",background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,position:"relative",transition:"opacity .1s"}} onMouseDown={e=>e.currentTarget.style.opacity=".6"} onMouseUp={e=>e.currentTarget.style.opacity="1"}>
        {tab.badge>0&&<span style={{position:"absolute",top:6,right:"calc(50% - 14px)",background:C.red,color:"#fff",fontSize:9,fontWeight:800,padding:"1px 5px",borderRadius:20,minWidth:16,textAlign:"center"}}>{tab.badge}</span>}
        <span style={{color:isA?C.accent:C.muted}}><tab.Icon/></span>
        <span style={{fontSize:10,fontWeight:isA?700:500,color:isA?C.accent:C.muted}}>{tab.label}</span>
      </button>;
    })}
  </div>;
}

/* ════════════════════════════════════════════════════════════════
   ROOT APP
════════════════════════════════════════════════════════════════ */
export default function App(){
  const [user,setUser]       = useState(null);
  const [tab,setTab]         = useState("home");
  const [stack,setStack]     = useState([]); // navigation stack: [{screen, data}]
  const [projects,setProjects]= useState([]);
  const [tasks,setTasks]     = useState({});
  const [issues,setIssues]   = useState([]);
  const [toasts,setToasts]   = useState([]);
  const [booting,setBooting] = useState(true);

  const addToast=useCallback((msg,type="info")=>{
    const id=Date.now();
    setToasts(p=>[...p,{id,msg,type}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3000);
  },[]);

  const loadData=useCallback(async()=>{
    if(!tok()) return;
    try{
      const [pr]=await Promise.all([axios.get(`${API}/api/projects`,{headers:H()})]);
      const projs=pr.data||[];
      setProjects(projs);
      projs.forEach(p=>{
        axios.get(`${API}/api/tasks/${p.id}`,{headers:H()}).then(r=>setTasks(prev=>({...prev,[p.id]:r.data||[]}))).catch(()=>{});
      });
      axios.get(`${API}/api/issues`,{headers:H()}).then(r=>setIssues(r.data||[])).catch(()=>{});
    }catch(e){console.error(e);}
  },[]);

  useEffect(()=>{
    const token=localStorage.getItem("token");
    if(!token){setBooting(false);return;}
    axios.get(`${API}/api/auth/me`,{headers:H()}).then(r=>{setUser(r.data);}).catch(()=>localStorage.removeItem("token")).finally(()=>setBooting(false));
  },[]);

  useEffect(()=>{if(user)loadData();},[user,loadData]);

  const push=(screen,data)=>setStack(s=>[...s,{screen,data}]);
  const pop=()=>setStack(s=>s.slice(0,-1));

  const navigate=(screen,data)=>{
    if(screen==="tasks")  {setTab("tasks");setStack([]);return;}
    if(screen==="issues") {setTab("issues");setStack([]);return;}
    if(screen==="projects"){setTab("projects");setStack([]);return;}
    push(screen,data);
  };

  const setActiveTab=t=>{setTab(t);setStack([]);};

  const allTasks=Object.values(tasks).flat();
  const taskBadge=allTasks.filter(t=>!t.completed&&(String(t.assigned_to)===String(user?.id)||String(t.created_by)===String(user?.id))).length;
  const issueBadge=issues.filter(i=>i.status==="open").length;

  if(booting) return <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",background:C.bg}}><div style={{textAlign:"center"}}><div style={{fontSize:34,fontWeight:900,color:C.text,marginBottom:8}}>Build<span style={{color:C.accent}}>Core</span></div><div style={{color:C.muted,fontSize:13}}>Loading…</div></div></div>;
  if(!user)   return <LoginScreen onLogin={u=>{setUser(u);}}/>;

  /* Resolve top of navigation stack */
  if(stack.length>0){
    const top=stack[stack.length-1];
    const goBack=pop;
    const s=top.screen; const d=top.data;

    if(s==="project-detail") return <><Toast toasts={toasts}/><ProjectDetail project={d} tasks={tasks} expenses={{}} issuesList={issues} navigate={navigate} goBack={goBack} addToast={addToast} refreshAll={loadData}/></>;
    if(s==="task-detail")    return <><Toast toasts={toasts}/><TaskDetail task={d} projects={projects} addToast={addToast} goBack={goBack}/></>;
    if(s==="issue-detail")   return <><Toast toasts={toasts}/><IssueDetail issue={d} projects={projects} addToast={addToast} goBack={goBack}/></>;
    if(s==="upload")         return <><Toast toasts={toasts}/><UploadScreen user={user} projects={projects} addToast={addToast} goBack={goBack} defaultProjectId={typeof d==="string"||typeof d==="number"?String(d):""}/></>;
    if(s==="progress")       return <><Toast toasts={toasts}/><ProgressScreen user={user} projects={projects} addToast={addToast} goBack={goBack} defaultProjectId={typeof d==="string"||typeof d==="number"?String(d):""}/></>;
    if(s==="expense")        return <><Toast toasts={toasts}/><ExpenseScreen user={user} projects={projects} addToast={addToast} goBack={goBack} defaultProjectId={typeof d==="string"||typeof d==="number"?String(d):""}/></>;
    if(s==="issue-form")     return <><Toast toasts={toasts}/><IssueFormScreen user={user} projects={projects} addToast={addToast} goBack={goBack} defaultProjectId={typeof d==="string"||typeof d==="number"?String(d):""} onSuccess={()=>{loadData();goBack();}}/></>;
  }

  return <div style={{display:"flex",flexDirection:"column",height:"100dvh",background:C.bg}}>
    <Toast toasts={toasts}/>
    {tab==="home"    &&<HomeScreen     user={user} projects={projects} tasks={tasks} issues={issues} navigate={navigate} setTab={setActiveTab} addToast={addToast} refreshAll={loadData}/>}
    {tab==="projects"&&<ProjectsScreen projects={projects} tasks={tasks} navigate={(s,d)=>{if(s==="project-detail")push(s,d);}}/>}
    {tab==="tasks"   &&<TasksScreen    user={user} tasks={tasks} projects={projects} navigate={(s,d)=>push(s,d)} addToast={addToast}/>}
    {tab==="issues"  &&<IssuesListScreen issues={issues} projects={projects} navigate={(s,d)=>push(s,d)} addToast={addToast} refresh={loadData}/>}
    {tab==="profile" &&<ProfileScreen  user={user} onLogout={()=>{localStorage.removeItem("token");setUser(null);setProjects([]);setTasks({});setIssues([]);}}/>}
    <BottomNav active={tab} setActive={setActiveTab} taskBadge={taskBadge} issueBadge={issueBadge}/>
  </div>;
}
