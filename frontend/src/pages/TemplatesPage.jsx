import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { FiX, FiArrowRight, FiCheck } from "react-icons/fi";

const CATS = ["All", "Agile", "Ideation", "UX Design", "Productivity"];

// Visual preview renderer — mini SVG thumbnail for each template
const PREVIEWS = {
  sprint: ({ w, h }) => (
    <svg width={w} height={h} viewBox="0 0 400 220" style={{ borderRadius: 8 }}>
      <rect width="400" height="220" fill="#F8FAFC"/>
      {/* Columns */}
      {[["#6C47FF","Backlog"],["#3B82F6","In Progress"],["#F59E0B","Review"],["#10B981","Done"]].map(([c,l],i)=>(
        <g key={i}>
          <rect x={5+i*99} y={5}  width={94} height={24} rx={4} fill={c}/>
          <text x={52+i*99} y={21} textAnchor="middle" fill="#fff" fontSize={9} fontWeight="bold">{l}</text>
          <rect x={5+i*99} y={33} width={94} height={180} rx={4} fill={c+"18"}/>
          {[0,1].map(j=>(
            <rect key={j} x={10+i*99} y={40+j*50} width={84} height={38} rx={4} fill="#fff" stroke={c+"44"} strokeWidth={1}/>
          ))}
        </g>
      ))}
    </svg>
  ),
  mindmap: ({ w, h }) => (
    <svg width={w} height={h} viewBox="0 0 400 220" style={{ borderRadius: 8 }}>
      <rect width="400" height="220" fill="#FAFAFA"/>
      {/* Center */}
      <circle cx={200} cy={110} r={38} fill="#6C47FF"/>
      <text x={200} y={107} textAnchor="middle" fill="#fff" fontSize={9} fontWeight="bold">💡 Central</text>
      <text x={200} y={120} textAnchor="middle" fill="#fff" fontSize={9}>Idea</text>
      {/* Branches */}
      {[
        [60,  50,  "#3B82F6","Branch 1"],
        [310, 50,  "#10B981","Branch 2"],
        [40,  110, "#F59E0B","Branch 3"],
        [330, 110, "#EF4444","Branch 4"],
        [60,  170, "#EC4899","Branch 5"],
        [310, 170, "#8B5CF6","Branch 6"],
      ].map(([bx,by,c,l],i)=>(
        <g key={i}>
          <line x1={200} y1={110} x2={bx+35} y2={by+12} stroke={c} strokeWidth={1.5} opacity={0.5}/>
          <rect x={bx} y={by} width={70} height={24} rx={12} fill={c}/>
          <text x={bx+35} y={by+15} textAnchor="middle" fill="#fff" fontSize={8}>{l}</text>
        </g>
      ))}
    </svg>
  ),
  retro: ({ w, h }) => (
    <svg width={w} height={h} viewBox="0 0 400 220" style={{ borderRadius: 8 }}>
      <rect width="400" height="220" fill="#FAFAFA"/>
      {[
        [0,  0,  "#10B981","😊 Went Well"],
        [200,0,  "#EF4444","😤 Improve"],
        [0,  110,"#3B82F6","✅ Actions"],
        [200,110,"#F59E0B","🌟 Kudos"],
      ].map(([qx,qy,c,l],i)=>(
        <g key={i}>
          <rect x={qx+3} y={qy+3} width={194} height={24} rx={0} fill={c}/>
          <text x={qx+97} y={qy+18} textAnchor="middle" fill="#fff" fontSize={8} fontWeight="bold">{l}</text>
          <rect x={qx+3} y={qy+29} width={194} height={78} fill={c+"15"}/>
          {[0,1].map(k=>(
            <rect key={k} x={qx+8} y={qy+34+k*36} width={80} height={28} rx={4} fill="#fff" stroke={c+"44"} strokeWidth={1}/>
          ))}
        </g>
      ))}
    </svg>
  ),
  userflow: ({ w, h }) => (
    <svg width={w} height={h} viewBox="0 0 400 220" style={{ borderRadius: 8 }}>
      <rect width="400" height="220" fill="#F8FAFC"/>
      {/* User */}
      <circle cx={30} cy={80} r={18} fill="#6C47FF"/>
      <text x={30} y={84} textAnchor="middle" fill="#fff" fontSize={10}>👤</text>
      {/* Steps */}
      {["Discover","Evaluate","Purchase","Use","Refer"].map((s,i)=>(
        <g key={i}>
          <rect x={60+i*68} y={8}  width={60} height={20} rx={3} fill="#0F172A"/>
          <text x={90+i*68} y={21} textAnchor="middle" fill="#fff" fontSize={7} fontWeight="bold">{s}</text>
          <rect x={60+i*68} y={32} width={60} height={16} rx={3} fill="#EDE9FE" stroke="#C4B5FD" strokeWidth={1}/>
          {[0,1,2].map(j=>(
            <rect key={j} x={62+i*68} y={54+j*36} width={56} height={28} rx={4} fill="#F3E8FF" stroke="#DDD6FE" strokeWidth={1}/>
          ))}
          {i<4&&<path d={`M${120+i*68} 18 L${125+i*68} 18`} stroke="#94A3B8" strokeWidth={1} markerEnd="url(#arr)"/>}
        </g>
      ))}
    </svg>
  ),
  brainstorm: ({ w, h }) => (
    <svg width={w} height={h} viewBox="0 0 400 220" style={{ borderRadius: 8 }}>
      <rect width="400" height="220" fill="#FAFAFA"/>
      {/* Center question */}
      <rect x={120} y={80} width={160} height={50} rx={8} fill="#0F172A"/>
      <text x={200} y={100} textAnchor="middle" fill="#fff" fontSize={9} fontWeight="bold">❓ The Problem</text>
      <text x={200} y={116} textAnchor="middle" fill="#aaa" fontSize={8}>to solve</text>
      {/* Notes */}
      {[
        [20, 20,"#EDE9FE","Idea A"],[160,15,"#EDE9FE","Idea B"],
        [300,20,"#D1FAE5","Idea C"],[20, 140,"#FEE2E2","Risk"],
        [300,140,"#FEF3C7","Oppty"],[160,165,"#DBEAFE","Action"],
      ].map(([nx,ny,c,l],i)=>(
        <g key={i}>
          <line x1={200} y1={105} x2={nx+35} y2={ny+20} stroke="#E2E8F0" strokeWidth={1}/>
          <rect x={nx} y={ny} width={70} height={40} rx={5} fill={c} stroke="#E2E8F0" strokeWidth={1}/>
          <text x={nx+35} y={ny+22} textAnchor="middle" fill="#333" fontSize={8} fontWeight="bold">{l}</text>
        </g>
      ))}
    </svg>
  ),
  planner: ({ w, h }) => (
    <svg width={w} height={h} viewBox="0 0 400 220" style={{ borderRadius: 8 }}>
      <rect width="400" height="220" fill="#F8FAFC"/>
      {["MON","TUE","WED","THU","FRI","SAT","SUN"].map((d,i)=>{
        const x=5+i*56; const isWknd=i>=5;
        return (
          <g key={i}>
            <rect x={x} y={5} width={53} height={20} rx={3} fill={isWknd?"#EC4899":"#6C47FF"}/>
            <text x={x+26} y={18} textAnchor="middle" fill="#fff" fontSize={8} fontWeight="bold">{d}</text>
            {["#EDE9FE","#DBEAFE","#D1FAE5"].map((c,j)=>(
              <rect key={j} x={x+2} y={32+j*60} width={49} height={52} rx={4} fill={isWknd?c+"88":c} stroke="#E2E8F0" strokeWidth={1}/>
            ))}
          </g>
        );
      })}
    </svg>
  ),
};

