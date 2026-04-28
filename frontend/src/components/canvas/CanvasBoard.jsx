import React, { useState, useRef, useEffect, useCallback } from "react";
import { Rnd } from "react-rnd";
import html2canvas from "html2canvas";
import socketService from "../../services/socket";
import { api } from "../../services/api";
import useAuthStore from "../../stores/authStore";

export default function CanvasBoard({ boardId, onTitleNeeded, onListeningChange }) {
  const { user } = useAuthStore();
  const canvasRef = useRef(null);
  const drawRef   = useRef(null);

  // ── Canvas data ──
  const [strokes,  setStrokes]  = useState([]);
  const [shapes,   setShapes]   = useState([]);
  const [notes,    setNotes]    = useState([]);
  const [texts,    setTexts]    = useState([]);
  const [images,   setImages]   = useState([]);

  // ── Tool settings ──
  const [mode,        setMode]        = useState("select");
  const [penColor,    setPenColor]    = useState("#1e293b");
  const [penWidth,    setPenWidth]    = useState(3);
  const [penOpacity,  setPenOpacity]  = useState(1);
  const [isHighlight, setIsHighlight] = useState(false);
  const [eraserSize,  setEraserSize]  = useState(20);
  const [fillColor,   setFillColor]   = useState("#6C47FF");
  const [borderColor, setBorderColor] = useState("#4338ca");
  const [fontSize,    setFontSize]    = useState(16);
  const [fontFamily,  setFontFamily]  = useState("Inter, sans-serif");

  // ── Viewport ──
  const [zoom, setZoom] = useState(1);
  const [pan,  setPan]  = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart  = useRef({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);

  // ── Drawing ──
  const [currentStroke, setCurrentStroke] = useState(null);
  const isDrawing = useRef(false);

  // ── Selection ──
  const [selId,    setSelId]    = useState(null);
  const [selType,  setSelType]  = useState(null);
  const [toolbar,  setToolbar]  = useState(null);

  // ── History ──
  const [history,   setHistory]   = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // ── Collab ──
  const [roomUsers,     setRoomUsers]     = useState([]);
  const [remoteCursors, setRemoteCursors] = useState({});

  // ── UI ──
  const [saving,    setSaving]    = useState(false);
  const [chatOpen,  setChatOpen]  = useState(false);
  const [chatMsgs,  setChatMsgs]  = useState([]);
  const [chatInput, setChatInput] = useState("");

  // ── Voice ──
  const [isListening,   setIsListening]   = useState(false);
  const [voiceStatus,   setVoiceStatus]   = useState("");
  const [voiceTargetId, setVoiceTargetId] = useState(null);

  // Refs
  const saveTimer      = useRef(null);
  const recogRef       = useRef(null);
  const shouldRestart  = useRef(false);
  const voiceTargetRef = useRef(null);
  const rotateRef      = useRef(null);
  const fileInputRef   = useRef(null);

  // ── Always-fresh refs for voice (prevents stale closures) ──
  const notesRef   = useRef([]);
  const shapesRef  = useRef([]);
  const textsRef   = useRef([]);
  const selIdRef   = useRef(null);
  const selTypeRef = useRef(null);

  // Sync listening state to parent (for sidebar indicator)
  useEffect(() => { onListeningChange?.(isListening); }, [isListening, onListeningChange]);
  useEffect(() => { shapesRef.current  = shapes;  }, [shapes]);
  useEffect(() => { textsRef.current   = texts;   }, [texts]);
  useEffect(() => { selIdRef.current   = selId;   }, [selId]);
  useEffect(() => { selTypeRef.current = selType; }, [selType]);

  // ─────────────────────────────────────────────────
  // INIT BOARD
  // ─────────────────────────────────────────────────
  useEffect(() => {
    if (!boardId || boardId === "new") return;
    api.getBoard(boardId).then(b => {
      if (!b?.canvas_data) return;
      const cd = b.canvas_data;
      setStrokes(cd.strokes || []);
      setShapes(cd.shapes   || []);
      setNotes(cd.notes     || []);
      setTexts(cd.texts     || []);
      setImages(cd.images   || []);
    });
  }, [boardId]);

  // ─────────────────────────────────────────────────
  // SOCKET COLLABORATION
  // ─────────────────────────────────────────────────
  useEffect(() => {
    if (!boardId || boardId === "new" || !user) return;
    socketService.connect();
    socketService.joinBoard(boardId, user.id, user.name);
    socketService.onCanvasUpdate(data => {
      if (!data) return;
      setStrokes(data.strokes || []);
      setShapes(data.shapes   || []);
      setNotes(data.notes     || []);
      setTexts(data.texts     || []);
      setImages(data.images   || []);
    });
    socketService.onRoomUsers(us => setRoomUsers(us));
    socketService.onUserJoined(u  => setRoomUsers(p => [...p.filter(x => x.socketId !== u.socketId), u]));
    socketService.onUserLeft(({ socketId }) => setRoomUsers(p => p.filter(x => x.socketId !== socketId)));
    socketService.onCursorMove(({ socketId, name, color, x, y }) =>
      setRemoteCursors(p => ({ ...p, [socketId]: { name, color, x, y } })));
    socketService.onChatMessage(m => setChatMsgs(p => [...p, m]));
    return () => socketService.offAll();
  }, [boardId, user]);

  // ─────────────────────────────────────────────────
  // AUTO-SAVE (debounced)
  // ─────────────────────────────────────────────────
  const scheduleSave = useCallback(() => {
    if (!boardId || boardId === "new") return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      const data = { strokes, shapes, notes, texts, images };
      await api.saveCanvas(boardId, data);
      socketService.sendCanvasUpdate(data);
      setSaving(false);
    }, 2000);
  }, [boardId, strokes, shapes, notes, texts, images]);

  useEffect(() => { scheduleSave(); }, [strokes, shapes, notes, texts, images]);

  // ─────────────────────────────────────────────────
  // DRAW LAYER
  // ─────────────────────────────────────────────────
  const redraw = useCallback(() => {
    const cv = drawRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    strokes.forEach(s => {
      if (s.points.length < 2) return;
      ctx.save();
      if (s.highlight) {
        ctx.globalAlpha = 0.38;
        ctx.lineWidth   = s.width * 3.5;
      } else {
        ctx.globalAlpha = s.opacity ?? 1;
        ctx.lineWidth   = s.width;
      }
      ctx.strokeStyle = s.color;
      ctx.beginPath();
      s.points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.stroke();
      ctx.restore();
    });
    if (currentStroke && currentStroke.points.length > 1) {
      ctx.save();
      ctx.globalAlpha  = currentStroke.highlight ? 0.38 : (currentStroke.opacity ?? 1);
      ctx.lineWidth    = currentStroke.highlight ? currentStroke.width * 3.5 : currentStroke.width;
      ctx.strokeStyle  = currentStroke.color;
      ctx.beginPath();
      currentStroke.points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.stroke();
      ctx.restore();
    }
  }, [strokes, currentStroke]);

  useEffect(() => {
    const cv = drawRef.current;
    if (!cv) return;
    const obs = new ResizeObserver(() => {
      cv.width  = cv.offsetWidth;
      cv.height = cv.offsetHeight;
      redraw();
    });
    obs.observe(cv);
    return () => obs.disconnect();
  }, [redraw]);

  useEffect(() => { redraw(); }, [redraw]);

  // ─────────────────────────────────────────────────
  // HISTORY
  // ─────────────────────────────────────────────────
  const snap = useCallback(() => ({
    strokes: JSON.stringify(strokes), shapes: JSON.stringify(shapes),
    notes:   JSON.stringify(notes),   texts:  JSON.stringify(texts),
    images:  JSON.stringify(images)
  }), [strokes, shapes, notes, texts, images]);

  const saveState = useCallback(() => {
    setHistory(h => {
      const s    = snap();
      const last = h[h.length - 1];
      if (last && last.strokes === s.strokes && last.shapes === s.shapes) return h;
      return [...h.slice(-49), s];
    });
    setRedoStack([]);
  }, [snap]);

  const undo = useCallback(() => {
    setHistory(h => {
      if (!h.length) return h;
      const last = h[h.length - 1];
      setRedoStack(r => [...r, snap()]);
      setStrokes(JSON.parse(last.strokes));
      setShapes(JSON.parse(last.shapes));
      setNotes(JSON.parse(last.notes));
      setTexts(JSON.parse(last.texts));
      setImages(JSON.parse(last.images || "[]"));
      return h.slice(0, -1);
    });
  }, [snap]);

  const redo = useCallback(() => {
    setRedoStack(r => {
      if (!r.length) return r;
      const last = r[r.length - 1];
      setHistory(h => [...h, snap()]);
      setStrokes(JSON.parse(last.strokes));
      setShapes(JSON.parse(last.shapes));
      setNotes(JSON.parse(last.notes));
      setTexts(JSON.parse(last.texts));
      setImages(JSON.parse(last.images || "[]"));
      return r.slice(0, -1);
    });
  }, [snap]);

  // ─────────────────────────────────────────────────
  // KEYBOARD SHORTCUTS
  // ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = e => {
      const tag = document.activeElement?.tagName;
      const isEditing = tag === "INPUT" || tag === "TEXTAREA" ||
                        document.activeElement?.contentEditable === "true";
      if (isEditing) return;

      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); manualSave(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "=" || e.key === "+")) { e.preventDefault(); setZoom(z => Math.min(4, z + 0.1)); }
      if ((e.ctrlKey || e.metaKey) && e.key === "-") { e.preventDefault(); setZoom(z => Math.max(0.2, z - 0.1)); }
      if ((e.ctrlKey || e.metaKey) && e.key === "0") { e.preventDefault(); setZoom(1); setPan({ x: 0, y: 0 }); }
      if (e.key === "Delete" || e.key === "Backspace") deleteSelected();
      if (e.key === "Escape") { setSelId(null); setSelType(null); setToolbar(null); }
      if (e.key === "p") setMode("pen");
      if (e.key === "e") setMode("eraser");
      if (e.key === "v") setMode("select");
      if (e.key === "t") addText();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undo, redo, selId, selType]);

  // ─────────────────────────────────────────────────
  // CANVAS POINTER EVENTS
  // ─────────────────────────────────────────────────
  const ptFromEvent = e => {
    const rect = drawRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left)  / zoom,
      y: (e.clientY - rect.top)   / zoom
    };
  };

  const onPointerDown = e => {
    if (mode === "pen") {
      isDrawing.current = true;
      drawRef.current.setPointerCapture(e.pointerId);
      setCurrentStroke({ color: penColor, width: penWidth, opacity: penOpacity, highlight: isHighlight, points: [ptFromEvent(e)] });
    }
    if (mode === "eraser") {
      isDrawing.current = true;
      drawRef.current.setPointerCapture(e.pointerId);
      eraseAt(ptFromEvent(e));
    }
    if (mode === "pan") {
      isPanning.current = true;
      panStart.current  = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
    if (mode === "select" && e.target === drawRef.current) {
      setSelId(null); setSelType(null); setToolbar(null);
    }
  };

  const onPointerMove = e => {
    if (canvasRef.current) {
      const r = canvasRef.current.getBoundingClientRect();
      socketService.sendCursorMove(e.clientX - r.left, e.clientY - r.top);
    }
    if (mode === "pen" && isDrawing.current && currentStroke) {
      const p = ptFromEvent(e);
      setCurrentStroke(s => s ? { ...s, points: [...s.points, p] } : s);
    }
    if (mode === "eraser" && isDrawing.current) eraseAt(ptFromEvent(e));
    if (mode === "pan" && isPanning.current)
      setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
  };

  const onPointerUp = () => {
    if (mode === "pen" && currentStroke && currentStroke.points.length > 1) {
      saveState();
      setStrokes(s => [...s, currentStroke]);
      setCurrentStroke(null);
    }
    isDrawing.current = false;
    isPanning.current = false;
  };

  // Segment-based eraser — no staining
  const eraseAt = ({ x, y }) => {
    const r = eraserSize / zoom;
    setStrokes(prev => {
      const result = [];
      for (const stroke of prev) {
        let seg = [];
        for (const p of stroke.points) {
          if (Math.hypot(p.x - x, p.y - y) < r) {
            if (seg.length > 1) result.push({ ...stroke, points: [...seg] });
            seg = [];
          } else {
            seg.push(p);
          }
        }
        if (seg.length > 1) result.push({ ...stroke, points: seg });
      }
      return result;
    });
  };

  // ─────────────────────────────────────────────────
  // ZOOM — wheel only on canvas
  // ─────────────────────────────────────────────────
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const handler = e => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const rect  = el.getBoundingClientRect();
      const mx    = e.clientX - rect.left;
      const my    = e.clientY - rect.top;
      setZoom(z => {
        const nz = Math.min(4, Math.max(0.15, z * delta));
        setPan(p => ({
          x: mx - (mx - p.x) * (nz / z),
          y: my - (my - p.y) * (nz / z)
        }));
        return nz;
      });
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  // ─────────────────────────────────────────────────
  // ENTITIES — add / update / delete
  // ─────────────────────────────────────────────────
  const addShape = (type) => {
    saveState();
    const id = Date.now();
    setShapes(p => [...p, {
      id, type,
      x: 180 + Math.random() * 120, y: 140 + Math.random() * 100,
      width:  type === "Circle" ? 140 : 180,
      height: type === "Circle" ? 140 : 110,
      color: fillColor, borderColor, borderSize: 2,
      text: "", fontSize, fontFamily, fontColor: "#FFFFFF", rotation: 0
    }]);
    setSelId(id); setSelType("shape");
  };

  const addNote = (txt = "📝 Click to edit", bg = null) => {
    saveState();
    const id = Date.now();
    const bgColors = ["#FEF08A","#FCA5A5","#86EFAC","#93C5FD","#C4B5FD","#FCD34D"];
    setNotes(p => [...p, {
      id,
      x: 120 + Math.random() * 200, y: 120 + Math.random() * 160,
      width: 220, height: 180,
      text: txt,
      background: bg || bgColors[Math.floor(Math.random() * bgColors.length)],
      fontSize: 14, fontFamily: "Inter, sans-serif", fontColor: "#1e293b",
      bold: false, italic: false, align: "left", rotation: 0, shadow: true
    }]);
    setSelId(id); setSelType("note");
  };

  const addText = () => {
    saveState();
    const id = Date.now();
    setTexts(p => [...p, {
      id,
      x: 200 + Math.random() * 120, y: 200 + Math.random() * 100,
      width: 240, height: 60,
      text: "Click to edit",
      fontSize, fontFamily, color: penColor,
      bold: false, italic: false, underline: false,
      align: "left", rotation: 0
    }]);
    setSelId(id); setSelType("text");
  };

  const addImage = (src, w, h) => {
    saveState();
    const id = Date.now();
    setImages(p => [...p, {
      id, x: 150, y: 150,
      width: Math.min(w, 400), height: Math.min(h, 300),
      src, rotation: 0, opacity: 1
    }]);
    setSelId(id); setSelType("image");
  };

  const deleteSelected = useCallback(() => {
    saveState();
    if (selType === "shape") setShapes(p => p.filter(s => s.id !== selId));
    if (selType === "note")  setNotes(p  => p.filter(n => n.id !== selId));
    if (selType === "text")  setTexts(p  => p.filter(t => t.id !== selId));
    if (selType === "image") setImages(p => p.filter(i => i.id !== selId));
    setSelId(null); setSelType(null); setToolbar(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selId, selType]);

  const upShape = (id, props) => setShapes(p => p.map(s => s.id === id ? { ...s, ...props } : s));
  const upNote  = (id, props) => setNotes(p  => p.map(n => n.id === id ? { ...n, ...props } : n));
  const upText  = (id, props) => setTexts(p  => p.map(t => t.id === id ? { ...t, ...props } : t));
  const upImage = (id, props) => setImages(p => p.map(i => i.id === id ? { ...i, ...props } : i));

  const upActive = props => {
    if (selType === "shape") upShape(selId, props);
    if (selType === "note")  upNote(selId, props);
    if (selType === "text")  upText(selId, props);
    if (selType === "image") upImage(selId, props);
  };

  const getActiveObj = () => {
    if (selType === "shape") return shapes.find(s => s.id === selId);
    if (selType === "note")  return notes.find(n  => n.id === selId);
    if (selType === "text")  return texts.find(t  => t.id === selId);
    if (selType === "image") return images.find(i => i.id === selId);
    return null;
  };

  const showToolbarFor = (id, type, x, y, w) => {
    setSelId(id); setSelType(type);
    setToolbar({ x: x + w / 2, y: Math.max(y - 60, 10) });
  };

  // ─────────────────────────────────────────────────
  // ROTATION DRAG
  // ─────────────────────────────────────────────────
  const startRotate = (e, id, type) => {
    e.stopPropagation(); e.preventDefault();
    const move = ev => {
      const angle = Math.atan2(ev.clientY - window.innerHeight / 2, ev.clientX - window.innerWidth / 2) * (180 / Math.PI);
      if (type === "shape") upShape(id, { rotation: angle });
      if (type === "note")  upNote(id,  { rotation: angle });
      if (type === "text")  upText(id,  { rotation: angle });
      if (type === "image") upImage(id, { rotation: angle });
    };
    const up = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  // ─────────────────────────────────────────────────
  // SAVE / EXPORT
  // ─────────────────────────────────────────────────
  const manualSave = async () => {
    if (!boardId || boardId === "new") { onTitleNeeded?.(); return; }
    setSaving(true);
    await api.saveCanvas(boardId, { strokes, shapes, notes, texts, images });
    setSaving(false);
  };

  const exportPNG = async () => {
    if (!canvasRef.current) return;
    const captured = await html2canvas(canvasRef.current, { backgroundColor: "#ffffff", useCORS: true, scale: 2 });
    const a = document.createElement("a");
    a.download = "whiteboard.png";
    a.href = captured.toDataURL("image/png");
    a.click();
  };

  const clearCanvas = () => { saveState(); setStrokes([]); setShapes([]); setNotes([]); setTexts([]); setImages([]); };

  // ─────────────────────────────────────────────────
  // VOICE — stale-closure-free via always-fresh refs
  // ─────────────────────────────────────────────────

  // Keep always-fresh function refs so voice callbacks never go stale
  const undoRef      = useRef(null);
  const redoRef      = useRef(null);
  const addShapeRef  = useRef(null);
  const addNoteRef   = useRef(null);
  const addTextRef   = useRef(null);
  const manualSaveRef= useRef(null);
  const summarizeRef = useRef(null);
  const setModeRef   = useRef(null);
  const setZoomRef   = useRef(null);
  const setPanRef    = useRef(null);

  // These are updated every render, so voice callbacks read current values
  useEffect(() => {
    undoRef.current       = undo;
    redoRef.current       = redo;
    addShapeRef.current   = addShape;
    addNoteRef.current    = addNote;
    addTextRef.current    = addText;
    manualSaveRef.current = manualSave;
    summarizeRef.current  = summarize;
    setModeRef.current    = setMode;
    setZoomRef.current    = setZoom;
    setPanRef.current     = setPan;
  });

  // Command matcher — uses always-fresh refs, never stale
  const matchCommandRef = useRef(null);
  matchCommandRef.current = transcript => {
    const lo = transcript.toLowerCase()
      .trim()
      .replace(/[.,!?]+$/, "")
      .replace(/\s+/g, " ")
      .trim();

    const CMDS = [
      // Exact or contained commands
      { phrases: ["clear board","clear the board","erase everything","clean board","wipe board"],
        action: () => { saveState(); setStrokes([]); setShapes([]); setNotes([]); setTexts([]); setImages([]); } },
      { phrases: ["undo","undo that","go back","ctrl z"],
        action: () => undoRef.current?.() },
      { phrases: ["redo","redo that","go forward"],
        action: () => redoRef.current?.() },
      { phrases: ["add circle","new circle","draw circle","draw a circle"],
        action: () => addShapeRef.current?.("Circle") },
      { phrases: ["add rectangle","new rectangle","draw rectangle","draw a rectangle"],
        action: () => addShapeRef.current?.("Rectangle") },
      { phrases: ["add square","new square","draw square","draw a square"],
        action: () => addShapeRef.current?.("Square") },
      { phrases: ["add star","new star","draw star"],
        action: () => addShapeRef.current?.("Star") },
      { phrases: ["add diamond","new diamond","draw diamond"],
        action: () => addShapeRef.current?.("Diamond") },
      { phrases: ["add note","new note","sticky note","add sticky note","create note","make a note"],
        action: () => { voiceTargetRef.current = null; setVoiceTargetId(null); addNoteRef.current?.(); } },
      { phrases: ["add text","new text","text box","add text box","create text"],
        action: () => addTextRef.current?.() },
      { phrases: ["save","save board","save the board","save this"],
        action: () => manualSaveRef.current?.() },
      { phrases: ["zoom in"],  action: () => setZoomRef.current?.(z => Math.min(4, z + 0.25)) },
      { phrases: ["zoom out"], action: () => setZoomRef.current?.(z => Math.max(0.2, z - 0.25)) },
      { phrases: ["reset zoom","fit to screen","reset view","fit screen","zoom reset"],
        action: () => { setZoomRef.current?.(1); setPanRef.current?.({ x: 0, y: 0 }); } },
      { phrases: ["pen","pen mode","pen tool","draw mode","start drawing"],
        action: () => setModeRef.current?.("pen") },
      { phrases: ["eraser","eraser mode","erase mode","start erasing"],
        action: () => setModeRef.current?.("eraser") },
      { phrases: ["select","selection","select mode","move mode","pointer"],
        action: () => setModeRef.current?.("select") },
      { phrases: ["stop listening","stop voice","stop","mute","close microphone"],
        action: () => stopVoice() },
      { phrases: ["summarize","ai summary","summarize this","summarize board","make a summary"],
        action: () => summarizeRef.current?.() },
    ];

    for (const cmd of CMDS) {
      for (const phrase of cmd.phrases) {
        if (lo === phrase ||
            lo.startsWith(phrase + " ") ||
            lo.endsWith(" " + phrase) ||
            lo.includes(" " + phrase + " ")) {
          return cmd.action;
        }
      }
    }
    return null;
  };

  const stopVoice = useCallback(() => {
    shouldRestart.current  = false;
    voiceTargetRef.current = null;
    setVoiceTargetId(null);
    setIsListening(false);
    setVoiceStatus("");
    try { recogRef.current?.abort(); } catch {}
    recogRef.current = null;
  }, []);

  const startVoice = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert("Speech recognition is not supported.\nUse Chrome, Edge, or Safari on desktop.");
      return;
    }

    // Abort any running instance
    try { recogRef.current?.abort(); } catch {}
    recogRef.current = null;

    const r = new SR();
    recogRef.current = r;

    r.lang            = navigator.language || "en-US";
    r.continuous      = true;
    r.interimResults  = true;
    r.maxAlternatives = 1;

    r.onstart = () => {
      setIsListening(true);
      setVoiceStatus("🎤 Listening…");
    };

    r.onend = () => {
      if (shouldRestart.current) {
        // Brief pause then restart — handles browser auto-stop
        setTimeout(() => {
          if (!shouldRestart.current) return;
          try {
            const r2 = new SR();
            recogRef.current = r2;
            r2.lang            = navigator.language || "en-US";
            r2.continuous      = true;
            r2.interimResults  = true;
            r2.maxAlternatives = 1;
            r2.onstart   = r.onstart;
            r2.onend     = r.onend;
            r2.onerror   = r.onerror;
            r2.onresult  = r.onresult;
            r2.start();
          } catch { /* ignore race conditions */ }
        }, 300);
      } else {
        setIsListening(false);
        setVoiceStatus("");
      }
    };

    r.onerror = ev => {
      if (ev.error === "no-speech") return;  // normal silence, just keep going
      if (ev.error === "aborted")   return;  // we triggered this
      if (ev.error === "not-allowed") {
        alert("Microphone access denied.\nGo to browser settings → Site Settings → Microphone → Allow.");
        shouldRestart.current = false;
        setIsListening(false);
        setVoiceStatus("");
        return;
      }
      // network / service-not-allowed / audio-capture — log but don't crash
      console.warn("[Voice] Error:", ev.error);
      setVoiceStatus("⚠️ " + ev.error);
      setTimeout(() => {
        if (shouldRestart.current) setVoiceStatus("🎤 Listening…");
      }, 2000);
    };

    r.onresult = ev => {
      let interim   = "";
      let finalText = "";

      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        // Try each alternative for best match
        const best = Array.from({ length: ev.results[i].length },
          (_, j) => ev.results[i][j].transcript).join(" / ");
        const primary = ev.results[i][0].transcript;

        if (ev.results[i].isFinal) {
          finalText += primary + " ";
        } else {
          interim = primary;
        }
      }

      // Live preview while speaking
      if (interim) {
        setVoiceStatus("🎤 " + interim.slice(0, 60));
      }

      if (!finalText.trim()) return;
      const transcript = finalText.trim();

      // ── Try command ──
      const cmdFn = matchCommandRef.current?.(transcript);
      if (cmdFn) {
        cmdFn();
        setVoiceStatus("✅ " + transcript.slice(0, 50));
        setTimeout(() => { if (shouldRestart.current) setVoiceStatus("🎤 Listening…"); }, 2000);
        return;
      }

      // ── Dictation ── write into selected / voice-target / new note
      const curSelId   = selIdRef.current;
      const curSelType = selTypeRef.current;
      const targetId   = voiceTargetRef.current;

      const appendText = (prev, incoming) =>
        prev ? prev.trimEnd() + " " + incoming : incoming;

      if (curSelType === "note" && curSelId) {
        setNotes(p => p.map(n =>
          n.id === curSelId ? { ...n, text: appendText(n.text, transcript) } : n));
        setVoiceStatus("📝 → selected note");

      } else if (curSelType === "text" && curSelId) {
        setTexts(p => p.map(t =>
          t.id === curSelId ? { ...t, text: appendText(t.text, transcript) } : t));
        setVoiceStatus("📝 → selected text");

      } else if (curSelType === "shape" && curSelId) {
        setShapes(p => p.map(s =>
          s.id === curSelId ? { ...s, text: appendText(s.text, transcript) } : s));
        setVoiceStatus("📝 → selected shape");

      } else if (targetId) {
        setNotes(p => p.map(n =>
          n.id === targetId ? { ...n, text: appendText(n.text, transcript) } : n));
        setVoiceStatus("📝 appended to note");

      } else {
        // Fresh voice note
        const newId = Date.now();
        voiceTargetRef.current = newId;
        setVoiceTargetId(newId);
        setNotes(p => [...p, {
          id: newId,
          x: 160 + Math.random() * 200,
          y: 140 + Math.random() * 160,
          width: 300, height: 180,
          text: transcript,
          background: "#BAE6FD",
          fontSize: 15,
          fontFamily: "Inter, sans-serif",
          fontColor: "#0C4A6E",
          bold: false, italic: false,
          align: "left", rotation: 0, shadow: true
        }]);
        setVoiceStatus("🗒 New voice note created");
      }

      setTimeout(() => { if (shouldRestart.current) setVoiceStatus("🎤 Listening…"); }, 2200);
    };

    try {
      r.start();
      shouldRestart.current = true;
    } catch (err) {
      console.error("[Voice] Could not start:", err);
      setVoiceStatus("❌ Could not start microphone");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopVoice]);

  const toggleVoice = useCallback(() => {
    if (isListening) {
      stopVoice();
    } else {
      voiceTargetRef.current = null;
      setVoiceTargetId(null);
      startVoice();
    }
  }, [isListening, startVoice, stopVoice]);

  // ─────────────────────────────────────────────────
  // AI SUMMARIZE
  // ─────────────────────────────────────────────────
  const summarize = async () => {
    const allText = [
      ...notes.map(n  => n.text  || ""),
      ...shapes.map(s => s.text  || ""),
      ...texts.map(t  => t.text  || "")
    ].join(" ").replace(/\s+/g, " ").trim();

    if (allText.length < 10) {
      addNote("⚠️ Add some text content to the board first, then tap AI Summary.");
      return;
    }

    const loadId = Date.now();
    setNotes(p => [...p, {
      id: loadId, x: 220, y: 200, width: 280, height: 180,
      text: "⏳ AI is summarizing…",
      background: "#F0FDF4", fontSize: 14,
      fontFamily: "Inter, sans-serif", fontColor: "#166534",
      bold: false, italic: false, align: "left", rotation: 0, shadow: true
    }]);

    try {
      const res = await api.summarize(allText);
      setNotes(p => p.map(n =>
        n.id === loadId ? { ...n, text: res?.result || "No summary returned." } : n
      ));
    } catch {
      setNotes(p => p.map(n =>
        n.id === loadId ? { ...n, text: "❌ Summary failed. Check your connection." } : n
      ));
    }
  };

  // ─────────────────────────────────────────────────
  // IMAGE UPLOAD + PASTE
  // ─────────────────────────────────────────────────
  const handleFileUpload = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => addImage(ev.target.result, img.naturalWidth, img.naturalHeight);
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  useEffect(() => {
    const pasteHandler = e => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = ev => {
            const img = new Image();
            img.onload = () => addImage(ev.target.result, img.naturalWidth, img.naturalHeight);
            img.src = ev.target.result;
          };
          reader.readAsDataURL(item.getAsFile());
        }
      }
    };
    window.addEventListener("paste", pasteHandler);
    return () => window.removeEventListener("paste", pasteHandler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─────────────────────────────────────────────────
  // EXPOSE API FOR SIDEBAR
  // ─────────────────────────────────────────────────
  useEffect(() => {
    window.wb = {
      setMode, addShape, addNote, addText,
      undo, redo, clearCanvas, manualSave, exportPNG,
      toggleVoice, summarize,
      setPenColor, setPenWidth, setPenOpacity, setIsHighlight,
      setEraserSize, setFillColor, setBorderColor,
      setFontSize, setFontFamily,
      uploadImage: () => fileInputRef.current?.click(),
      getMode:     () => mode,
      resetView:   () => { setZoom(1); setPan({ x: 0, y: 0 }); },
      zoomIn:      () => setZoom(z => Math.min(4, z + 0.1)),
      zoomOut:     () => setZoom(z => Math.max(0.2, z - 0.1)),
      setShowGrid,
      isListening: () => isListening,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, zoom, isListening, strokes, shapes, notes, texts, images]);

  // ─────────────────────────────────────────────────
  // SHAPE RENDERER
  // ─────────────────────────────────────────────────
  const renderShape = shape => {
    const rot = shape.rotation || 0;
    const base = {
      width: "100%", height: "100%",
      display: "flex", alignItems: "center", justifyContent: "center",
      transform: `rotate(${rot}deg)`, overflow: "hidden"
    };
    const fill = {
      background: shape.color,
      border: `${shape.borderSize}px solid ${shape.borderColor}`
    };
    const inputSt = {
      background: "transparent", border: "none", outline: "none",
      color: shape.fontColor, fontSize: shape.fontSize,
      fontFamily: shape.fontFamily, textAlign: "center",
      width: "80%", fontWeight: "600", cursor: "text"
    };
    const clips = {
      Triangle:  "polygon(50% 0%,100% 100%,0% 100%)",
      Pentagon:  "polygon(50% 0%,100% 38%,82% 100%,18% 100%,0% 38%)",
      Hexagon:   "polygon(25% 0%,75% 0%,100% 50%,75% 100%,25% 100%,0% 50%)",
      Octagon:   "polygon(30% 0%,70% 0%,100% 30%,100% 70%,70% 100%,30% 100%,0% 70%,0% 30%)",
      Star:      "polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)",
      Heart:     "polygon(10% 30%,50% 0%,90% 30%,100% 65%,50% 100%,0% 65%)",
      Arrow:     "polygon(0% 20%,60% 20%,60% 0%,100% 50%,60% 100%,60% 80%,0% 80%)"
    };

    if (shape.type === "Circle") {
      return <div style={{ ...base, ...fill, borderRadius: "50%" }}>
        <input value={shape.text || ""} onChange={e => upShape(shape.id, { text: e.target.value })} style={inputSt}/>
      </div>;
    }
    if (shape.type === "Diamond") {
      return <div style={{ ...base, transform: `rotate(${rot + 45}deg)`, ...fill }}>
        <div style={{ transform: "rotate(-45deg)" }}>
          <input value={shape.text || ""} onChange={e => upShape(shape.id, { text: e.target.value })} style={inputSt}/>
        </div>
      </div>;
    }
    if (clips[shape.type]) {
      return <div style={{ ...base, ...fill, clipPath: clips[shape.type] }}>
        <input value={shape.text || ""} onChange={e => upShape(shape.id, { text: e.target.value })} style={inputSt}/>
      </div>;
    }
    return <div style={{ ...base, ...fill, borderRadius: shape.type === "Square" ? 10 : shape.type === "RoundRect" ? 20 : 4 }}>
      <input value={shape.text || ""} onChange={e => upShape(shape.id, { text: e.target.value })} style={inputSt}/>
    </div>;
  };

  const getCursor = () => {
    if (mode === "pen")    return "crosshair";
    if (mode === "eraser") return "cell";
    if (mode === "pan")    return isPanning.current ? "grabbing" : "grab";
    if (mode === "text")   return "text";
    return "default";
  };

  // ─────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────
  return (
    <div style={ST.wrap}>
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileUpload}/>

      {/* TOP BAR */}
      <div style={ST.topBar}>
        <div style={ST.tbLeft}>
          <span style={ST.boardLabel}>📋 Board</span>
          {saving && <span style={ST.savePill}>Saving…</span>}
        </div>
        <div style={ST.tbRight}>
          {roomUsers.length > 0 && (
            <div style={{ display: "flex" }}>
              {roomUsers.slice(0, 5).map((u, i) => (
                <div key={i} title={u.name} style={{
                  ...ST.onlineAvatar, background: u.color || "#6C47FF",
                  marginLeft: i ? -8 : 0
                }}>{u.name?.[0]?.toUpperCase()}</div>
              ))}
            </div>
          )}
          <button className="wb-btn" onClick={() => setChatOpen(x => !x)}>💬</button>
          <button className="wb-btn" onClick={manualSave}>💾 Save</button>
          <button className="wb-btn" onClick={exportPNG}>⬇️ Export</button>
          <div style={ST.zoomBox}>
            <button className="wb-btn-sm" onClick={() => setZoom(z => Math.max(0.15, z - 0.1))}>−</button>
            <span style={ST.zoomLbl}>{Math.round(zoom * 100)}%</span>
            <button className="wb-btn-sm" onClick={() => setZoom(z => Math.min(4, z + 0.1))}>+</button>
            <button className="wb-btn-sm" title="Fit" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>⊡</button>
          </div>
          <button className="wb-btn" style={{ opacity: showGrid ? 1 : 0.4 }} onClick={() => setShowGrid(x => !x)}>⊞</button>
        </div>
      </div>

      {/* WORK AREA */}
      <div style={ST.workArea}>

        {/* CANVAS — only this zooms */}
        <div
          ref={canvasRef}
          style={{
            ...ST.canvas,
            cursor: getCursor(),
            backgroundImage: showGrid
              ? "linear-gradient(to right,#e2e8f0 1px,transparent 1px),linear-gradient(to bottom,#e2e8f0 1px,transparent 1px)"
              : "none",
            backgroundSize: showGrid ? `${32 * zoom}px ${32 * zoom}px` : undefined,
            backgroundPosition: showGrid ? `${pan.x % (32 * zoom)}px ${pan.y % (32 * zoom)}px` : undefined
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onClick={e => {
            if (mode === "text" && e.target === canvasRef.current) {
              const rect = canvasRef.current.getBoundingClientRect();
              saveState();
              const id = Date.now();
              setTexts(p => [...p, {
                id,
                x: (e.clientX - rect.left - pan.x) / zoom,
                y: (e.clientY - rect.top  - pan.y) / zoom,
                width: 220, height: 56,
                text: "", fontSize, fontFamily,
                color: penColor, bold: false, italic: false,
                underline: false, align: "left", rotation: 0
              }]);
              setSelId(id); setSelType("text");
            }
          }}
        >
          {/* Transform container — pan + zoom */}
          <div style={{
            position: "absolute", inset: 0,
            transformOrigin: "0 0",
            transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`
          }}>
            {/* Draw layer */}
            <canvas
              ref={drawRef}
              style={{
                position: "absolute", inset: 0,
                width: "100%", height: "100%",
                pointerEvents: (mode === "pen" || mode === "eraser") ? "auto" : "none",
                zIndex: 1, touchAction: "none"
              }}
            />

            {/* SHAPES */}
            {shapes.map(shape => (
              <Rnd key={shape.id}
                position={{ x: shape.x, y: shape.y }}
                size={{ width: shape.width, height: shape.height }}
                onDragStop={(_, d) => { saveState(); upShape(shape.id, { x: d.x, y: d.y }); }}
                onResizeStop={(_, __, ref, ___, pos) => {
                  saveState();
                  upShape(shape.id, { width: parseInt(ref.style.width), height: parseInt(ref.style.height), ...pos });
                }}
                onClick={e => { e.stopPropagation(); showToolbarFor(shape.id, "shape", shape.x, shape.y, shape.width); }}
                disableDragging={mode === "pen" || mode === "eraser"}
                style={{ zIndex: selId === shape.id ? 30 : 10 }}
              >
                <div style={{ position: "relative", width: "100%", height: "100%",
                  outline: selId === shape.id ? "2px solid #6C47FF" : "none", outlineOffset: 2, borderRadius: 4 }}>
                  {renderShape(shape)}
                  {selId === shape.id && <RotHandle onMouseDown={e => startRotate(e, shape.id, "shape")}/>}
                </div>
              </Rnd>
            ))}

            {/* NOTES */}
            {notes.map(note => (
              <Rnd key={note.id}
                position={{ x: note.x, y: note.y }}
                size={{ width: note.width, height: note.height }}
                onDragStop={(_, d) => { saveState(); upNote(note.id, { x: d.x, y: d.y }); }}
                onResizeStop={(_, __, ref, ___, pos) => {
                  saveState();
                  upNote(note.id, { width: parseInt(ref.style.width), height: parseInt(ref.style.height), ...pos });
                }}
                onClick={e => { e.stopPropagation(); showToolbarFor(note.id, "note", note.x, note.y, note.width); }}
                disableDragging={mode === "pen" || mode === "eraser"}
                style={{ zIndex: selId === note.id ? 30 : 10 }}
              >
                <div style={{ position: "relative", width: "100%", height: "100%" }}>
                  <textarea
                    value={note.text || ""}
                    onChange={e => upNote(note.id, { text: e.target.value })}
                    style={{
                      width: "100%", height: "100%",
                      background: note.background,
                      padding: 12, fontSize: note.fontSize, fontFamily: note.fontFamily,
                      color: note.fontColor,
                      fontWeight: note.bold ? "bold" : "normal",
                      fontStyle:  note.italic ? "italic" : "normal",
                      textAlign:  note.align,
                      transform:  `rotate(${note.rotation || 0}deg)`,
                      boxShadow:  note.shadow ? "4px 6px 20px rgba(0,0,0,0.18)" : "none",
                      borderRadius: 12,
                      border: selId === note.id
                        ? "2px solid #6C47FF"
                        : voiceTargetId === note.id
                          ? "2px dashed #10B981"
                          : "1.5px solid rgba(0,0,0,0.07)",
                      outline: "none", resize: "none", cursor: "text"
                    }}
                  />
                  {selId === note.id && <RotHandle onMouseDown={e => startRotate(e, note.id, "note")}/>}
                  {/* Voice target indicator */}
                  {voiceTargetId === note.id && (
                    <div style={{ position: "absolute", top: -20, left: 0,
                      background: "#10B981", color: "#fff", fontSize: 10,
                      padding: "2px 8px", borderRadius: 99, whiteSpace: "nowrap" }}>
                      🎤 Dictating here
                    </div>
                  )}
                </div>
              </Rnd>
            ))}

            {/* TEXTS */}
            {texts.map(txt => (
              <Rnd key={txt.id}
                position={{ x: txt.x, y: txt.y }}
                size={{ width: txt.width, height: txt.height }}
                onDragStop={(_, d) => { saveState(); upText(txt.id, { x: d.x, y: d.y }); }}
                onResizeStop={(_, __, ref, ___, pos) => {
                  saveState();
                  upText(txt.id, { width: parseInt(ref.style.width), height: parseInt(ref.style.height), ...pos });
                }}
                onClick={e => { e.stopPropagation(); showToolbarFor(txt.id, "text", txt.x, txt.y, txt.width); }}
                disableDragging={mode === "pen" || mode === "eraser"}
                style={{ zIndex: selId === txt.id ? 30 : 10 }}
              >
                <div style={{ position: "relative", width: "100%", height: "100%" }}>
                  <div
                    contentEditable suppressContentEditableWarning
                    onBlur={e => upText(txt.id, { text: e.currentTarget.innerText })}
                    style={{
                      width: "100%", height: "100%",
                      fontSize: txt.fontSize, fontFamily: txt.fontFamily, color: txt.color,
                      fontWeight:     txt.bold      ? "bold"      : "normal",
                      fontStyle:      txt.italic    ? "italic"    : "normal",
                      textDecoration: txt.underline ? "underline" : "none",
                      textAlign:      txt.align,
                      transform: `rotate(${txt.rotation || 0}deg)`,
                      outline:   selId === txt.id ? "1.5px dashed #6C47FF" : "none",
                      cursor: "text", padding: "4px 6px", whiteSpace: "pre-wrap", minHeight: 32
                    }}
                  >{txt.text}</div>
                  {selId === txt.id && <RotHandle onMouseDown={e => startRotate(e, txt.id, "text")}/>}
                </div>
              </Rnd>
            ))}

            {/* IMAGES */}
            {images.map(img => (
              <Rnd key={img.id}
                position={{ x: img.x, y: img.y }}
                size={{ width: img.width, height: img.height }}
                onDragStop={(_, d) => { saveState(); upImage(img.id, { x: d.x, y: d.y }); }}
                onResizeStop={(_, __, ref, ___, pos) => {
                  saveState();
                  upImage(img.id, { width: parseInt(ref.style.width), height: parseInt(ref.style.height), ...pos });
                }}
                onClick={e => { e.stopPropagation(); showToolbarFor(img.id, "image", img.x, img.y, img.width); }}
                disableDragging={mode === "pen" || mode === "eraser"}
                style={{ zIndex: selId === img.id ? 30 : 10 }}
                lockAspectRatio
              >
                <div style={{ position: "relative", width: "100%", height: "100%" }}>
                  <img src={img.src} alt="" draggable={false} style={{
                    width: "100%", height: "100%", objectFit: "contain",
                    transform: `rotate(${img.rotation || 0}deg)`,
                    opacity: img.opacity ?? 1,
                    outline: selId === img.id ? "2px solid #6C47FF" : "none",
                    borderRadius: 6, userSelect: "none"
                  }}/>
                  {selId === img.id && <RotHandle onMouseDown={e => startRotate(e, img.id, "image")}/>}
                </div>
              </Rnd>
            ))}

            {/* REMOTE CURSORS */}
            {Object.entries(remoteCursors).map(([sid, c]) => (
              <div key={sid} style={{ position: "absolute", left: c.x / zoom, top: c.y / zoom, pointerEvents: "none", zIndex: 999 }}>
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path d="M0 0L0 14L4 10L7 17L9 16L6 9L12 9Z" fill={c.color || "#6C47FF"}/>
                </svg>
                <div style={{ background: c.color, color: "#fff", fontSize: 10, padding: "2px 6px", borderRadius: 99, whiteSpace: "nowrap", marginTop: 1 }}>
                  {c.name}
                </div>
              </div>
            ))}
          </div>

          {/* VOICE STATUS BAR */}
          {isListening && (
            <div style={ST.voiceBar}>
              <span style={ST.voiceDot}/>
              <span>{voiceStatus || "🎤 Listening…"}</span>
              <button onClick={stopVoice} style={ST.voiceStop}>Stop</button>
            </div>
          )}
        </div>

        {/* CHAT PANEL */}
        {chatOpen && (
          <div style={ST.chatPanel}>
            <div style={ST.chatHead}>
              <b style={{ fontSize: 13 }}>💬 Team Chat</b>
              <button className="wb-btn-sm" onClick={() => setChatOpen(false)}>✕</button>
            </div>
            <div style={ST.chatBody}>
              {chatMsgs.length === 0 && (
                <div style={{ color: "#94A3B8", fontSize: 12, textAlign: "center", marginTop: 20 }}>No messages yet</div>
              )}
              {chatMsgs.map(m => (
                <div key={m.id} style={ST.chatMsg}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#6C47FF" }}>{m.userName}</span>
                  <div style={ST.chatBubble}>{m.message}</div>
                  <span style={{ fontSize: 10, color: "#CBD5E1" }}>{m.time}</span>
                </div>
              ))}
            </div>
            <input className="wb-input" placeholder="Message… Enter to send"
              value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && chatInput.trim()) {
                  socketService.sendChatMessage(chatInput.trim(), user?.name || "You");
                  setChatInput("");
                }
              }}
              style={{ margin: "0 8px 8px", width: "calc(100% - 16px)" }}
            />
          </div>
        )}
      </div>

      {/* FLOATING TOOLBAR */}
      {toolbar && selId && getActiveObj() && (
        <FloatingToolbar
          obj={getActiveObj()} type={selType}
          x={toolbar.x} y={toolbar.y}
          onUpdate={upActive}
          onDelete={deleteSelected}
          onClose={() => setToolbar(null)}
        />
      )}
    </div>
  );
}

// ── Rotate handle ──
function RotHandle({ onMouseDown }) {
  return (
    <div onMouseDown={onMouseDown} style={{
      position: "absolute", top: -26, left: "50%", transform: "translateX(-50%)",
      width: 22, height: 22, borderRadius: "50%",
      background: "#6C47FF", color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      cursor: "grab", fontSize: 13, userSelect: "none",
      boxShadow: "0 2px 8px rgba(108,71,255,0.4)", zIndex: 40
    }}>↻</div>
  );
}

// ── Floating Toolbar ──
function FloatingToolbar({ obj, type, x, y, onUpdate, onDelete, onClose }) {
  const [tab, setTab] = useState("style");
  const isNote  = type === "note";
  const isShape = type === "shape";
  const isText  = type === "text";
  const isImage = type === "image";

  const NOTE_BG = ["#FEF08A","#FCA5A5","#86EFAC","#93C5FD","#C4B5FD","#FCD34D","#6EE7B7","#F9A8D4","#E0E7FF","#FFFFFF"];
  const COLORS  = ["#1e293b","#6C47FF","#3B82F6","#10B981","#F59E0B","#EF4444","#EC4899","#8B5CF6","#FFFFFF","#000000"];
  const FONTS   = ["Inter, sans-serif","Georgia, serif","'Courier New', monospace","Verdana, sans-serif","Impact, sans-serif","'Times New Roman', serif"];

  const tbX = Math.min(Math.max(x - 150, 8), window.innerWidth - 316);
  const tbY = Math.max(y, 70);

  const tabs = isImage ? ["image", "layout"] : ["style", "text", "layout"];

  return (
    <div style={{
      position: "fixed", left: tbX, top: tbY, zIndex: 9999,
      background: "#fff", border: "1px solid #E2E8F0",
      borderRadius: 14, boxShadow: "0 16px 48px rgba(0,0,0,0.18)",
      width: 300, userSelect: "none", animation: "tbFadeIn 0.15s ease"
    }}>
      {/* Tabs */}
      <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid #F1F4F9", padding: "8px 10px 0" }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "5px 10px", border: "none", borderRadius: 8,
            background: tab === t ? "#EEF2FF" : "transparent",
            color: tab === t ? "#6C47FF" : "#94A3B8",
            fontSize: 12, fontWeight: 600, cursor: "pointer"
          }}>{t[0].toUpperCase() + t.slice(1)}</button>
        ))}
        <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#94A3B8" }}>✕</button>
      </div>

      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>

        {/* STYLE */}
        {tab === "style" && !isImage && (
          <>
            {(isNote || isShape) && (
              <FRow label={isNote ? "Background" : "Fill"}>
                {(isNote ? NOTE_BG : COLORS).map(c => (
                  <ColorDot key={c} color={c}
                    active={(isNote ? obj.background : obj.color) === c}
                    onClick={() => onUpdate(isNote ? { background: c } : { color: c })}/>
                ))}
                <input type="color" onChange={e => onUpdate(isNote ? { background: e.target.value } : { color: e.target.value })}
                  style={SS.colorIn}/>
              </FRow>
            )}
            {isShape && (
              <FRow label="Border">
                <input type="color" value={obj.borderColor || "#000"} onChange={e => onUpdate({ borderColor: e.target.value })} style={SS.colorIn}/>
                <select value={obj.borderSize || 2} onChange={e => onUpdate({ borderSize: Number(e.target.value) })} style={SS.sel}>
                  {[0,1,2,3,4,6].map(v => <option key={v} value={v}>{v}px</option>)}
                </select>
              </FRow>
            )}
            <FRow label="Text Color">
              {COLORS.slice(0, 7).map(c => (
                <ColorDot key={c} color={c} active={false}
                  onClick={() => onUpdate({ fontColor: c, color: c })}/>
              ))}
              <input type="color" onChange={e => onUpdate({ fontColor: e.target.value, color: e.target.value })} style={SS.colorIn}/>
            </FRow>
            <FRow label="Opacity">
              <input type="range" min={10} max={100} defaultValue={Math.round((obj.opacity ?? 1) * 100)}
                onChange={e => onUpdate({ opacity: Number(e.target.value) / 100 })} style={{ flex: 1 }}/>
            </FRow>
          </>
        )}

        {/* IMAGE STYLE */}
        {tab === "image" && isImage && (
          <FRow label="Opacity">
            <input type="range" min={10} max={100} defaultValue={Math.round((obj.opacity ?? 1) * 100)}
              onChange={e => onUpdate({ opacity: Number(e.target.value) / 100 })} style={{ flex: 1 }}/>
          </FRow>
        )}

        {/* TEXT */}
        {tab === "text" && !isImage && (
          <>
            <FRow label="Font">
              <select value={obj.fontFamily || "Inter, sans-serif"} onChange={e => onUpdate({ fontFamily: e.target.value })} style={{ ...SS.sel, flex: 1 }}>
                {FONTS.map(f => <option key={f} value={f}>{f.split(",")[0].replace(/'/g, "")}</option>)}
              </select>
            </FRow>
            <FRow label="Size">
              <button style={SS.iconBtn} onClick={() => onUpdate({ fontSize: Math.max(8, (obj.fontSize || 16) - 1) })}>A−</button>
              <input type="number" min={8} max={120} value={obj.fontSize || 16}
                onChange={e => onUpdate({ fontSize: Number(e.target.value) })} style={SS.numIn}/>
              <button style={SS.iconBtn} onClick={() => onUpdate({ fontSize: Math.min(120, (obj.fontSize || 16) + 1) })}>A+</button>
            </FRow>
            <FRow label="Style">
              <button style={{ ...SS.iconBtn, ...(obj.bold ? SS.on : {}) }} onClick={() => onUpdate({ bold: !obj.bold })}>B</button>
              <button style={{ ...SS.iconBtn, ...(obj.italic ? SS.on : {}) }} onClick={() => onUpdate({ italic: !obj.italic })}>I</button>
              {isText && <button style={{ ...SS.iconBtn, ...(obj.underline ? SS.on : {}) }} onClick={() => onUpdate({ underline: !obj.underline })}>U</button>}
            </FRow>
            <FRow label="Align">
              {["left","center","right"].map(a => (
                <button key={a} style={{ ...SS.iconBtn, ...(obj.align === a ? SS.on : {}) }}
                  onClick={() => onUpdate({ align: a })}>
                  {a === "left" ? "⬅" : a === "center" ? "↔" : "➡"}
                </button>
              ))}
            </FRow>
          </>
        )}

        {/* LAYOUT */}
        {tab === "layout" && (
          <>
            <FRow label="Rotation">
              <input type="range" min={-180} max={180} value={obj.rotation || 0}
                onChange={e => onUpdate({ rotation: Number(e.target.value) })} style={{ flex: 1 }}/>
              <span style={{ fontSize: 11, color: "#64748B", minWidth: 36 }}>{Math.round(obj.rotation || 0)}°</span>
            </FRow>
            {isNote && (
              <FRow label="Shadow">
                <button style={{ ...SS.iconBtn, ...(obj.shadow ? SS.on : {}) }} onClick={() => onUpdate({ shadow: !obj.shadow })}>
                  {obj.shadow ? "On" : "Off"}
                </button>
              </FRow>
            )}
            <FRow label="">
              <button style={SS.iconBtn} onClick={() => onUpdate({ rotation: 0 })}>Reset rotation</button>
            </FRow>
          </>
        )}

        {/* Delete */}
        <div style={{ borderTop: "1px solid #F1F4F9", paddingTop: 8, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onDelete} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
            background: "rgba(239,68,68,0.08)", color: "#EF4444",
            border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8,
            fontSize: 12, fontWeight: 600, cursor: "pointer"
          }}>🗑 Delete</button>
        </div>
      </div>
    </div>
  );
}

function FRow({ label, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      {label && <span style={{ fontSize: 10, fontWeight: 700, color: "#64748B", width: 58, flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>}
      <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>{children}</div>
    </div>
  );
}

function ColorDot({ color, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: 22, height: 22, borderRadius: "50%", background: color, cursor: "pointer",
      border: active ? "2.5px solid #6C47FF" : "1.5px solid #E2E8F0",
      flexShrink: 0, transition: "transform 0.1s"
    }}/>
  );
}

const SS = {
  sel:     { padding: "4px 6px", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 12, background: "#fff", color: "#0F172A", outline: "none", cursor: "pointer" },
  iconBtn: { display: "flex", alignItems: "center", gap: 3, padding: "5px 10px", border: "1.5px solid #E2E8F0", borderRadius: 8, background: "#fff", fontSize: 12, color: "#475569", cursor: "pointer" },
  on:      { background: "#6C47FF", color: "#fff", border: "1.5px solid #6C47FF" },
  numIn:   { padding: "4px 6px", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 13, textAlign: "center", outline: "none", width: 52 },
  colorIn: { width: 22, height: 22, borderRadius: "50%", border: "1.5px solid #E2E8F0", cursor: "pointer", padding: 0, flexShrink: 0 }
};

const ST = {
  wrap:        { display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "#F8F9FB" },
  topBar:      { height: 48, background: "#fff", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", flexShrink: 0, gap: 8 },
  tbLeft:      { display: "flex", alignItems: "center", gap: 10 },
  boardLabel:  { fontSize: 13, fontWeight: 600, color: "#0F172A" },
  savePill:    { fontSize: 11, color: "#10B981", background: "#F0FDF4", padding: "3px 8px", borderRadius: 99, border: "1px solid #BBF7D0" },
  tbRight:     { display: "flex", alignItems: "center", gap: 6 },
  onlineAvatar:{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", border: "2px solid #fff" },
  zoomBox:     { display: "flex", alignItems: "center", gap: 3, background: "#F1F4F9", borderRadius: 8, padding: "3px 6px" },
  zoomLbl:     { fontSize: 11, fontWeight: 700, color: "#475569", minWidth: 38, textAlign: "center" },
  workArea:    { flex: 1, display: "flex", overflow: "hidden" },
  canvas:      { flex: 1, position: "relative", overflow: "hidden", background: "#fff" },
  voiceBar:    {
    position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
    background: "rgba(15,23,42,0.88)", color: "#fff",
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 18px", borderRadius: 999,
    fontSize: 13, fontWeight: 500, zIndex: 999,
    backdropFilter: "blur(8px)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
    maxWidth: "80%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
  },
  voiceDot:    { width: 8, height: 8, borderRadius: "50%", background: "#10B981", display: "inline-block", animation: "pulse 1.2s infinite", flexShrink: 0 },
  voiceStop:   { marginLeft: 8, padding: "4px 12px", background: "#EF4444", border: "none", borderRadius: 999, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 },
  chatPanel:   { width: 260, background: "#fff", borderLeft: "1px solid #E2E8F0", display: "flex", flexDirection: "column", flexShrink: 0 },
  chatHead:    { padding: "10px 12px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between" },
  chatBody:    { flex: 1, overflowY: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 8 },
  chatMsg:     { display: "flex", flexDirection: "column", gap: 2 },
  chatBubble:  { background: "#F1F4F9", padding: "6px 10px", borderRadius: "0 8px 8px 8px", fontSize: 12, color: "#1e293b" },
};
