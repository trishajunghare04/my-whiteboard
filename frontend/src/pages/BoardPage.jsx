import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CanvasBoard from "../components/canvas/CanvasBoard";
import CanvasSidebar from "../components/canvas/CanvasSidebar";
import { api } from "../services/api";
import useAuthStore from "../stores/authStore";
import { FiArrowLeft, FiUserPlus, FiShare2, FiCheck, FiX } from "react-icons/fi";

export default function BoardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [mode,       setMode]       = useState("select");
  const [board,      setBoard]      = useState(null);
  const [showTitle,  setShowTitle]  = useState(id === "new");
  const [titleInput, setTitleInput] = useState("");
  const [showCollab, setShowCollab] = useState(false);
  const [collabEmail,setCollabEmail]= useState("");
  const [collaborators,setCollaborators]=useState([]);
  const [collabMsg,  setCollabMsg]  = useState("");
  const [creating,   setCreating]   = useState(false);
  const [currentId,  setCurrentId]  = useState(id !== "new" ? id : null);
  const [isListening,setIsListening]= useState(false);

  useEffect(() => {
    if (id && id !== "new") {
      api.getBoard(id).then(b => {
        if (b?.id) {
          setBoard(b);
          setCollaborators(b.collaborators || []);
        }
      });
    }
  }, [id]);

  // ── Create board with title ──
  const handleCreateBoard = async () => {
    if (!titleInput.trim()) { alert("Please enter a board title"); return; }
    setCreating(true);
    const b = await api.createBoard({ title: titleInput.trim() });
    if (b?.id) {
      setCurrentId(b.id);
      setBoard(b);
      setShowTitle(false);
      window.history.replaceState(null, "", `/board/${b.id}`);
    }
    setCreating(false);
  };

  // ── Invite collaborator ──
  const handleInvite = async () => {
    if (!collabEmail.trim() || !currentId) return;
    const res = await api.inviteCollaborator(currentId, collabEmail.trim(), "editor");
    if (res?.success) {
      setCollabMsg("✅ Invited successfully!");
      setCollabEmail("");
      // Refresh
      api.getBoard(currentId).then(b => setCollaborators(b?.collaborators||[]));
    } else {
      setCollabMsg("❌ User not found or already added");
    }
    setTimeout(()=>setCollabMsg(""), 3000);
  };

  return (
    <div style={S.shell}>
      {/* ── HEADER ── */}
      <header style={S.header}>
        <div style={S.hLeft}>
          <button style={S.backBtn} onClick={()=>navigate("/dashboard")} title="Back to dashboard">
            <FiArrowLeft size={16}/>
          </button>
          <div style={S.logoMark}>🧠</div>
          {/* Editable board title */}
          <input
            value={board?.title || (id==="new"?"Untitled Board":"")}
            onChange={e => setBoard(b=>b?{...b,title:e.target.value}:b)}
            onBlur={e => { if(board?.id) api.updateBoard(board.id,{...board,title:e.target.value}); }}
            style={S.titleInput}
            placeholder="Untitled Board"
          />
          <span style={{fontSize:11,color:"#94A3B8",marginLeft:4}}>{board?.is_public?"Public":"Private"}</span>
        </div>
        <div style={S.hRight}>
          {/* Online users shown inside CanvasBoard top bar */}
          <button style={S.hBtn} onClick={()=>setShowCollab(x=>!x)} title="Collaborators">
            <FiUserPlus size={16}/> Share
          </button>
          <button style={S.hBtnPrimary} onClick={()=>window.wb?.manualSave()} title="Save board">
            Save
          </button>
        </div>
      </header>

      {/* ── MAIN ── */}
      <div style={S.main}>
        <CanvasSidebar mode={mode} onModeChange={setMode} isListening={isListening}/>
        <div style={S.canvasWrap}>
          <CanvasBoard
            boardId={currentId || "new"}
            onTitleNeeded={() => setShowTitle(true)}
            onListeningChange={setIsListening}
          />
        </div>
      </div>

      {/* ── TITLE MODAL (shown before first save for new boards) ── */}
      {showTitle && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={S.modalHead}>
              <span style={{fontSize:20}}>📋</span>
              <h2 style={S.modalTitle}>Name your board</h2>
              <p style={S.modalSub}>Give your board a title before saving</p>
            </div>
            <input
              className="wb-input"
              autoFocus
              placeholder="e.g. Q3 Sprint Planning"
              value={titleInput}
              onChange={e=>setTitleInput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleCreateBoard()}
              style={{marginBottom:12}}
            />
            <div style={{display:"flex",gap:8}}>
              {id!=="new"&&(
                <button style={S.modalCancel} onClick={()=>setShowTitle(false)}>Cancel</button>
              )}
              <button style={S.modalConfirm} onClick={handleCreateBoard} disabled={creating}>
                {creating?"Creating…":"Create Board"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── COLLABORATOR PANEL ── */}
      {showCollab && (
        <div style={S.collabPanel}>
          <div style={S.collabHead}>
            <span style={{fontWeight:700,fontSize:15}}>🤝 Share Board</span>
            <button style={S.closeBtn} onClick={()=>setShowCollab(false)}><FiX size={16}/></button>
          </div>

          {!currentId ? (
            <div style={{color:"#94A3B8",fontSize:13,padding:"12px 0"}}>
              Save the board first to share it.
            </div>
          ) : (
            <>
              {/* Invite */}
              <div style={{display:"flex",gap:8,marginBottom:16}}>
                <input
                  className="wb-input"
                  placeholder="Enter email address"
                  value={collabEmail}
                  onChange={e=>setCollabEmail(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&handleInvite()}
                  style={{flex:1}}
                />
                <button style={S.inviteBtn} onClick={handleInvite}>
                  Invite
                </button>
              </div>
              {collabMsg&&<div style={{fontSize:12,marginBottom:10,color:collabMsg.startsWith("✅")?"#10B981":"#EF4444"}}>{collabMsg}</div>}

              {/* Current access */}
              <div style={{fontSize:11,fontWeight:700,color:"#94A3B8",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>
                Who has access
              </div>
              {/* Owner */}
              <div style={S.collabRow}>
                <div style={{...S.collabAvatar,background:"#6C47FF"}}>
                  {user?.name?.[0]?.toUpperCase()}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600}}>{user?.name} (you)</div>
                  <div style={{fontSize:11,color:"#94A3B8"}}>{user?.email}</div>
                </div>
                <span style={S.ownerBadge}>Owner</span>
              </div>
              {collaborators.map(c=>(
                <div key={c.id} style={S.collabRow}>
                  <div style={{...S.collabAvatar,background:"#3B82F6"}}>
                    {c.name?.[0]?.toUpperCase()}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600}}>{c.name}</div>
                    <div style={{fontSize:11,color:"#94A3B8"}}>{c.email}</div>
                  </div>
                  <span style={S.editorBadge}>{c.role}</span>
                </div>
              ))}
              {collaborators.length===0&&(
                <div style={{fontSize:12,color:"#CBD5E1",padding:"8px 0"}}>No collaborators yet</div>
              )}

              {/* Share link */}
              <div style={{marginTop:16,borderTop:"1px solid #F1F4F9",paddingTop:14}}>
                <div style={{fontSize:11,fontWeight:700,color:"#94A3B8",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.08em"}}>Share link</div>
                <div style={{display:"flex",gap:8}}>
                  <div style={S.shareLink}>{window.location.href}</div>
                  <button style={S.copyBtn} onClick={()=>navigator.clipboard.writeText(window.location.href)}>Copy</button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const S = {
  shell:{display:"flex",flexDirection:"column",height:"100vh",overflow:"hidden"},
  header:{
    height:52,background:"#fff",borderBottom:"1px solid #E2E8F0",
    display:"flex",alignItems:"center",justifyContent:"space-between",
    padding:"0 14px",flexShrink:0,gap:10,zIndex:100
  },
  hLeft:{display:"flex",alignItems:"center",gap:10},
  hRight:{display:"flex",alignItems:"center",gap:8},
  backBtn:{display:"flex",alignItems:"center",justifyContent:"center",width:32,height:32,
    border:"1.5px solid #E2E8F0",borderRadius:8,background:"#fff",cursor:"pointer",color:"#475569"},
  logoMark:{fontSize:20},
  titleInput:{border:"none",outline:"none",fontSize:14,fontWeight:600,color:"#0F172A",
    background:"transparent",minWidth:120,maxWidth:280,
    fontFamily:"'Inter',sans-serif"},
  hBtn:{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",
    border:"1.5px solid #E2E8F0",borderRadius:9,background:"#fff",
    fontSize:13,fontWeight:600,cursor:"pointer",color:"#475569"},
  hBtnPrimary:{padding:"6px 16px",border:"none",borderRadius:9,
    background:"#6C47FF",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"},
  main:{flex:1,display:"flex",overflow:"hidden"},
  canvasWrap:{flex:1,overflow:"hidden",position:"relative"},

  // Title modal
  overlay:{position:"fixed",inset:0,background:"rgba(15,23,42,0.55)",display:"flex",
    alignItems:"center",justifyContent:"center",zIndex:9999,backdropFilter:"blur(4px)"},
  modal:{background:"#fff",borderRadius:20,padding:"32px 28px",width:380,
    boxShadow:"0 32px 80px rgba(0,0,0,0.22)"},
  modalHead:{textAlign:"center",marginBottom:20},
  modalTitle:{fontSize:22,fontWeight:800,color:"#0F172A",margin:"10px 0 6px",fontFamily:"'Syne',sans-serif"},
  modalSub:{fontSize:13,color:"#64748B"},
  modalCancel:{flex:1,padding:"10px",border:"1.5px solid #E2E8F0",borderRadius:10,
    background:"#fff",cursor:"pointer",fontSize:14,fontWeight:600,color:"#475569"},
  modalConfirm:{flex:1,padding:"10px",border:"none",borderRadius:10,
    background:"#6C47FF",color:"#fff",cursor:"pointer",fontSize:14,fontWeight:700},

  // Collab panel
  collabPanel:{position:"fixed",top:52,right:0,width:340,height:"calc(100vh - 52px)",
    background:"#fff",borderLeft:"1px solid #E2E8F0",padding:20,
    boxShadow:"-8px 0 32px rgba(0,0,0,0.08)",zIndex:500,overflowY:"auto",
    display:"flex",flexDirection:"column"},
  collabHead:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20},
  closeBtn:{display:"flex",border:"none",background:"transparent",cursor:"pointer",color:"#94A3B8"},
  inviteBtn:{padding:"8px 16px",border:"none",borderRadius:10,background:"#6C47FF",
    color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",flexShrink:0},
  collabRow:{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid #F8F9FB"},
  collabAvatar:{width:34,height:34,borderRadius:"50%",display:"flex",alignItems:"center",
    justifyContent:"center",fontSize:14,fontWeight:700,color:"#fff",flexShrink:0},
  ownerBadge:{fontSize:10,fontWeight:700,color:"#6C47FF",background:"rgba(108,71,255,0.1)",
    padding:"2px 8px",borderRadius:99},
  editorBadge:{fontSize:10,fontWeight:700,color:"#10B981",background:"rgba(16,185,129,0.1)",
    padding:"2px 8px",borderRadius:99},
  shareLink:{flex:1,fontSize:11,color:"#475569",background:"#F8F9FB",padding:"7px 10px",
    borderRadius:8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},
  copyBtn:{padding:"7px 12px",border:"1.5px solid #E2E8F0",borderRadius:8,
    background:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",color:"#475569"},
};
