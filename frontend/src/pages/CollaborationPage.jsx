import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { groupsApi, api } from "../services/api";
import useAuthStore from "../stores/authStore";
import {
  FiUsers, FiPlus, FiMail, FiLink, FiCopy, FiCheck,
  FiTrash2, FiX, FiUser, FiShield, FiLogIn
} from "react-icons/fi";

const AVATAR_COLORS = ["#6C47FF","#3B82F6","#10B981","#F59E0B","#EF4444","#EC4899","#8B5CF6","#14B8A6"];
const initials = name => name?.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2) || "?";
const avatarColor = name => AVATAR_COLORS[(name?.charCodeAt(0)||0) % AVATAR_COLORS.length];

export default function CollaborationPage() {
  const { user } = useAuthStore();
  const navigate  = useNavigate();
  const [groups,     setGroups]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [selGroup,   setSelGroup]   = useState(null);
  const [members,    setMembers]    = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin,   setShowJoin]   = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [copied,     setCopied]     = useState(false);
  const [newGroup,   setNewGroup]   = useState({ name:"", description:"" });
  const [joinCode,   setJoinCode]   = useState("");
  const [inviteEmail,setInviteEmail]= useState("");
  const [msg,        setMsg]        = useState({ text:"", ok:true });
  const [boards,     setBoards]     = useState([]);

  const showMsg = (text, ok=true) => { setMsg({text,ok}); setTimeout(()=>setMsg({text:""}),3500); };

  const load = useCallback(async () => {
    setLoading(true);
    const g = await groupsApi.list();
    setGroups(Array.isArray(g) ? g : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadGroup = async grp => {
    setSelGroup(grp);
    const [m, b] = await Promise.all([groupsApi.members(grp.id), api.getBoards()]);
    setMembers(Array.isArray(m) ? m : []);
    setBoards(Array.isArray(b) ? b.filter(bd=>bd.group_id===grp.id) : []);
  };

  const createGroup = async () => {
    if (!newGroup.name.trim()) return;
    const g = await groupsApi.create(newGroup);
    if (g?.id) { showMsg("Group created! 🎉"); setShowCreate(false); setNewGroup({name:"",description:""}); load(); loadGroup(g); }
    else showMsg("Failed to create group", false);
  };

  const joinGroup = async () => {
    if (!joinCode.trim()) return;
    const r = await groupsApi.join(joinCode);
    if (r?.success) { showMsg(`Joined "${r.group.name}"! 🎉`); setShowJoin(false); setJoinCode(""); load(); }
    else showMsg(r?.error || "Invalid code", false);
  };

  const inviteMember = async () => {
    if (!inviteEmail.trim() || !selGroup) return;
    const r = await groupsApi.invite(selGroup.id, inviteEmail);
    if (r?.success) { showMsg("Invitation sent! ✉️"); setInviteEmail(""); loadGroup(selGroup); }
    else showMsg(r?.error || "User not found", false);
  };

  const removeMember = async uid => {
    if (!window.confirm("Remove this member?")) return;
    await groupsApi.removeMember(selGroup.id, uid);
    loadGroup(selGroup);
  };

  const copyCode = code => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(()=>setCopied(false), 2000);
  };

  const isOwner = grp => grp?.owner_id === user?.id;

  return (
    <div style={S.page}>
      {/* Toast */}
      {msg.text && (
        <div style={{...S.toast, background: msg.ok ? "#10B981" : "#EF4444"}}>{msg.text}</div>
      )}

      {/* Left panel — group list */}
      <div style={S.left}>
        <div style={S.leftHead}>
          <h3 style={S.panelTitle}>🤝 Your Groups</h3>
          <div style={{display:"flex",gap:6}}>
            <button className="btn btn-ghost btn-icon btn-sm" title="Join by code" onClick={()=>setShowJoin(true)}>
              <FiLogIn size={15}/>
            </button>
            <button className="btn btn-primary btn-sm" onClick={()=>setShowCreate(true)}>
              <FiPlus size={14}/> New
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{padding:20}}>{[1,2,3].map(i=><div key={i} className="skeleton" style={{height:64,borderRadius:10,marginBottom:8}}/>)}</div>
        ) : groups.length === 0 ? (
          <div style={S.emptyLeft}>
            <FiUsers size={36} color="#CBD5E1"/>
            <p style={{color:"#94A3B8",fontSize:13,textAlign:"center",margin:"12px 0"}}>
              No groups yet.<br/>Create one or join with a code.
            </p>
            <button className="btn btn-primary btn-sm" onClick={()=>setShowCreate(true)}><FiPlus size={14}/> Create Group</button>
            <button className="btn btn-secondary btn-sm" onClick={()=>setShowJoin(true)} style={{marginTop:6}}><FiLogIn size={14}/> Join with Code</button>
          </div>
        ) : (
          <div style={{padding:"8px 10px",display:"flex",flexDirection:"column",gap:4}}>
            {groups.map(g => (
              <div key={g.id} onClick={()=>loadGroup(g)}
                style={{...S.groupRow, background:selGroup?.id===g.id?"rgba(108,71,255,0.08)":"transparent",
                  border:`1.5px solid ${selGroup?.id===g.id?"#6C47FF":"transparent"}`}}>
                <div style={{...S.groupAvatar,background:avatarColor(g.name)}}>
                  {initials(g.name)}
                </div>
                <div style={{flex:1,overflow:"hidden"}}>
                  <div style={S.groupName}>{g.name}</div>
                  <div style={S.groupMeta}>{g.member_count||0} members</div>
                </div>
                {isOwner(g) && <FiShield size={12} color="#6C47FF" title="You own this group"/>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right panel — group detail */}
      <div style={S.right}>
        {!selGroup ? (
          <div style={S.emptyRight}>
            <FiUsers size={60} color="#E2E8F0"/>
            <h3 style={{color:"#94A3B8",margin:"16px 0 8px",fontWeight:600}}>Select a group</h3>
            <p style={{color:"#CBD5E1",fontSize:13,textAlign:"center",maxWidth:300}}>
              Choose a group from the left to see its members and shared boards.
            </p>
          </div>
        ) : (
          <>
            {/* Group header */}
            <div style={S.groupDetail}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
                <div style={{display:"flex",alignItems:"center",gap:14}}>
                  <div style={{...S.groupAvatar,width:52,height:52,fontSize:20,background:avatarColor(selGroup.name)}}>
                    {initials(selGroup.name)}
                  </div>
                  <div>
                    <h2 style={{fontSize:20,fontWeight:800,margin:"0 0 4px",fontFamily:"'Syne',sans-serif"}}>{selGroup.name}</h2>
                    {selGroup.description && <p style={{fontSize:13,color:"#64748B",margin:0}}>{selGroup.description}</p>}
                  </div>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button className="btn btn-secondary btn-sm" onClick={()=>setShowInvite(true)}>
                    <FiMail size={13}/> Invite
                  </button>
                  {/* Invite code copy */}
                  {isOwner(selGroup) && selGroup.invite_code && (
                    <button className="btn btn-secondary btn-sm"
                      onClick={()=>copyCode(selGroup.invite_code)}
                      style={{display:"flex",gap:6,alignItems:"center"}}>
                      {copied ? <FiCheck size={13} color="#10B981"/> : <FiCopy size={13}/>}
                      Code: <b style={{fontFamily:"monospace",letterSpacing:2}}>{selGroup.invite_code}</b>
                    </button>
                  )}
                  <button className="btn btn-primary btn-sm"
                    onClick={()=>navigate(`/board/new?group=${selGroup.id}`)}>
                    <FiPlus size={13}/> New Board
                  </button>
                </div>
              </div>
            </div>

            {/* Members */}
            <div style={S.section}>
              <h4 style={S.secTitle}>👥 Members ({members.length})</h4>
              <div style={S.memberGrid}>
                {members.map(m => (
                  <div key={m.id} style={S.memberCard}>
                    <div style={{...S.memberAvatar,background:avatarColor(m.name)}}>
                      {initials(m.name)}
                    </div>
                    <div style={{flex:1}}>
                      <div style={S.memberName}>{m.name} {m.id===user?.id && <span style={S.youBadge}>you</span>}</div>
                      <div style={S.memberEmail}>{m.email}</div>
                    </div>
                    <span style={{...S.roleBadge, background:m.role==="admin"?"rgba(108,71,255,0.12)":"rgba(16,185,129,0.1)",
                      color:m.role==="admin"?"#6C47FF":"#10B981"}}>
                      {m.role}
                    </span>
                    {isOwner(selGroup) && m.id !== user?.id && (
                      <button className="btn btn-ghost btn-icon btn-sm" style={{color:"#EF4444"}}
                        onClick={()=>removeMember(m.id)} title="Remove member">
                        <FiTrash2 size={13}/>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Invite section */}
            <div style={S.section}>
              <h4 style={S.secTitle}>➕ Add Members</h4>
              <div style={S.inviteWays}>
                {/* By email */}
                <div style={S.inviteCard}>
                  <div style={S.inviteIcon}><FiMail size={20} color="#6C47FF"/></div>
                  <div style={{flex:1}}>
                    <div style={S.inviteTitle}>Invite by Email</div>
                    <div style={S.inviteSub}>Send invite to existing users</div>
                    <div style={{display:"flex",gap:8,marginTop:10}}>
                      <input className="wb-input" placeholder="email@example.com"
                        value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)}
                        onKeyDown={e=>e.key==="Enter"&&inviteMember()}
                        style={{flex:1,fontSize:13}}/>
                      <button className="btn btn-primary btn-sm" onClick={inviteMember}>Send</button>
                    </div>
                  </div>
                </div>

                {/* By code */}
                {isOwner(selGroup) && selGroup.invite_code && (
                  <div style={S.inviteCard}>
                    <div style={S.inviteIcon}><FiLink size={20} color="#3B82F6"/></div>
                    <div style={{flex:1}}>
                      <div style={S.inviteTitle}>Share Invite Code</div>
                      <div style={S.inviteSub}>Anyone with this code can join</div>
                      <div style={{display:"flex",gap:8,marginTop:10,alignItems:"center"}}>
                        <div style={{
                          background:"#F1F4F9",padding:"8px 16px",borderRadius:8,
                          fontFamily:"monospace",fontSize:18,fontWeight:700,
                          letterSpacing:"0.2em",color:"#0F172A",flex:1,textAlign:"center"
                        }}>
                          {selGroup.invite_code}
                        </div>
                        <button className="btn btn-secondary btn-sm"
                          onClick={()=>copyCode(selGroup.invite_code)}>
                          {copied ? <FiCheck size={14} color="#10B981"/> : <FiCopy size={14}/>}
                          {copied ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Shared boards */}
            {boards.length > 0 && (
              <div style={S.section}>
                <h4 style={S.secTitle}>📋 Group Boards ({boards.length})</h4>
                <div style={S.boardsList}>
                  {boards.map(b=>(
                    <div key={b.id} style={S.boardRow} onClick={()=>navigate(`/board/${b.id}`)}>
                      <div style={S.boardThumb}>📋</div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:14,fontWeight:600,color:"#0F172A"}}>{b.title}</div>
                        <div style={{fontSize:11,color:"#94A3B8"}}>Updated {new Date(b.updated_at).toLocaleDateString()}</div>
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={e=>{e.stopPropagation();navigate(`/board/${b.id}`);}}>
                        Open →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Create Group Modal ── */}
      {showCreate && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <button style={S.modalClose} onClick={()=>setShowCreate(false)}><FiX size={18}/></button>
            <h3 style={S.modalTitle}>🤝 Create a Group</h3>
            <p style={S.modalSub}>Groups let you collaborate on boards with your team.</p>
            <label style={S.label}>Group Name *</label>
            <input className="input" autoFocus placeholder="e.g. Design Team, Marketing Q3…"
              value={newGroup.name} onChange={e=>setNewGroup(g=>({...g,name:e.target.value}))}
              onKeyDown={e=>e.key==="Enter"&&createGroup()}
              style={{marginBottom:14}}/>
            <label style={S.label}>Description (optional)</label>
            <textarea className="input" placeholder="What does this group work on?"
              value={newGroup.description} onChange={e=>setNewGroup(g=>({...g,description:e.target.value}))}
              rows={2} style={{marginBottom:20,resize:"vertical"}}/>
            <div style={{display:"flex",gap:10}}>
              <button className="btn btn-secondary btn-full" onClick={()=>setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary btn-full" onClick={createGroup} disabled={!newGroup.name.trim()}>
                Create Group →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Join Group Modal ── */}
      {showJoin && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <button style={S.modalClose} onClick={()=>setShowJoin(false)}><FiX size={18}/></button>
            <h3 style={S.modalTitle}>🔑 Join a Group</h3>
            <p style={S.modalSub}>Enter the 10-character invite code shared by the group owner.</p>
            <label style={S.label}>Invite Code</label>
            <input className="input" autoFocus placeholder="e.g. A1B2C3D4E5"
              value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={e=>e.key==="Enter"&&joinGroup()}
              style={{marginBottom:20,fontFamily:"monospace",fontSize:18,letterSpacing:"0.15em",textAlign:"center"}}/>
            <div style={{display:"flex",gap:10}}>
              <button className="btn btn-secondary btn-full" onClick={()=>setShowJoin(false)}>Cancel</button>
              <button className="btn btn-primary btn-full" onClick={joinGroup} disabled={joinCode.length<6}>
                Join Group →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const S = {
  page:       { display:"flex",height:"100%",gap:0,overflow:"hidden",margin:"-28px",background:"#F8F9FB" },
  left:       { width:280,background:"#fff",borderRight:"1px solid #E2E8F0",display:"flex",flexDirection:"column",flexShrink:0,overflow:"hidden" },
  leftHead:   { display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 14px 12px",borderBottom:"1px solid #F1F4F9" },
  panelTitle: { fontSize:14,fontWeight:700,margin:0,fontFamily:"'Syne',sans-serif",color:"#0F172A" },
  emptyLeft:  { display:"flex",flexDirection:"column",alignItems:"center",padding:"40px 20px" },
  groupRow:   { display:"flex",alignItems:"center",gap:10,padding:"10px 10px",borderRadius:10,cursor:"pointer",transition:"all 0.13s" },
  groupAvatar:{ width:38,height:38,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:"#fff",flexShrink:0 },
  groupName:  { fontSize:13,fontWeight:600,color:"#0F172A",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" },
  groupMeta:  { fontSize:11,color:"#94A3B8" },
  right:      { flex:1,overflowY:"auto",padding:"24px" },
  emptyRight: { height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center" },
  groupDetail:{ background:"#fff",borderRadius:16,padding:"20px",border:"1px solid #E2E8F0",marginBottom:20 },
  section:    { background:"#fff",borderRadius:16,padding:"18px 20px",border:"1px solid #E2E8F0",marginBottom:16 },
  secTitle:   { fontSize:14,fontWeight:700,margin:"0 0 14px",color:"#0F172A" },
  memberGrid: { display:"flex",flexDirection:"column",gap:6 },
  memberCard: { display:"flex",alignItems:"center",gap:12,padding:"10px 12px",background:"#F8FAFC",borderRadius:10 },
  memberAvatar:{ width:36,height:36,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff",flexShrink:0 },
  memberName: { fontSize:13,fontWeight:600,color:"#0F172A",display:"flex",alignItems:"center",gap:6 },
  memberEmail:{ fontSize:11,color:"#94A3B8" },
  youBadge:   { fontSize:9,fontWeight:700,color:"#6C47FF",background:"rgba(108,71,255,0.1)",padding:"1px 6px",borderRadius:99 },
  roleBadge:  { fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:99 },
  inviteWays: { display:"flex",flexDirection:"column",gap:12 },
  inviteCard: { display:"flex",gap:14,padding:"14px",background:"#F8FAFC",borderRadius:12,border:"1px solid #E2E8F0" },
  inviteIcon: { width:40,height:40,borderRadius:10,background:"#EEF2FF",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 },
  inviteTitle:{ fontSize:13,fontWeight:700,color:"#0F172A" },
  inviteSub:  { fontSize:11,color:"#94A3B8",marginTop:2 },
  boardsList: { display:"flex",flexDirection:"column",gap:8 },
  boardRow:   { display:"flex",alignItems:"center",gap:12,padding:"10px 12px",background:"#F8FAFC",borderRadius:10,cursor:"pointer" },
  boardThumb: { width:36,height:36,borderRadius:8,background:"linear-gradient(135deg,#EEF2FF,#F5F3FF)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0 },
  overlay:    { position:"fixed",inset:0,background:"rgba(15,23,42,0.65)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,backdropFilter:"blur(4px)" },
  modal:      { background:"#fff",borderRadius:20,padding:"32px 28px",width:"min(440px,95vw)",boxShadow:"0 32px 80px rgba(0,0,0,0.22)",position:"relative" },
  modalClose: { position:"absolute",top:14,right:14,border:"none",background:"transparent",cursor:"pointer",color:"#94A3B8",display:"flex",padding:4,borderRadius:8 },
  modalTitle: { fontSize:20,fontWeight:800,margin:"0 0 6px",fontFamily:"'Syne',sans-serif",color:"#0F172A" },
  modalSub:   { fontSize:13,color:"#64748B",margin:"0 0 20px" },
  label:      { fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:7 },
  toast:      { position:"fixed",top:20,right:20,zIndex:99999,padding:"10px 20px",borderRadius:10,color:"#fff",fontSize:13,fontWeight:600,boxShadow:"0 8px 24px rgba(0,0,0,0.2)" },
};
