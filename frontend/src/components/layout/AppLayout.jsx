import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import useAuthStore from "../../stores/authStore";
import { FiPlus, FiSun, FiMoon, FiLogOut, FiChevronDown, FiSearch, FiBell } from "react-icons/fi";

const NAV = [
  { icon:"🏠", label:"Dashboard",      path:"/dashboard" },
  { icon:"📋", label:"Boards",         path:"/boards" },
  { icon:"🎨", label:"Templates",      path:"/templates" },
  { icon:"🤝", label:"Collaboration",  path:"/collaboration" },
  { icon:"🔔", label:"Notifications",  path:"/notifications" },
  { icon:"🗑️", label:"Trash",          path:"/trash" },
];

export default function AppLayout({ children }) {
  const { user, logout } = useAuthStore();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [dark, setDark] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);

  const pageName = NAV.find(n => location.pathname.startsWith(n.path))?.label || "Dashboard";

  return (
    <div style={S.shell}>
      {/* ── Sidebar ── */}
      <aside style={S.sidebar}>
        <div style={S.brand}>
          <span style={{fontSize:24}}>🧠</span>
          <span style={S.brandName}>MyWhiteboard</span>
        </div>

        <div style={{padding:"10px 14px 6px"}}>
          <div style={S.wsLabel}>Workspace</div>
          <div style={S.wsBox}>
            <span style={S.wsName}>My Workspace</span>
            <FiChevronDown size={12} color="#94A3B8"/>
          </div>
        </div>

        <nav style={S.nav}>
          {NAV.map(item => {
            const active = location.pathname === item.path ||
              (item.path !== "/dashboard" && location.pathname.startsWith(item.path));
            return (
              <Link key={item.path} to={item.path} style={{
                ...S.navItem,
                background: active ? "rgba(108,71,255,0.09)" : "transparent",
                color:      active ? "#6C47FF" : "#475569",
              }}>
                <span style={{fontSize:17}}>{item.icon}</span>
                <span style={{fontSize:13,fontWeight:active?600:400}}>{item.label}</span>
                {active && <div style={S.activeDot}/>}
              </Link>
            );
          })}
        </nav>

        <div style={{padding:"0 12px 10px"}}>
          <button className="btn btn-primary btn-full" style={{justifyContent:"center"}}
            onClick={() => navigate("/board/new")}>
            <FiPlus size={15}/> New Board
          </button>
        </div>

        <div style={{flex:1}}/>

        <div style={S.userRow}>
          <div style={{...S.uAvatar,background:"#6C47FF"}}>{user?.avatar || user?.name?.[0] || "U"}</div>
          <div style={{flex:1,overflow:"hidden"}}>
            <div style={S.uName}>{user?.name}</div>
            <div style={S.uEmail}>{user?.email}</div>
          </div>
          <button className="btn btn-ghost btn-icon" title="Sign out"
            onClick={()=>{logout();navigate("/login");}}>
            <FiLogOut size={14} color="#94A3B8"/>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={S.main}>
        <header style={S.header}>
          <h1 style={S.pageTitle}>{pageName}</h1>
          <div style={S.hRight}>
            <div style={S.searchBox}>
              <FiSearch size={14} color="#94A3B8"/>
              <input style={S.searchIn} placeholder="Search boards, templates…"
                value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <button className="btn btn-ghost btn-icon" onClick={()=>setDark(d=>!d)}>
              {dark ? <FiSun size={17}/> : <FiMoon size={17}/>}
            </button>
            <div style={{position:"relative",cursor:"pointer",padding:8}}
              onClick={()=>navigate("/notifications")}>
              <FiBell size={17} color="#475569"/>
              <span style={S.notifDot}>3</span>
            </div>
            <div style={{display:"flex"}}>
              {["T","A","P"].map((l,i)=>(
                <div key={i} style={{
                  width:28,height:28,borderRadius:"50%",fontSize:11,fontWeight:700,
                  color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",
                  background:["#6C47FF","#3B82F6","#10B981"][i],
                  border:"2px solid var(--surface)",marginLeft:i?-8:0
                }}>{l}</div>
              ))}
            </div>
          </div>
        </header>
        <main style={S.content}>{children}</main>
      </div>
    </div>
  );
}

const S = {
  shell:{display:"flex",height:"100vh",overflow:"hidden"},
  sidebar:{width:240,background:"var(--surface)",borderRight:"1px solid var(--border)",display:"flex",flexDirection:"column",flexShrink:0,overflow:"hidden"},
  brand:{display:"flex",alignItems:"center",gap:10,padding:"18px 18px 14px",borderBottom:"1px solid var(--border)"},
  brandName:{fontSize:16,fontWeight:800,fontFamily:"'Syne',sans-serif",color:"var(--text-primary)"},
  wsLabel:{fontSize:10,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:7},
  wsBox:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 11px",background:"var(--surface-2)",borderRadius:9,border:"1px solid var(--border)",cursor:"pointer"},
  wsName:{fontSize:12,fontWeight:600,color:"var(--text-primary)"},
  nav:{flex:1,padding:"8px 10px",display:"flex",flexDirection:"column",gap:2,overflowY:"auto"},
  navItem:{display:"flex",alignItems:"center",gap:10,padding:"9px 10px",borderRadius:10,textDecoration:"none",transition:"background 0.13s",position:"relative"},
  activeDot:{position:"absolute",right:10,width:6,height:6,borderRadius:"50%",background:"#6C47FF"},
  userRow:{display:"flex",alignItems:"center",gap:10,padding:"12px 14px 18px",borderTop:"1px solid var(--border)"},
  uAvatar:{width:32,height:32,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"#fff",flexShrink:0},
  uName:{fontSize:13,fontWeight:600,color:"var(--text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},
  uEmail:{fontSize:11,color:"var(--text-muted)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},
  main:{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"},
  header:{height:62,background:"var(--surface)",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 26px",flexShrink:0},
  pageTitle:{fontSize:20,fontWeight:800,color:"var(--text-primary)",fontFamily:"'Syne',sans-serif",margin:0},
  hRight:{display:"flex",alignItems:"center",gap:10},
  searchBox:{display:"flex",alignItems:"center",gap:8,padding:"7px 13px",background:"var(--surface-2)",border:"1px solid var(--border)",borderRadius:10,width:210},
  searchIn:{border:"none",background:"transparent",outline:"none",fontSize:13,color:"var(--text-primary)",width:"100%",fontFamily:"'Inter',sans-serif"},
  notifDot:{position:"absolute",top:4,right:4,width:15,height:15,background:"#EF4444",borderRadius:"50%",fontSize:9,fontWeight:700,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"},
  content:{flex:1,overflowY:"auto",padding:"28px"},
};
