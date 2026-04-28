import React, { useState, useRef, useEffect } from "react";

// ── All tools with icons ──────────────────────────────────────────────────
const TOOLS = [
  { id:"select",    icon:"↖",  label:"Select",     shortcut:"V" },
  { id:"pen",       icon:"✏️", label:"Pen",         shortcut:"P" },
  { id:"highlight", icon:"🖍️", label:"Highlighter", shortcut:"H" },
  { id:"eraser",    icon:"⬜", label:"Eraser",      shortcut:"E" },
  { id:"shape",     icon:"⬡",  label:"Shapes" },
  { id:"note",      icon:"🗒",  label:"Sticky Note" },
  { id:"text",      icon:"T",   label:"Text",        shortcut:"T" },
  { id:"image",     icon:"🖼️", label:"Image / Media" },
  { id:"pan",       icon:"✋", label:"Pan",          shortcut:"Space" },
];

const SHAPES = [
  {n:"Rectangle",icon:"▭"},{n:"Square",icon:"◻"},{n:"Circle",icon:"○"},
  {n:"Triangle",icon:"△"},{n:"Diamond",icon:"◇"},{n:"Pentagon",icon:"⬠"},
  {n:"Hexagon",icon:"⬡"},{n:"Octagon",icon:"⬜"},{n:"Star",icon:"★"},
  {n:"Heart",icon:"♡"},{n:"Arrow",icon:"→"},{n:"RoundRect",icon:"▢"},
];

const PEN_COLORS = [
  "#1e293b","#6C47FF","#3B82F6","#10B981","#F59E0B",
  "#EF4444","#EC4899","#8B5CF6","#000000","#FFFFFF",
];

const NOTE_COLORS = [
  "#FEF08A","#FCA5A5","#86EFAC","#93C5FD","#C4B5FD",
  "#FCD34D","#6EE7B7","#F9A8D4","#E0E7FF","#FFFFFF",
];

