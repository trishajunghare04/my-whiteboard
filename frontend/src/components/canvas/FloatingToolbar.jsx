import React, { useState } from "react";
import { Rnd } from "react-rnd";
import {
  FiBold, FiItalic, FiAlignLeft, FiAlignCenter, FiAlignRight,
  FiTrash2, FiX, FiDroplet, FiType, FiRotateCcw
} from "react-icons/fi";
import { MdFormatColorFill, MdBorderColor } from "react-icons/md";

const FONT_FAMILIES = ["Inter", "Georgia", "Courier New", "Verdana", "Arial", "Times New Roman", "Trebuchet MS"];
const NOTE_COLORS = [
  "#FEF08A", "#FCA5A5", "#86EFAC", "#93C5FD", "#C4B5FD",
  "#FCD34D", "#6EE7B7", "#F9A8D4", "#E0E7FF", "#FFFFFF"
];
const SHAPE_COLORS = [
  "#6C47FF", "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
  "#EC4899", "#8B5CF6", "#14B8A6", "#F97316", "#64748B"
];

export default function FloatingToolbar({ object, position, onUpdate, onDelete, onClose }) {
  const [tab, setTab] = useState("style");

  if (!object) return null;

  const isNote = !!object.background;
  const isText = !object.background && !object.color?.startsWith("#") || (object.color && !object.background && !object.borderColor);

  return (
    <Rnd
      default={{ x: position.x, y: position.y, width: "auto", height: "auto" }}
      bounds="parent"
      enableResizing={false}
      style={{ zIndex: 500, pointerEvents: "all" }}
      cancel="input,select,button"
    >
      <div style={styles.toolbar}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.tabs}>
            {["style","text","layout"].map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <button style={styles.closeBtn} onClick={onClose}><FiX size={14} /></button>
        </div>

        <div style={styles.content}>
          {tab === "style" && (
            <>
              {/* Fill / Background Color */}
              <div style={styles.row}>
                <span style={styles.rowLabel}>{isNote ? "Background" : "Fill"}</span>
                <div style={styles.colorGrid}>
                  {(isNote ? NOTE_COLORS : SHAPE_COLORS).map(c => (
                    <button key={c} onClick={() => onUpdate(isNote ? { background: c } : { color: c })}
                      style={{ ...styles.colorDot, background: c, border: (isNote ? object.background : object.color) === c ? "2.5px solid #6C47FF" : "1.5px solid #E2E8F0" }} />
                  ))}
                  <input type="color" title="Custom" onChange={e => onUpdate(isNote ? { background: e.target.value } : { color: e.target.value })}
                    style={styles.colorInput} />
                </div>
              </div>

              {/* Border Color (shapes only) */}
              {!isNote && object.borderColor !== undefined && (
                <div style={styles.row}>
                  <span style={styles.rowLabel}>Border</span>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input type="color" value={object.borderColor || "#000000"}
                      onChange={e => onUpdate({ borderColor: e.target.value })} style={styles.colorInputSmall} />
                    <select value={object.borderSize || 2} onChange={e => onUpdate({ borderSize: Number(e.target.value) })} style={styles.select}>
                      {[0,1,2,3,4,6,8].map(v => <option key={v} value={v}>{v}px</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Text Color */}
              <div style={styles.row}>
                <span style={styles.rowLabel}>Text Color</span>
                <div style={{ display: "flex", gap: 6 }}>
                  {["#0F172A","#FFFFFF","#6C47FF","#EF4444","#10B981","#F59E0B"].map(c => (
                    <button key={c} onClick={() => onUpdate(isNote ? { fontColor: c } : { fontColor: c, color: c })}
                      style={{ ...styles.colorDot, background: c, width: 20, height: 20, border: "1.5px solid #E2E8F0" }} />
                  ))}
                  <input type="color" onChange={e => onUpdate({ fontColor: e.target.value, color: e.target.value })} style={styles.colorInput} />
                </div>
              </div>

              {/* Opacity */}
              <div style={styles.row}>
                <span style={styles.rowLabel}>Opacity</span>
                <input type="range" min={20} max={100} defaultValue={100}
                  onChange={e => onUpdate({ opacity: Number(e.target.value) / 100 })} style={{ flex: 1 }} />
              </div>
            </>
          )}

          {tab === "text" && (
            <>
              {/* Font Family */}
              <div style={styles.row}>
                <span style={styles.rowLabel}>Font</span>
                <select value={object.fontFamily || "Inter"} onChange={e => onUpdate({ fontFamily: e.target.value })} style={styles.select}>
                  {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              {/* Font Size */}
              <div style={styles.row}>
                <span style={styles.rowLabel}>Size</span>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <button style={styles.iconBtn} onClick={() => onUpdate({ fontSize: Math.max((object.fontSize || 16) - 1, 8) })}>A▼</button>
                  <input type="number" min={8} max={120} value={object.fontSize || 16}
                    onChange={e => onUpdate({ fontSize: Number(e.target.value) })}
                    style={{ ...styles.numInput }} />
                  <button style={styles.iconBtn} onClick={() => onUpdate({ fontSize: Math.min((object.fontSize || 16) + 1, 120) })}>A▲</button>
                </div>
              </div>

              {/* Bold / Italic */}
              <div style={styles.row}>
                <span style={styles.rowLabel}>Style</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button style={{ ...styles.iconBtn, ...(object.bold ? styles.iconBtnActive : {}) }}
                    onClick={() => onUpdate({ bold: !object.bold })}><FiBold size={14} /></button>
                  <button style={{ ...styles.iconBtn, ...(object.italic ? styles.iconBtnActive : {}) }}
                    onClick={() => onUpdate({ italic: !object.italic })}><FiItalic size={14} /></button>
                </div>
              </div>

              {/* Alignment */}
              <div style={styles.row}>
                <span style={styles.rowLabel}>Align</span>
                <div style={{ display: "flex", gap: 6 }}>
                  {[{ v: "left", i: <FiAlignLeft size={14} /> }, { v: "center", i: <FiAlignCenter size={14} /> }, { v: "right", i: <FiAlignRight size={14} /> }].map(a => (
                    <button key={a.v} style={{ ...styles.iconBtn, ...(object.align === a.v ? styles.iconBtnActive : {}) }}
                      onClick={() => onUpdate({ align: a.v, textAlign: a.v })}>{a.i}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          {tab === "layout" && (
            <>
              {/* Rotation */}
              <div style={styles.row}>
                <span style={styles.rowLabel}>Rotation</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="range" min={0} max={360} value={object.rotation || 0}
                    onChange={e => onUpdate({ rotation: Number(e.target.value) })} style={{ flex: 1 }} />
                  <span style={{ fontSize: 12, color: "#64748B", minWidth: 36 }}>{Math.round(object.rotation || 0)}°</span>
                </div>
              </div>

              {/* Shadow (notes) */}
              {isNote && (
                <div style={styles.row}>
                  <span style={styles.rowLabel}>Shadow</span>
                  <button style={{ ...styles.iconBtn, ...(object.shadow ? styles.iconBtnActive : {}) }}
                    onClick={() => onUpdate({ shadow: !object.shadow })}>
                    {object.shadow ? "On" : "Off"}
                  </button>
                </div>
              )}

              {/* Reset rotation */}
              <div style={styles.row}>
                <button style={styles.iconBtn} onClick={() => onUpdate({ rotation: 0 })}>
                  <FiRotateCcw size={14} /> Reset
                </button>
              </div>
            </>
          )}

          {/* Delete */}
          <div style={styles.footer}>
            <button style={styles.deleteBtn} onClick={onDelete}>
              <FiTrash2 size={13} /> Delete
            </button>
          </div>
        </div>
      </div>
    </Rnd>
  );
}

const styles = {
  toolbar: {
    background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16,
    boxShadow: "0 16px 48px rgba(0,0,0,0.14)", overflow: "hidden", width: 280,
    userSelect: "none"
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "10px 12px 0", borderBottom: "1px solid #F1F4F9"
  },
  tabs: { display: "flex", gap: 2 },
  tab: {
    padding: "6px 10px", border: "none", background: "transparent",
    fontSize: 12, fontWeight: 500, color: "#94A3B8", borderRadius: 8, cursor: "pointer"
  },
  tabActive: { background: "#F1F4F9", color: "#6C47FF", fontWeight: 600 },
  closeBtn: { border: "none", background: "transparent", cursor: "pointer", color: "#94A3B8", display: "flex", padding: 4, borderRadius: 6 },
  content: { padding: "12px 14px", display: "flex", flexDirection: "column", gap: 12 },
  row: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  rowLabel: { fontSize: 11, fontWeight: 600, color: "#64748B", width: 60, flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.05em" },
  colorGrid: { display: "flex", flexWrap: "wrap", gap: 5 },
  colorDot: { width: 22, height: 22, borderRadius: "50%", cursor: "pointer", border: "1.5px solid #E2E8F0", transition: "transform 0.15s" },
  colorInput: { width: 22, height: 22, borderRadius: "50%", border: "1.5px solid #E2E8F0", cursor: "pointer", padding: 0, overflow: "hidden" },
  colorInputSmall: { width: 28, height: 28, borderRadius: 6, border: "1.5px solid #E2E8F0", cursor: "pointer", padding: 0 },
  select: {
    padding: "5px 8px", border: "1.5px solid #E2E8F0", borderRadius: 8,
    fontSize: 12, background: "#fff", color: "#0F172A", outline: "none", cursor: "pointer"
  },
  iconBtn: {
    display: "flex", alignItems: "center", gap: 4, padding: "5px 10px",
    border: "1.5px solid #E2E8F0", borderRadius: 8, background: "#fff",
    fontSize: 12, color: "#475569", cursor: "pointer", fontFamily: "Inter,sans-serif"
  },
  iconBtnActive: { background: "#6C47FF", color: "#fff", border: "1.5px solid #6C47FF" },
  numInput: {
    width: 52, padding: "5px 8px", border: "1.5px solid #E2E8F0",
    borderRadius: 8, fontSize: 13, textAlign: "center", outline: "none"
  },
  footer: { borderTop: "1px solid #F1F4F9", paddingTop: 10, display: "flex", justifyContent: "flex-end" },
  deleteBtn: {
    display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
    background: "rgba(239,68,68,0.08)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)",
    borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer"
  }
};