const TEMPLATE_META = {
  sprint:     { color:"#6C47FF", tag:"Agile" },
  mindmap:    { color:"#3B82F6", tag:"Ideation" },
  retro:      { color:"#10B981", tag:"Agile" },
  userflow:   { color:"#EC4899", tag:"UX Design" },
  brainstorm: { color:"#F59E0B", tag:"Ideation" },
  planner:    { color:"#8B5CF6", tag:"Productivity" },
};

export default function TemplatesPage() {
  const navigate  = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [cat,       setCat]       = useState("All");
  const [creating,  setCreating]  = useState(null);
  const [search,    setSearch]    = useState("");
  const [preview,   setPreview]   = useState(null); // full preview modal
  const [showModal, setShowModal] = useState(false);
  const [selTmpl,   setSelTmpl]   = useState(null);
  const [title,     setTitle]     = useState("");

  useEffect(() => {
    setLoading(true);
    api.getTemplates().then(t => {
      setTemplates(Array.isArray(t) ? t : []);
      setLoading(false);
    });
  }, []);

  const filtered = templates.filter(t =>
    (cat === "All" || t.category === cat) &&
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = tmpl => {
    setSelTmpl(tmpl);
    setTitle(tmpl.title + " — " + new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"}));
    setShowModal(true);
  };

  const confirmCreate = async () => {
    if (!title.trim()) return;
    setCreating(selTmpl.id);
    const b = await api.createBoard({ title: title.trim(), template_id: selTmpl.id });
    setCreating(null);
    setShowModal(false);
    if (b?.id) navigate(`/board/${b.id}`);
  };

  const meta = t => TEMPLATE_META[t.thumbnail] || { color:"#6C47FF", tag:t.category };
  const PreviewComp = t => PREVIEWS[t?.thumbnail];

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.hero}>
        <div>
          <h2 style={S.heroTitle}>Start with a Template</h2>
          <p style={S.heroSub}>Pre-built boards with structure already in place. Just fill in your content.</p>
        </div>
        <div style={S.heroRight}>
          <div style={S.searchBox}>
            <span style={{color:"#94A3B8"}}>🔍</span>
            <input style={S.searchIn} placeholder="Search templates…"
              value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
        </div>
      </div>

      {/* Category filter */}
      <div style={S.catRow}>
        {CATS.map(c => (
          <button key={c} onClick={()=>setCat(c)} style={{
            ...S.catBtn,
            background: cat===c ? "#6C47FF" : "#fff",
            color:      cat===c ? "#fff"    : "#64748B",
            border:     `1.5px solid ${cat===c ? "#6C47FF" : "#E2E8F0"}`,
          }}>{c}</button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={S.grid}>
          {[1,2,3,4,5,6].map(i=>(
            <div key={i} className="skeleton" style={{height:300,borderRadius:16}}/>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{textAlign:"center",padding:"60px 0",color:"#94A3B8"}}>
          <div style={{fontSize:48,marginBottom:12}}>📋</div>
          <p>No templates found. Try a different category.</p>
        </div>
      ) : (
        <div style={S.grid}>
          {filtered.map(t => {
            const m = meta(t);
            const Preview = PREVIEWS[t.thumbnail];
            return (
              <div key={t.id} style={S.card}>
                {/* Visual preview */}
                <div style={{...S.thumbWrap, borderBottom:`3px solid ${m.color}`}}
                  onClick={()=>setPreview(t)}>
                  {Preview
                    ? <Preview w={340} h={180}/>
                    : <div style={{...S.thumbFallback,background:`linear-gradient(135deg,${m.color}22,${m.color}44)`}}>
                        <span style={{fontSize:40}}>📋</span>
                      </div>
                  }
                  <div style={S.thumbHover}>
                    <button style={S.previewBtn} onClick={e=>{e.stopPropagation();setPreview(t);}}>
                      👁 Preview
                    </button>
                  </div>
                </div>

                {/* Card body */}
                <div style={S.cardBody}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                    <span style={{...S.catPill,background:`${m.color}18`,color:m.color}}>{t.category}</span>
                  </div>
                  <div style={S.cardTitle}>{t.title}</div>
                  <div style={S.cardDesc}>{t.description}</div>

                  {/* What's included */}
                  <div style={S.includes}>
                    <div style={S.includeTitle}>Included in this template:</div>
                    {(t.canvas_data?.shapes?.length > 0) && (
                      <div style={S.includeItem}><FiCheck size={11} color="#10B981"/>{t.canvas_data.shapes.length} pre-built shapes</div>
                    )}
                    {(t.canvas_data?.notes?.length > 0) && (
                      <div style={S.includeItem}><FiCheck size={11} color="#10B981"/>{t.canvas_data.notes.length} example sticky notes</div>
                    )}
                    {(t.canvas_data?.texts?.length > 0) && (
                      <div style={S.includeItem}><FiCheck size={11} color="#10B981"/>Labels & instructions</div>
                    )}
                  </div>

                  <button style={{...S.useBtn, background:m.color}} onClick={()=>openCreate(t)}
                    disabled={creating===t.id}>
                    {creating===t.id ? "Creating…" : "Use Template"} <FiArrowRight size={14}/>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Full preview modal ── */}
      {preview && (
        <div style={S.overlay} onClick={()=>setPreview(null)}>
          <div style={S.previewModal} onClick={e=>e.stopPropagation()}>
            <div style={S.previewHead}>
              <div>
                <h2 style={{fontSize:22,fontWeight:800,margin:"0 0 4px",fontFamily:"'Syne',sans-serif"}}>{preview.title}</h2>
                <p style={{fontSize:13,color:"#64748B",margin:0}}>{preview.description}</p>
              </div>
              <button style={S.closeBtn} onClick={()=>setPreview(null)}><FiX size={20}/></button>
            </div>
            <div style={{padding:"16px 24px",background:"#F8FAFC",borderRadius:12,margin:"16px 24px"}}>
              {PREVIEWS[preview.thumbnail]
                ? React.createElement(PREVIEWS[preview.thumbnail],{w:"100%",h:300})
                : <div style={{height:300,display:"flex",alignItems:"center",justifyContent:"center",fontSize:60}}>📋</div>
              }
            </div>
            <div style={{padding:"0 24px 24px",display:"flex",gap:12}}>
              <button style={{...S.useBtn,background:"#6C47FF",flex:1,justifyContent:"center"}}
                onClick={()=>{setPreview(null);openCreate(preview);}}>
                Use This Template <FiArrowRight size={14}/>
              </button>
              <button style={S.cancelBtnSm} onClick={()=>setPreview(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create modal ── */}
      {showModal && selTmpl && (
        <div style={S.overlay}>
          <div style={S.createModal} className="animate-fade">
            <button style={{...S.closeBtn,position:"absolute",top:14,right:14}} onClick={()=>setShowModal(false)}>
              <FiX size={18}/>
            </button>
            <div style={{textAlign:"center",marginBottom:24}}>
              <div style={{fontSize:40,marginBottom:12}}>📋</div>
              <h2 style={{fontSize:20,fontWeight:800,margin:"0 0 6px",fontFamily:"'Syne',sans-serif"}}>
                {selTmpl.title}
              </h2>
              <p style={{fontSize:13,color:"#64748B",margin:0}}>Name your new board to get started</p>
            </div>
            <label style={S.label}>Board Title</label>
            <input autoFocus className="input" value={title}
              onChange={e=>setTitle(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&confirmCreate()}
              placeholder="e.g. Q3 Sprint Planning"
              style={{marginBottom:20}}/>
            <div style={{display:"flex",gap:10}}>
              <button className="btn btn-secondary btn-full" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary btn-full" onClick={confirmCreate}
                disabled={!title.trim()||creating===selTmpl?.id}>
                {creating===selTmpl?.id ? "Creating…" : "Create Board →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const S = {
  page:       { display:"flex",flexDirection:"column",gap:20 },
  hero:       { display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,flexWrap:"wrap" },
  heroTitle:  { fontSize:26,fontWeight:800,margin:"0 0 8px",fontFamily:"'Syne',sans-serif",color:"var(--text-primary)" },
  heroSub:    { fontSize:14,color:"var(--text-secondary)",margin:0 },
  heroRight:  { flexShrink:0 },
  searchBox:  { display:"flex",alignItems:"center",gap:8,padding:"9px 14px",background:"#fff",border:"1px solid #E2E8F0",borderRadius:11 },
  searchIn:   { border:"none",outline:"none",fontSize:13,color:"#0F172A",background:"transparent",width:220,fontFamily:"'Inter',sans-serif" },
  catRow:     { display:"flex",gap:8,flexWrap:"wrap" },
  catBtn:     { padding:"7px 18px",borderRadius:99,fontSize:13,fontWeight:600,cursor:"pointer",transition:"all 0.15s" },
  grid:       { display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:20 },
  card:       { background:"#fff",border:"1px solid #E2E8F0",borderRadius:16,overflow:"hidden",
                boxShadow:"0 2px 8px rgba(0,0,0,0.05)",transition:"all 0.2s",display:"flex",flexDirection:"column" },
  thumbWrap:  { height:180,position:"relative",overflow:"hidden",cursor:"pointer",background:"#F8FAFC",flexShrink:0 },
  thumbFallback:{ height:"100%",display:"flex",alignItems:"center",justifyContent:"center" },
  thumbHover: { position:"absolute",inset:0,background:"rgba(0,0,0,0)",display:"flex",
                alignItems:"center",justifyContent:"center",opacity:0,transition:"all 0.2s",
                ":hover":{opacity:1,background:"rgba(0,0,0,0.25)"} },
  previewBtn: { padding:"8px 18px",background:"rgba(255,255,255,0.9)",border:"1.5px solid #fff",
                borderRadius:99,fontSize:12,fontWeight:700,cursor:"pointer",color:"#0F172A" },
  cardBody:   { padding:"16px 18px 18px",display:"flex",flexDirection:"column",gap:8,flex:1 },
  catPill:    { fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:99 },
  cardTitle:  { fontSize:16,fontWeight:700,color:"var(--text-primary)",fontFamily:"'Syne',sans-serif" },
  cardDesc:   { fontSize:12,color:"var(--text-secondary)",lineHeight:1.5 },
  includes:   { background:"#F8FAFC",borderRadius:8,padding:"8px 10px",display:"flex",flexDirection:"column",gap:4 },
  includeTitle:{ fontSize:10,fontWeight:700,color:"#94A3B8",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:2 },
  includeItem:{ display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#475569" },
  useBtn:     { display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"10px 16px",
                border:"none",borderRadius:10,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",marginTop:"auto" },
  overlay:    { position:"fixed",inset:0,background:"rgba(15,23,42,0.65)",display:"flex",
                alignItems:"center",justifyContent:"center",zIndex:9999,backdropFilter:"blur(4px)" },
  previewModal:{ background:"#fff",borderRadius:20,width:"min(760px,95vw)",maxHeight:"90vh",
                 overflowY:"auto",boxShadow:"0 40px 100px rgba(0,0,0,0.25)" },
  previewHead: { display:"flex",alignItems:"flex-start",justifyContent:"space-between",
                 padding:"24px 24px 0",gap:16 },
  closeBtn:    { border:"none",background:"transparent",cursor:"pointer",color:"#94A3B8",
                 display:"flex",padding:4,borderRadius:8,flexShrink:0 },
  createModal: { background:"#fff",borderRadius:20,padding:"36px 32px",width:"min(420px,95vw)",
                 boxShadow:"0 32px 80px rgba(0,0,0,0.22)",position:"relative" },
  label:       { fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:8 },
  cancelBtnSm: { padding:"10px 20px",border:"1.5px solid #E2E8F0",borderRadius:10,
                 background:"#fff",cursor:"pointer",fontSize:13,fontWeight:600,color:"#475569" },
};