// ── Sub-panel for each tool — rendered as a floating panel on the canvas ──
function SubPanel({ toolId, anchor, onClose, isListening }) {
  const panelRef = useRef(null);
  const [penColor,   setPenColor]   = useState("#1e293b");
  const [penWidth,   setPenWidth]   = useState(3);
  const [penOpacity, setPenOpacity] = useState(100);
  const [eraserSize, setEraserSize] = useState(20);

  // Close on outside click
  useEffect(() => {
    const h = e => { if (panelRef.current && !panelRef.current.contains(e.target) && !e.target.closest("[data-sidebar]")) onClose(); };
    setTimeout(() => document.addEventListener("mousedown", h), 50);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  // Position panel to the right of sidebar
  const style = {
    position: "fixed",
    left:     80,
    top:      Math.min(anchor, window.innerHeight - 380),
    zIndex:   8000,
    background: "#fff",
    border:   "1px solid #E2E8F0",
    borderRadius: 14,
    boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
    width:    220,
    padding:  "14px 14px",
    display:  "flex", flexDirection:"column", gap:10,
    animation: "subPanelIn 0.15s ease both",
  };

  const Label = ({c}) => <span style={{fontSize:10,fontWeight:700,color:"#94A3B8",textTransform:"uppercase",letterSpacing:"0.08em"}}>{c}</span>;
  const Row   = ({children}) => <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>{children}</div>;

  const applyPen = (color,width,opacity) => {
    window.wb?.setPenColor(color??penColor);
    window.wb?.setPenWidth(width??penWidth);
    window.wb?.setPenOpacity((opacity??penOpacity)/100);
  };

  if (toolId === "pen" || toolId === "highlight") {
    return (
      <div ref={panelRef} style={style}>
        <div style={{fontWeight:700,fontSize:13,color:"#0F172A",marginBottom:2}}>
          {toolId==="pen" ? "✏️ Pen" : "🖍️ Highlighter"}
        </div>
        <Label c="Color"/>
        <Row>
          {PEN_COLORS.map(c=>(
            <button key={c} onClick={()=>{setPenColor(c);applyPen(c);}}
              style={{width:22,height:22,borderRadius:"50%",background:c,
                border:penColor===c?"2.5px solid #6C47FF":"1.5px solid #E2E8F0",cursor:"pointer"}}/>
          ))}
          <input type="color" value={penColor} onChange={e=>{setPenColor(e.target.value);applyPen(e.target.value);}}
            style={{width:22,height:22,borderRadius:"50%",border:"1.5px solid #E2E8F0",cursor:"pointer",padding:0}}/>
        </Row>
        <Label c="Thickness"/>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <input type="range" min={1} max={30} value={penWidth}
            onChange={e=>{const v=+e.target.value;setPenWidth(v);applyPen(undefined,v);}} style={{flex:1}}/>
          <span style={{fontSize:11,color:"#64748B",minWidth:30}}>{penWidth}px</span>
        </div>
        {toolId==="pen"&&(
          <>
            <Label c="Opacity"/>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <input type="range" min={10} max={100} value={penOpacity}
                onChange={e=>{const v=+e.target.value;setPenOpacity(v);applyPen(undefined,undefined,v);}} style={{flex:1}}/>
              <span style={{fontSize:11,color:"#64748B",minWidth:30}}>{penOpacity}%</span>
            </div>
          </>
        )}
        <Label c="Quick sizes"/>
        <Row>
          {[2,4,8,14,20].map(s=>(
            <button key={s} onClick={()=>{setPenWidth(s);applyPen(undefined,s);}}
              style={{width:28,height:28,borderRadius:6,border:penWidth===s?"2px solid #6C47FF":"1.5px solid #E2E8F0",
                background:penWidth===s?"#EEF2FF":"#fff",cursor:"pointer",
                display:"flex",alignItems:"center",justifyContent:"center"}}>
              <div style={{width:s/2,height:s/2,borderRadius:"50%",background:"#1e293b"}}/>
            </button>
          ))}
        </Row>
      </div>
    );
  }

  if (toolId === "eraser") {
    return (
      <div ref={panelRef} style={style}>
        <div style={{fontWeight:700,fontSize:13,color:"#0F172A",marginBottom:2}}>⬜ Eraser</div>
        <Label c="Size"/>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <input type="range" min={5} max={80} value={eraserSize}
            onChange={e=>{const v=+e.target.value;setEraserSize(v);window.wb?.setEraserSize(v);}} style={{flex:1}}/>
          <span style={{fontSize:11,color:"#64748B",minWidth:30}}>{eraserSize}px</span>
        </div>
        <Label c="Quick sizes"/>
        <Row>
          {[8,16,30,50].map(s=>(
            <button key={s} onClick={()=>{setEraserSize(s);window.wb?.setEraserSize(s);}}
              style={{padding:"4px 10px",border:eraserSize===s?"2px solid #6C47FF":"1.5px solid #E2E8F0",
                borderRadius:8,background:eraserSize===s?"#EEF2FF":"#fff",fontSize:11,cursor:"pointer"}}>
              {s}px
            </button>
          ))}
        </Row>
        <div style={{fontSize:10,color:"#94A3B8",textAlign:"center",paddingTop:4}}>
          Hover over strokes to erase
        </div>
      </div>
    );
  }

  if (toolId === "shape") {
    return (
      <div ref={panelRef} style={{...style,width:240}}>
        <div style={{fontWeight:700,fontSize:13,color:"#0F172A",marginBottom:2}}>⬡ Shapes</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:5}}>
          {SHAPES.map(s=>(
            <button key={s.n} onClick={()=>{window.wb?.addShape(s.n);onClose();}}
              title={s.n}
              style={{padding:"7px 4px",border:"1.5px solid #E2E8F0",borderRadius:8,
                background:"#fff",cursor:"pointer",display:"flex",flexDirection:"column",
                alignItems:"center",gap:2,transition:"all 0.15s"}}>
              <span style={{fontSize:18}}>{s.icon}</span>
              <span style={{fontSize:8,color:"#94A3B8"}}>{s.n}</span>
            </button>
          ))}
        </div>
        <Label c="Fill Color"/>
        <Row>
          {["#6C47FF","#3B82F6","#10B981","#F59E0B","#EF4444","#EC4899","#1e293b","#FFFFFF"].map(c=>(
            <button key={c} onClick={()=>window.wb?.setFillColor(c)}
              style={{width:22,height:22,borderRadius:"50%",background:c,border:"1.5px solid #E2E8F0",cursor:"pointer"}}/>
          ))}
          <input type="color" onChange={e=>window.wb?.setFillColor(e.target.value)}
            style={{width:22,height:22,borderRadius:"50%",padding:0,border:"none",cursor:"pointer"}}/>
        </Row>
      </div>
    );
  }

  if (toolId === "note") {
    return (
      <div ref={panelRef} style={style}>
        <div style={{fontWeight:700,fontSize:13,color:"#0F172A",marginBottom:2}}>🗒 Sticky Note</div>
        <Label c="Color"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr",gap:5}}>
          {NOTE_COLORS.map(c=>(
            <button key={c} onClick={()=>{window.wb?.addNote("📝 Click to edit",c);onClose();}}
              style={{width:36,height:36,borderRadius:6,background:c,border:"1.5px solid #E2E8F0",cursor:"pointer"}}/>
          ))}
        </div>
        <button onClick={()=>{window.wb?.addNote();onClose();}}
          style={{padding:"8px",border:"1.5px dashed #6C47FF",borderRadius:8,
            background:"#EEF2FF",cursor:"pointer",fontSize:12,fontWeight:600,color:"#6C47FF"}}>
          + Add Note (random color)
        </button>
      </div>
    );
  }

  if (toolId === "text") {
    return (
      <div ref={panelRef} style={style}>
        <div style={{fontWeight:700,fontSize:13,color:"#0F172A",marginBottom:2}}>T Text</div>
        <Label c="Quick sizes"/>
        <Row>
          {[12,16,20,28,36,48,64].map(s=>(
            <button key={s} onClick={()=>{window.wb?.setFontSize(s);window.wb?.addText();onClose();}}
              style={{padding:"4px 7px",border:"1.5px solid #E2E8F0",borderRadius:6,
                background:"#fff",fontSize:10,cursor:"pointer"}}>
              {s}
            </button>
          ))}
        </Row>
        <Label c="Font family"/>
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          {["Inter, sans-serif","Georgia, serif","'Courier New', monospace","Impact, sans-serif"].map(f=>(
            <button key={f} onClick={()=>{window.wb?.setFontFamily(f);window.wb?.addText();onClose();}}
              style={{padding:"5px 8px",border:"1.5px solid #E2E8F0",borderRadius:7,
                background:"#fff",fontSize:11,cursor:"pointer",textAlign:"left",fontFamily:f}}>
              {f.split(",")[0]}
            </button>
          ))}
        </div>
        <button onClick={()=>{window.wb?.addText();onClose();}}
          style={{padding:"8px",border:"none",borderRadius:8,background:"#6C47FF",
            color:"#fff",cursor:"pointer",fontSize:12,fontWeight:700}}>
          + Add Text Box
        </button>
      </div>
    );
  }

  if (toolId === "image") {
    return (
      <div ref={panelRef} style={style}>
        <div style={{fontWeight:700,fontSize:13,color:"#0F172A",marginBottom:2}}>🖼️ Media</div>
        <button onClick={()=>{window.wb?.uploadImage();onClose();}}
          style={{padding:"10px",border:"1.5px dashed #6C47FF",borderRadius:8,
            background:"#EEF2FF",cursor:"pointer",fontSize:12,fontWeight:600,color:"#6C47FF",
            display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          📁 Upload Image / File
        </button>
        <div style={{fontSize:11,color:"#94A3B8",textAlign:"center",lineHeight:1.5}}>
          Or paste an image with<br/><kbd style={{background:"#F1F4F9",padding:"1px 5px",borderRadius:4}}>Ctrl+V</kbd>
        </div>
      </div>
    );
  }

  if (toolId === "voice") {
    return (
      <div ref={panelRef} style={style}>
        <div style={{fontWeight:700,fontSize:13,color:"#0F172A",marginBottom:2}}>🎤 Voice Commands</div>
        <div style={{fontSize:11,color:"#64748B",lineHeight:1.7}}>
          <b>Commands you can say:</b><br/>
          "add note" • "add circle"<br/>
          "undo" • "redo" • "save"<br/>
          "zoom in" • "zoom out"<br/>
          "pen mode" • "eraser"<br/>
          "clear board" • "summarize"<br/>
          "stop listening"<br/><br/>
          <b>Dictation:</b> Select a note/text first, then speak to type into it. Or speak freely to create a new note.
        </div>
        <button onClick={()=>{window.wb?.toggleVoice();onClose();}}
          style={{padding:"10px",border:"none",borderRadius:8,
            background:isListening?"#EF4444":"#10B981",color:"#fff",
            cursor:"pointer",fontSize:12,fontWeight:700}}>
          {isListening?"🔴 Stop Listening":"🎤 Start Voice Input"}
        </button>
      </div>
    );
  }

  return null;
}

// ── Main Sidebar ─────────────────────────────────────────────────────────
export default function CanvasSidebar({ mode, onModeChange, isListening }) {
  const [openPanel, setOpenPanel]   = useState(null); // toolId
  const [anchorY,   setAnchorY]     = useState(80);

  const handleToolClick = (toolId, buttonY) => {
    const hasSubPanel = ["pen","highlight","eraser","shape","note","text","image","voice"].includes(toolId);

    // Set mode
    if (toolId === "highlight") { window.wb?.setMode("pen"); window.wb?.setIsHighlight(true); }
    else if (toolId !== "shape" && toolId !== "note" && toolId !== "image" && toolId !== "voice") {
      window.wb?.setMode(toolId);
      window.wb?.setIsHighlight(false);
    }
    onModeChange?.(toolId);

    if (hasSubPanel) {
      setOpenPanel(p => p === toolId ? null : toolId);
      setAnchorY(buttonY);
    } else {
      setOpenPanel(null);
    }
  };

  const ToolBtn = ({ tool, btnRef }) => {
    const ref = useRef(null);
    const active = mode === tool.id || (tool.id === "highlight" && mode === "pen");
    return (
      <button
        ref={ref}
        data-sidebar="1"
        title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ""}`}
        onClick={() => {
          const rect = ref.current?.getBoundingClientRect();
          handleToolClick(tool.id, rect?.top || 100);
        }}
        style={{
          display:"flex",flexDirection:"column",alignItems:"center",gap:2,
          padding:"8px 4px",border:"none",borderRadius:10,
          background: active ? "rgba(108,71,255,0.14)" : "transparent",
          color:      active ? "#6C47FF" : "#64748B",
          cursor:"pointer",transition:"all 0.13s",width:"100%",
          outline:    active ? "1.5px solid rgba(108,71,255,0.3)" : "none",
          position:"relative"
        }}
      >
        <span style={{fontSize:tool.id==="text"?17:20}}>{tool.icon}</span>
        <span style={{fontSize:9,fontWeight:600,letterSpacing:"0.02em"}}>{tool.label.split(" ")[0]}</span>
        {/* sub-panel indicator dot */}
        {["pen","highlight","eraser","shape","note","text","image"].includes(tool.id) && (
          <span style={{position:"absolute",bottom:4,right:4,width:4,height:4,borderRadius:"50%",
            background:openPanel===tool.id?"#6C47FF":"#CBD5E1"}}/>
        )}
      </button>
    );
  };

  return (
    <>
      {/* ── Sidebar strip ── */}
      <div data-sidebar="1" style={S.sidebar}>
        {/* Brand */}
        <div style={S.brandMark}>🧠</div>

        <div style={S.divider}/>

        {/* Tools */}
        {TOOLS.map(tool => <ToolBtn key={tool.id} tool={tool}/>)}

        <div style={S.divider}/>

        {/* Voice */}
        <button
          data-sidebar="1"
          title="Voice Input"
          onClick={() => {
            const els = document.querySelectorAll("[data-sidebar]");
            const rect = els[els.length-1]?.getBoundingClientRect();
            handleToolClick("voice", rect?.top || 400);
          }}
          style={{
            display:"flex",flexDirection:"column",alignItems:"center",gap:2,
            padding:"8px 4px",border:"none",borderRadius:10,
            background: isListening ? "rgba(16,185,129,0.14)" : "transparent",
            color:      isListening ? "#10B981" : "#64748B",
            cursor:"pointer",width:"100%",transition:"all 0.13s",position:"relative"
          }}
        >
          <span style={{fontSize:18,position:"relative"}}>
            🎤
            {isListening && (
              <span style={{position:"absolute",top:-2,right:-2,width:8,height:8,
                borderRadius:"50%",background:"#10B981",border:"2px solid #fff",
                animation:"pulse 1.2s infinite"}}/>
            )}
          </span>
          <span style={{fontSize:9,fontWeight:600}}>{isListening?"Stop":"Voice"}</span>
        </button>

        {/* AI Summary */}
        <button
          data-sidebar="1"
          title="AI Summarize board"
          onClick={()=>window.wb?.summarize()}
          style={{
            display:"flex",flexDirection:"column",alignItems:"center",gap:2,
            padding:"8px 4px",border:"none",borderRadius:10,
            background:"transparent",color:"#6C47FF",
            cursor:"pointer",width:"100%"
          }}
        >
          <span style={{fontSize:18}}>🤖</span>
          <span style={{fontSize:9,fontWeight:600}}>Summary</span>
        </button>

        <div style={S.divider}/>

        {/* Undo / Redo */}
        <button data-sidebar="1" title="Undo (Ctrl+Z)" onClick={()=>window.wb?.undo()}
          style={S.smBtn}>↩</button>
        <button data-sidebar="1" title="Redo (Ctrl+Y)" onClick={()=>window.wb?.redo()}
          style={S.smBtn}>↪</button>

        {/* Clear */}
        <button data-sidebar="1" title="Clear board" onClick={()=>{if(window.confirm("Clear the entire board?"))window.wb?.clearCanvas();}}
          style={{...S.smBtn,color:"#EF4444",fontSize:16}}>🗑</button>
      </div>

      {/* ── Floating sub-panel ── */}
      {openPanel && (
        <SubPanel
          toolId={openPanel}
          anchor={anchorY}
          isListening={isListening}
          onClose={() => setOpenPanel(null)}
        />
      )}
    </>
  );
}

const S = {
  sidebar: {
    width:64, background:"#fff", borderRight:"1px solid #E2E8F0",
    display:"flex",flexDirection:"column",alignItems:"center",
    padding:"8px 4px",gap:2,flexShrink:0,overflowY:"auto",
    overflowX:"hidden",height:"100%"
  },
  brandMark: { fontSize:22, padding:"4px 0 6px", cursor:"pointer" },
  divider:   { width:36, height:1, background:"#F1F4F9", margin:"4px 0" },
  smBtn: {
    width:"100%",padding:"7px 4px",border:"none",borderRadius:8,
    background:"transparent",cursor:"pointer",fontSize:18,color:"#64748B",
    display:"flex",alignItems:"center",justifyContent:"center"
  }
};
