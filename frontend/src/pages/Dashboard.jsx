import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import useAuthStore from "../stores/authStore";
import {
  FiPlus, FiClock, FiUsers, FiMoreHorizontal,
  FiTrash2, FiEdit2, FiShare2, FiStar, FiX
} from "react-icons/fi";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [boards,    setBoards]    = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [creating,  setCreating]  = useState(false);
  const [boardMenu, setBoardMenu] = useState(null);
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [newTitle,  setNewTitle]  = useState("");
  const [selTemplate, setSelTemplate] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [b, t] = await Promise.all([api.getBoards(), api.getTemplates()]);
    setBoards(Array.isArray(b) ? b : []);
    setTemplates(Array.isArray(t) ? t.slice(0, 6) : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Create board — always ask for title first ──
  const openCreateModal = (templateId = null) => {
    setSelTemplate(templateId);
    setNewTitle("");
    setShowTitleModal(true);
  };

  const confirmCreate = async () => {
    if (!newTitle.trim()) { alert("Please enter a title"); return; }
    setCreating(true);
    const b = await api.createBoard({ title: newTitle.trim(), template_id: selTemplate });
    setCreating(false);
    setShowTitleModal(false);
    if (b?.id) navigate(`/board/${b.id}`);
  };

  const deleteBoard = async (id) => {
    if (!window.confirm("Delete this board?")) return;
    await api.deleteBoard(id);
    setBoards(p => p.filter(b => b.id !== id));
    setBoardMenu(null);
  };

  const fmt = ts => {
    const diff = Date.now() - new Date(ts);
    if (diff < 60000)   return "Just now";
    if (diff < 3600000) return Math.floor(diff / 60000) + "m ago";
    if (diff < 86400000)return Math.floor(diff / 3600000) + "h ago";
    return new Date(ts).toLocaleDateString("en-US", { month:"short", day:"numeric" });
  };

  const TEMPLATE_ICONS = {
    "Agile":"🏃","Ideation":"💡","UX Design":"🎨",
    "Productivity":"📊","UX":"🖥️","default":"📋"
  };

  return (
    <div style={S.page}>

      {/* ── Quick Start ── */}
      <section>
        <h2 style={S.sectionTitle}>Quick Start</h2>
        <div style={S.quickGrid}>
          <QuickCard icon={<span style={{fontSize:28}}>➕</span>} title="Blank Board"
            subtitle="Start from scratch" accent="#6C47FF"
            onClick={() => openCreateModal(null)} disabled={creating}/>
          <QuickCard icon={<span style={{fontSize:28}}>📋</span>} title="Use Template"
            subtitle="Guided layouts" accent="#3B82F6"
            onClick={() => navigate("/templates")}/>
          <QuickCard icon={<span style={{fontSize:28}}>⬆️</span>} title="Upload File"
            subtitle="PDF or Image" accent="#10B981"
            onClick={() => openCreateModal(null)}/>
        </div>
      </section>

      {/* ── Active Now ── */}
      <section>
        <div style={S.sectionHeader}>
          <h2 style={S.sectionTitle}>Active Now</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate("/boards")}>View all →</button>
        </div>

        {loading ? (
          <div style={S.boardGrid}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{height:220,borderRadius:16}}/>)}
          </div>
        ) : boards.length === 0 ? (
          <EmptyBoards onCreate={() => openCreateModal(null)}/>
        ) : (
          <div style={S.boardGrid}>
            {boards.slice(0,3).map(b => (
              <BoardCard key={b.id} board={b}
                onOpen={() => navigate(`/board/${b.id}`)}
                menuOpen={boardMenu === b.id}
                onMenu={e => { e.stopPropagation(); setBoardMenu(boardMenu===b.id?null:b.id); }}
                onDelete={() => deleteBoard(b.id)}
                fmt={fmt}/>
            ))}
          </div>
        )}
      </section>

      {/* ── Recent Work ── */}
      {boards.length > 0 && (
        <section>
          <div style={S.sectionHeader}>
            <h2 style={S.sectionTitle}>Recent Work</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate("/boards")}>View all →</button>
          </div>
          <div style={S.recentList}>
            {boards.slice(0,6).map(b => (
              <div key={b.id} style={S.recentRow} onClick={() => navigate(`/board/${b.id}`)}>
                <div style={S.recentThumb}>📋</div>
                <div style={{flex:1}}>
                  <div style={S.recentTitle}>{b.title}</div>
                  <div style={S.recentMeta}><FiClock size={10}/> {fmt(b.updated_at)}</div>
                </div>
                <div style={{display:"flex",gap:4}} onClick={e=>e.stopPropagation()}>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => navigate(`/board/${b.id}`)}><FiEdit2 size={13}/></button>
                  <button className="btn btn-ghost btn-icon btn-sm" style={{color:"#EF4444"}} onClick={() => deleteBoard(b.id)}><FiTrash2 size={13}/></button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Templates ── */}
      <section>
        <div style={S.sectionHeader}>
          <h2 style={S.sectionTitle}>Templates</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate("/templates")}>View all →</button>
        </div>
        {templates.length === 0 ? (
          <div style={{color:"#94A3B8",fontSize:13}}>No templates yet</div>
        ) : (
          <div style={S.templateGrid}>
            {templates.map(t => (
              <div key={t.id} style={S.templateCard} onClick={() => openCreateModal(t.id)}>
                <div style={S.templateThumb}>
                  <span style={{fontSize:24}}>{TEMPLATE_ICONS[t.category] || TEMPLATE_ICONS.default}</span>
                </div>
                <div style={{flex:1,overflow:"hidden"}}>
                  <div style={S.templateTitle}>{t.title}</div>
                  <div style={S.templateCat}>{t.category}</div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={e=>{e.stopPropagation();openCreateModal(t.id);}}>Use</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Overlay to close board menu ── */}
      {boardMenu && <div style={{position:"fixed",inset:0,zIndex:99}} onClick={()=>setBoardMenu(null)}/>}
      <div style={{display:"none"}}/>{/* balance */}

      {/* ── Create / Title Modal ── */}
      {showTitleModal && (
        <div style={S.overlay}>
          <div style={S.modal} className="animate-fade">
            <button style={S.modalClose} onClick={() => setShowTitleModal(false)}><FiX size={18}/></button>
            <div style={{textAlign:"center",marginBottom:24}}>
              <div style={{fontSize:36,marginBottom:12}}>📋</div>
              <h2 style={S.modalTitle}>Name your board</h2>
              <p style={S.modalSub}>Give it a clear title so you can find it later</p>
            </div>
            <label style={S.label}>Board Title</label>
            <input
              autoFocus
              className="input"
              placeholder="e.g. Q3 Sprint Planning, Product Roadmap…"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === "Enter" && confirmCreate()}
              style={{marginBottom:20}}
            />
            <div style={{display:"flex",gap:10}}>
              <button className="btn btn-secondary btn-full" onClick={() => setShowTitleModal(false)}>Cancel</button>
              <button className="btn btn-primary btn-full" onClick={confirmCreate} disabled={creating}>
                {creating ? "Creating…" : "Create Board →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──
function QuickCard({ icon, title, subtitle, accent, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background:"var(--surface)",border:"1px solid var(--border)",borderRadius:16,
      padding:24,textAlign:"left",cursor:disabled?"wait":"pointer",opacity:disabled?0.7:1,
      transition:"all 0.2s",outline:"none",display:"flex",flexDirection:"column",gap:12
    }}>
      <div style={{width:52,height:52,borderRadius:14,background:`${accent}15`,
        color:accent,display:"flex",alignItems:"center",justifyContent:"center"}}>
        {icon}
      </div>
      <div>
        <div style={{fontSize:15,fontWeight:700,color:"var(--text-primary)",marginBottom:4}}>{title}</div>
        <div style={{fontSize:13,color:"var(--text-secondary)"}}>{subtitle}</div>
      </div>
    </button>
  );
}

function BoardCard({ board, onOpen, menuOpen, onMenu, onDelete, fmt }) {
  return (
    <div style={{
      background:"var(--surface)",border:"1px solid var(--border)",
      borderRadius:16,overflow:"hidden",cursor:"pointer",
      boxShadow:"0 1px 3px rgba(0,0,0,0.06)",transition:"all 0.2s",position:"relative"
    }} onClick={onOpen}>
      <div style={{height:160,background:"linear-gradient(135deg,#EEF2FF,#F0F4FF)",
        display:"flex",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontSize:13,color:"#94A3B8",fontWeight:500}}>Live Board Preview</span>
      </div>
      <div style={{padding:"12px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{flex:1,overflow:"hidden"}}>
          <div style={{fontSize:14,fontWeight:600,color:"var(--text-primary)",
            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{board.title}</div>
          <div style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"var(--text-muted)",marginTop:3}}>
            <FiClock size={10}/>{fmt(board.updated_at)}
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          {["S","J","A"].map((l,i)=>(
            <div key={i} style={{width:22,height:22,borderRadius:"50%",fontSize:9,fontWeight:700,color:"#fff",
              display:"flex",alignItems:"center",justifyContent:"center",marginLeft:i?-6:0,
              background:["#EF4444","#3B82F6","#10B981"][i],border:"2px solid var(--surface)"}}>{l}</div>
          ))}
          <button onClick={onMenu} style={{
            width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",
            border:"none",background:"transparent",cursor:"pointer",borderRadius:6,marginLeft:4
          }}><FiMoreHorizontal size={15}/></button>
        </div>
      </div>
      {menuOpen && (
        <div style={{position:"absolute",right:12,bottom:52,background:"#fff",
          border:"1px solid #E2E8F0",borderRadius:12,padding:6,minWidth:155,
          boxShadow:"0 12px 32px rgba(0,0,0,0.12)",zIndex:200}}
          onClick={e=>e.stopPropagation()}>
          <DropItem icon={<FiEdit2 size={13}/>} label="Open" onClick={onOpen}/>
          <DropItem icon={<FiShare2 size={13}/>} label="Share"/>
          <DropItem icon={<FiStar size={13}/>} label="Favourite"/>
          <div style={{height:1,background:"#F1F4F9",margin:"4px 0"}}/>
          <DropItem icon={<FiTrash2 size={13}/>} label="Delete" danger onClick={onDelete}/>
        </div>
      )}
    </div>
  );
}

function DropItem({ icon, label, danger, onClick }) {
  return (
    <button onClick={onClick} style={{
      display:"flex",alignItems:"center",gap:8,width:"100%",
      padding:"8px 10px",borderRadius:8,border:"none",background:"transparent",
      fontSize:13,cursor:"pointer",color:danger?"#EF4444":"var(--text-primary)",textAlign:"left"
    }}>{icon}{label}</button>
  );
}

function EmptyBoards({ onCreate }) {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"48px 0"}}>
      <span style={{fontSize:52}}>📋</span>
      <p style={{color:"#94A3B8",fontSize:14,marginTop:14}}>No boards yet — create your first one!</p>
      <button className="btn btn-primary" style={{marginTop:16}} onClick={onCreate}>
        <FiPlus size={16}/> Create Board
      </button>
    </div>
  );
}

const S = {
  page:{display:"flex",flexDirection:"column",gap:36},
  sectionHeader:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16},
  sectionTitle:{fontSize:18,fontWeight:700,color:"var(--text-primary)",fontFamily:"'Syne',sans-serif",margin:0},
  quickGrid:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16},
  boardGrid:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20},
  recentList:{display:"flex",flexDirection:"column",gap:8},
  recentRow:{display:"flex",alignItems:"center",gap:14,padding:"12px 16px",
    background:"var(--surface)",border:"1px solid var(--border)",borderRadius:12,cursor:"pointer"},
  recentThumb:{width:40,height:36,borderRadius:8,background:"linear-gradient(135deg,#EEF2FF,#F5F3FF)",
    display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0},
  recentTitle:{fontSize:14,fontWeight:500,color:"var(--text-primary)"},
  recentMeta:{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"var(--text-muted)",marginTop:2},
  templateGrid:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14},
  templateCard:{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",
    background:"var(--surface)",border:"1px solid var(--border)",borderRadius:14,cursor:"pointer"},
  templateThumb:{width:44,height:44,borderRadius:10,background:"linear-gradient(135deg,#EEF2FF,#F0F4FF)",
    display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},
  templateTitle:{fontSize:13,fontWeight:600,color:"var(--text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},
  templateCat:{fontSize:11,color:"var(--text-muted)",marginTop:2},
  overlay:{position:"fixed",inset:0,background:"rgba(15,23,42,0.6)",display:"flex",
    alignItems:"center",justifyContent:"center",zIndex:9999,backdropFilter:"blur(4px)"},
  modal:{background:"#fff",borderRadius:20,padding:"36px 32px",width:420,
    boxShadow:"0 32px 80px rgba(0,0,0,0.22)",position:"relative"},
  modalClose:{position:"absolute",top:14,right:14,border:"none",background:"transparent",
    cursor:"pointer",color:"#94A3B8",display:"flex",padding:4,borderRadius:8},
  modalTitle:{fontSize:22,fontWeight:800,color:"#0F172A",margin:"0 0 6px",fontFamily:"'Syne',sans-serif"},
  modalSub:{fontSize:13,color:"#64748B",margin:0},
  label:{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:8},
};

