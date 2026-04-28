import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { FiPlus, FiTrash2, FiEdit2, FiClock, FiSearch, FiGrid, FiList, FiUsers, FiMoreVertical } from "react-icons/fi";

export default function BoardsPage() {
  const navigate = useNavigate();
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState("grid");
  const [menuOpen, setMenuOpen] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const b = await api.getBoards();
    setBoards(b || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createBoard = async () => {
    setCreating(true);
    const b = await api.createBoard({ title: "Untitled Board" });
    if (b?.id) navigate(`/board/${b.id}`);
    setCreating(false);
  };

  const deleteBoard = async (id) => {
    if (!window.confirm("Delete this board?")) return;
    await api.deleteBoard(id);
    setBoards(p => p.filter(b => b.id !== id));
    setMenuOpen(null);
  };

  const fmt = (ts) => {
    const diff = Date.now() - new Date(ts);
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return Math.floor(diff/60000) + "m ago";
    if (diff < 86400000) return Math.floor(diff/3600000) + "h ago";
    return new Date(ts).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
  };

  const filtered = boards.filter(b => b.title?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={S.page}>
      <div style={S.topBar}>
        <div style={S.searchWrap}>
          <FiSearch size={15} color="#94A3B8" />
          <input style={S.searchInput} placeholder="Search boards..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-ghost btn-icon" onClick={() => setView(v => v==="grid"?"list":"grid")}>
          {view==="grid" ? <FiList size={18}/> : <FiGrid size={18}/>}
        </button>
        <button className="btn btn-primary" onClick={createBoard} disabled={creating}>
          <FiPlus size={16}/> {creating ? "Creating..." : "New Board"}
        </button>
      </div>

      <div style={S.statsRow}>
        {[
          { label:"Total Boards", value:boards.length, color:"#6C47FF" },
          { label:"This Week", value:boards.filter(b=>Date.now()-new Date(b.created_at)<7*86400000).length, color:"#10B981" },
          { label:"Shared", value:boards.filter(b=>b.collaborator_count>0).length, color:"#3B82F6" },
        ].map(s => (
          <div key={s.label} style={S.statCard}>
            <div style={{...S.statValue,color:s.color}}>{s.value}</div>
            <div style={S.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={view==="grid"?S.grid:S.list}>
          {[1,2,3,4,5,6].map(i=><div key={i} className="skeleton" style={view==="grid"?{height:220,borderRadius:16}:{height:68,borderRadius:12}}/>)}
        </div>
      ) : filtered.length===0 ? (
        <div style={S.empty}>
          <span style={{fontSize:52}}>📋</span>
          <p style={{color:"#94A3B8",marginTop:14,fontSize:15}}>{search?"No boards match your search":"No boards yet — create your first!"}</p>
          {!search && <button className="btn btn-primary" style={{marginTop:20}} onClick={createBoard}><FiPlus size={16}/> Create Board</button>}
        </div>
      ) : view==="grid" ? (
        <div style={S.grid}>
          {filtered.map(b => (
            <div key={b.id} style={S.card} onClick={()=>navigate(`/board/${b.id}`)}>
              <div style={S.thumb}>
                {b.thumbnail ? <img src={b.thumbnail} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <span style={{fontSize:36}}>📋</span>}
              </div>
              <div style={S.cardBody}>
                <div style={S.cardTop}>
                  <span style={S.cardTitle}>{b.title}</span>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={e=>{e.stopPropagation();setMenuOpen(menuOpen===b.id?null:b.id);}}>
                    <FiMoreVertical size={15}/>
                  </button>
                </div>
                <div style={S.cardMeta}><FiClock size={11}/> {fmt(b.updated_at)}{b.collaborator_count>0&&<><FiUsers size={11}/> {b.collaborator_count}</>}</div>
                {menuOpen===b.id && (
                  <div style={S.dropdown} onClick={e=>e.stopPropagation()}>
                    <button style={S.dropItem} onClick={()=>{navigate(`/board/${b.id}`);setMenuOpen(null);}}><FiEdit2 size={13}/> Open</button>
                    <div style={S.dropDivider}/>
                    <button style={{...S.dropItem,color:"#EF4444"}} onClick={()=>deleteBoard(b.id)}><FiTrash2 size={13}/> Delete</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={S.list}>
          {filtered.map(b => (
            <div key={b.id} style={S.listItem} onClick={()=>navigate(`/board/${b.id}`)}>
              <div style={S.listThumb}>📋</div>
              <div style={{flex:1}}>
                <div style={S.cardTitle}>{b.title}</div>
                <div style={S.cardMeta}><FiClock size={11}/> {fmt(b.updated_at)}</div>
              </div>
              <div onClick={e=>e.stopPropagation()} style={{display:"flex",gap:4}}>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>navigate(`/board/${b.id}`)}><FiEdit2 size={14}/></button>
                <button className="btn btn-ghost btn-icon btn-sm" style={{color:"#EF4444"}} onClick={()=>deleteBoard(b.id)}><FiTrash2 size={14}/></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {menuOpen && <div style={S.overlay} onClick={()=>setMenuOpen(null)}/>}
      <div style={{display:"none"}}/>{/* balance */}
    </div>
  );
}

const S = {
  page:{display:"flex",flexDirection:"column",gap:24},
  topBar:{display:"flex",gap:12,alignItems:"center"},
  searchWrap:{display:"flex",alignItems:"center",gap:8,flex:1,maxWidth:360,padding:"9px 14px",background:"#fff",border:"1px solid #E2E8F0",borderRadius:12},
  searchInput:{border:"none",outline:"none",fontSize:13,color:"#0F172A",background:"transparent",width:"100%",fontFamily:"'Inter',sans-serif"},
  statsRow:{display:"flex",gap:16},
  statCard:{flex:1,background:"#fff",border:"1px solid #E2E8F0",borderRadius:14,padding:"16px 20px",textAlign:"center"},
  statValue:{fontSize:28,fontWeight:700,fontFamily:"'Syne',sans-serif"},
  statLabel:{fontSize:12,color:"#94A3B8",marginTop:4,fontWeight:500},
  grid:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:18},
  card:{background:"#fff",border:"1px solid #E2E8F0",borderRadius:16,overflow:"hidden",cursor:"pointer",transition:"box-shadow 0.2s,transform 0.2s",position:"relative"},
  thumb:{height:150,background:"linear-gradient(135deg,#EEF2FF,#F5F3FF)",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"},
  cardBody:{padding:"12px 14px",position:"relative"},
  cardTop:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4},
  cardTitle:{fontSize:14,fontWeight:600,color:"#0F172A",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1},
  cardMeta:{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#94A3B8"},
  dropdown:{position:"absolute",right:10,top:40,background:"#fff",border:"1px solid #E2E8F0",borderRadius:12,padding:6,minWidth:140,boxShadow:"0 12px 32px rgba(0,0,0,0.12)",zIndex:100},
  dropItem:{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 10px",borderRadius:8,border:"none",background:"transparent",fontSize:13,cursor:"pointer",color:"#0F172A",textAlign:"left"},
  dropDivider:{height:1,background:"#F1F4F9",margin:"4px 0"},
  overlay:{position:"fixed",inset:0,zIndex:99},
  list:{display:"flex",flexDirection:"column",gap:8},
  listItem:{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:"#fff",border:"1px solid #E2E8F0",borderRadius:12,cursor:"pointer"},
  listThumb:{width:44,height:44,borderRadius:10,background:"linear-gradient(135deg,#EEF2FF,#F5F3FF)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0},
  empty:{display:"flex",flexDirection:"column",alignItems:"center",paddingTop:80,textAlign:"center"},
};
