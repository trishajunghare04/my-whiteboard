const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host:     process.env.DB_HOST     || "localhost",
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || "my_whiteboard",
  user:     process.env.DB_USER     || "postgres",
  password: process.env.DB_PASSWORD || "password",
});

// ─── Helper: run SQL, never throw (just warn) ────────────────────────────
async function safe(client, sql, label) {
  try {
    await client.query(sql);
  } catch (e) {
    // Swallow "already exists" and "does not exist" — these are safe
    if (
      e.message.includes("already exists") ||
      e.message.includes("does not exist") ||
      e.code === "42701" || // duplicate_column
      e.code === "42P07" || // duplicate_table
      e.code === "42710"    // duplicate_object (index)
    ) {
      // silent — this is expected on re-runs
    } else {
      console.warn(`  ⚠️  ${label || "SQL"}: ${e.message}`);
    }
  }
}

// ─── Template canvas data ────────────────────────────────────────────────
const TEMPLATES = [
  {
    title:       "Sprint Planning Board",
    category:    "Agile",
    description: "Swim-lanes for Backlog, In-Progress, Review and Done with example user stories.",
    thumbnail:   "sprint",
    canvas_data: {
      strokes:[], images:[],
      shapes:[
        {id:1001,type:"Rectangle",x:40, y:20,width:220,height:50,color:"#6C47FF",borderColor:"#4F35C7",borderSize:0,text:"📋 BACKLOG",    fontSize:14,fontFamily:"Inter, sans-serif",fontColor:"#fff",rotation:0},
        {id:1002,type:"Rectangle",x:280,y:20,width:220,height:50,color:"#3B82F6",borderColor:"#2563EB",borderSize:0,text:"⚡ IN PROGRESS", fontSize:14,fontFamily:"Inter, sans-serif",fontColor:"#fff",rotation:0},
        {id:1003,type:"Rectangle",x:520,y:20,width:220,height:50,color:"#F59E0B",borderColor:"#D97706",borderSize:0,text:"👀 IN REVIEW",  fontSize:14,fontFamily:"Inter, sans-serif",fontColor:"#fff",rotation:0},
        {id:1004,type:"Rectangle",x:760,y:20,width:220,height:50,color:"#10B981",borderColor:"#059669",borderSize:0,text:"✅ DONE",        fontSize:14,fontFamily:"Inter, sans-serif",fontColor:"#fff",rotation:0},
        {id:1005,type:"Rectangle",x:40, y:80,width:220,height:500,color:"#F1F0FF",borderColor:"#E0DEFF",borderSize:1,text:"",fontSize:14,fontFamily:"Inter, sans-serif",fontColor:"#000",rotation:0},
        {id:1006,type:"Rectangle",x:280,y:80,width:220,height:500,color:"#EFF6FF",borderColor:"#DBEAFE",borderSize:1,text:"",fontSize:14,fontFamily:"Inter, sans-serif",fontColor:"#000",rotation:0},
        {id:1007,type:"Rectangle",x:520,y:80,width:220,height:500,color:"#FFFBEB",borderColor:"#FDE68A",borderSize:1,text:"",fontSize:14,fontFamily:"Inter, sans-serif",fontColor:"#000",rotation:0},
        {id:1008,type:"Rectangle",x:760,y:80,width:220,height:500,color:"#F0FDF4",borderColor:"#BBF7D0",borderSize:1,text:"",fontSize:14,fontFamily:"Inter, sans-serif",fontColor:"#000",rotation:0},
      ],
      notes:[
        {id:2001,x:55, y:95, width:190,height:80,text:"🎯 User Story 1\nAs a user, I want to...",background:"#EDE9FE",fontSize:12,fontFamily:"Inter, sans-serif",fontColor:"#4C1D95",bold:false,italic:false,align:"left",rotation:0,shadow:false},
        {id:2002,x:55, y:190,width:190,height:80,text:"🎯 User Story 2\nAdd your story here",    background:"#EDE9FE",fontSize:12,fontFamily:"Inter, sans-serif",fontColor:"#4C1D95",bold:false,italic:false,align:"left",rotation:0,shadow:false},
        {id:2003,x:295,y:95, width:190,height:80,text:"⚡ Task in progress\nAssigned to: @name", background:"#DBEAFE",fontSize:12,fontFamily:"Inter, sans-serif",fontColor:"#1E40AF",bold:false,italic:false,align:"left",rotation:0,shadow:false},
        {id:2004,x:535,y:95, width:190,height:80,text:"👀 Needs review\nPR link: #123",          background:"#FEF3C7",fontSize:12,fontFamily:"Inter, sans-serif",fontColor:"#92400E",bold:false,italic:false,align:"left",rotation:0,shadow:false},
        {id:2005,x:775,y:95, width:190,height:80,text:"✅ Completed!\nDeployed to prod",         background:"#D1FAE5",fontSize:12,fontFamily:"Inter, sans-serif",fontColor:"#065F46",bold:false,italic:false,align:"left",rotation:0,shadow:false},
      ],
      texts:[
        {id:3001,x:40,y:-40,width:500,height:36,text:"🚀 Sprint Planning Board — Week of ___",fontSize:22,fontFamily:"'Syne', sans-serif",color:"#0F172A",bold:true,italic:false,underline:false,align:"left",rotation:0},
        {id:3002,x:40,y:600,width:700,height:28,text:"💡 Drag sticky notes between columns. Click any header to rename.",fontSize:12,fontFamily:"Inter, sans-serif",color:"#94A3B8",bold:false,italic:true,underline:false,align:"left",rotation:0},
      ]
    }
  },
  {
    title:"Mind Map", category:"Ideation",
    description:"Central idea hub with 6 radial branches. Expand each branch with sub-topics.",
    thumbnail:"mindmap",
    canvas_data:{
      strokes:[],images:[],
      shapes:[
        {id:1001,type:"Circle",   x:370,y:200,width:160,height:160,color:"#6C47FF",borderColor:"#4F35C7",borderSize:3,text:"💡 Central Idea",fontSize:14,fontFamily:"Inter, sans-serif",fontColor:"#fff",rotation:0},
        {id:1002,type:"RoundRect",x:60, y:60, width:150,height:60, color:"#3B82F6",borderColor:"#2563EB",borderSize:2,text:"Branch 1",fontSize:13,fontFamily:"Inter, sans-serif",fontColor:"#fff",rotation:0},
        {id:1003,type:"RoundRect",x:700,y:60, width:150,height:60, color:"#10B981",borderColor:"#059669",borderSize:2,text:"Branch 2",fontSize:13,fontFamily:"Inter, sans-serif",fontColor:"#fff",rotation:0},
        {id:1004,type:"RoundRect",x:60, y:220,width:150,height:60, color:"#F59E0B",borderColor:"#D97706",borderSize:2,text:"Branch 3",fontSize:13,fontFamily:"Inter, sans-serif",fontColor:"#fff",rotation:0},
        {id:1005,type:"RoundRect",x:700,y:220,width:150,height:60, color:"#EF4444",borderColor:"#DC2626",borderSize:2,text:"Branch 4",fontSize:13,fontFamily:"Inter, sans-serif",fontColor:"#fff",rotation:0},
        {id:1006,type:"RoundRect",x:60, y:380,width:150,height:60, color:"#EC4899",borderColor:"#DB2777",borderSize:2,text:"Branch 5",fontSize:13,fontFamily:"Inter, sans-serif",fontColor:"#fff",rotation:0},
        {id:1007,type:"RoundRect",x:700,y:380,width:150,height:60, color:"#8B5CF6",borderColor:"#7C3AED",borderSize:2,text:"Branch 6",fontSize:13,fontFamily:"Inter, sans-serif",fontColor:"#fff",rotation:0},
      ],
      notes:[{id:2001,x:230,y:420,width:170,height:70,text:"📌 Add sub-topics by duplicating branch nodes",background:"#FFFBEB",fontSize:11,fontFamily:"Inter, sans-serif",fontColor:"#92400E",bold:false,italic:true,align:"left",rotation:-5,shadow:false}],
      texts:[{id:3001,x:20,y:-50,width:600,height:36,text:"🧠 Mind Map — Click any shape to rename it",fontSize:22,fontFamily:"'Syne', sans-serif",color:"#0F172A",bold:true,italic:false,underline:false,align:"left",rotation:0}]
    }
  },
  {
    title:"Retrospective", category:"Agile",
    description:"4-quadrant retrospective: What Went Well, Improve, Action Items, Shout-outs.",
    thumbnail:"retro",
    canvas_data:{
      strokes:[],images:[],
      shapes:[
        {id:1001,type:"Rectangle",x:20, y:20, width:430,height:50, color:"#10B981",borderColor:"#059669",borderSize:0,text:"😊 WHAT WENT WELL",  fontSize:15,fontFamily:"Inter, sans-serif",fontColor:"#fff",rotation:0},
        {id:1002,type:"Rectangle",x:470,y:20, width:430,height:50, color:"#EF4444",borderColor:"#DC2626",borderSize:0,text:"😤 WHAT TO IMPROVE",  fontSize:15,fontFamily:"Inter, sans-serif",fontColor:"#fff",rotation:0},
        {id:1003,type:"Rectangle",x:20, y:380,width:430,height:50, color:"#3B82F6",borderColor:"#2563EB",borderSize:0,text:"✅ ACTION ITEMS",      fontSize:15,fontFamily:"Inter, sans-serif",fontColor:"#fff",rotation:0},
        {id:1004,type:"Rectangle",x:470,y:380,width:430,height:50, color:"#F59E0B",borderColor:"#D97706",borderSize:0,text:"🌟 SHOUT-OUTS",        fontSize:15,fontFamily:"Inter, sans-serif",fontColor:"#fff",rotation:0},
        {id:1005,type:"Rectangle",x:20, y:80, width:430,height:290,color:"#F0FDF4",borderColor:"#BBF7D0",borderSize:1,text:"",fontSize:14,fontFamily:"Inter, sans-serif",fontColor:"#000",rotation:0},
        {id:1006,type:"Rectangle",x:470,y:80, width:430,height:290,color:"#FEF2F2",borderColor:"#FECACA",borderSize:1,text:"",fontSize:14,fontFamily:"Inter, sans-serif",fontColor:"#000",rotation:0},
        {id:1007,type:"Rectangle",x:20, y:440,width:430,height:200,color:"#EFF6FF",borderColor:"#BFDBFE",borderSize:1,text:"",fontSize:14,fontFamily:"Inter, sans-serif",fontColor:"#000",rotation:0},
        {id:1008,type:"Rectangle",x:470,y:440,width:430,height:200,color:"#FFFBEB",borderColor:"#FDE68A",borderSize:1,text:"",fontSize:14,fontFamily:"Inter, sans-serif",fontColor:"#000",rotation:0},
      ],
      notes:[
        {id:2001,x:35, y:95, width:180,height:70,text:"👍 Team communication improved!",background:"#D1FAE5",fontSize:12,fontFamily:"Inter, sans-serif",fontColor:"#065F46",bold:false,italic:false,align:"left",rotation:0,shadow:false},
        {id:2002,x:230,y:95, width:180,height:70,text:"👍 Released on time",            background:"#D1FAE5",fontSize:12,fontFamily:"Inter, sans-serif",fontColor:"#065F46",bold:false,italic:false,align:"left",rotation:0,shadow:false},
        {id:2003,x:485,y:95, width:180,height:70,text:"😤 Sprint planning too long",    background:"#FEE2E2",fontSize:12,fontFamily:"Inter, sans-serif",fontColor:"#991B1B",bold:false,italic:false,align:"left",rotation:0,shadow:false},
        {id:2004,x:35, y:455,width:180,height:70,text:"📋 Schedule 30-min planning",    background:"#DBEAFE",fontSize:12,fontFamily:"Inter, sans-serif",fontColor:"#1E40AF",bold:false,italic:false,align:"left",rotation:0,shadow:false},
        {id:2005,x:485,y:455,width:180,height:70,text:"🌟 Thanks @alex for the hotfix!",background:"#FEF3C7",fontSize:12,fontFamily:"Inter, sans-serif",fontColor:"#92400E",bold:false,italic:false,align:"left",rotation:0,shadow:false},
      ],
      texts:[
        {id:3001,x:20,y:-50,width:700,height:36,text:"🔄 Sprint Retrospective — Sprint #___",fontSize:22,fontFamily:"'Syne', sans-serif",color:"#0F172A",bold:true,italic:false,underline:false,align:"left",rotation:0},
        {id:3002,x:20,y:650,width:900,height:28,text:"💡 Add your sticky notes to each quadrant. Delete examples to get started.",fontSize:12,fontFamily:"Inter, sans-serif",color:"#94A3B8",bold:false,italic:true,underline:false,align:"left",rotation:0},
      ]
    }
  },
  {
    title:"Brainstorm Board", category:"Ideation",
    description:"Central question with 4 idea clusters. No bad ideas — quantity over quality.",
    thumbnail:"brainstorm",
    canvas_data:{
      strokes:[],images:[],
      shapes:[
        {id:1001,type:"RoundRect",x:300,y:160,width:280,height:100,color:"#0F172A",borderColor:"#000",borderSize:0,text:"❓ What problem are we solving?",fontSize:14,fontFamily:"Inter, sans-serif",fontColor:"#fff",rotation:0},
        {id:1002,type:"RoundRect",x:60, y:50, width:180,height:50, color:"#6C47FF",borderColor:"#4F35C7",borderSize:0,text:"💡 Idea Group A",fontSize:13,fontFamily:"Inter, sans-serif",fontColor:"#fff",rotation:0},
        {id:1003,type:"RoundRect",x:640,y:50, width:180,height:50, color:"#10B981",borderColor:"#059669",borderSize:0,text:"💡 Idea Group B",fontSize:13,fontFamily:"Inter, sans-serif",fontColor:"#fff",rotation:0},
        {id:1004,type:"RoundRect",x:60, y:340,width:180,height:50, color:"#EF4444",borderColor:"#DC2626",borderSize:0,text:"💡 Idea Group C",fontSize:13,fontFamily:"Inter, sans-serif",fontColor:"#fff",rotation:0},
        {id:1005,type:"RoundRect",x:640,y:340,width:180,height:50, color:"#F59E0B",borderColor:"#D97706",borderSize:0,text:"💡 Idea Group D",fontSize:13,fontFamily:"Inter, sans-serif",fontColor:"#fff",rotation:0},
      ],
      notes:[
        {id:2001,x:55, y:115,width:150,height:70,text:"✍️ Write your idea",  background:"#EDE9FE",fontSize:12,fontFamily:"Inter, sans-serif",fontColor:"#4C1D95",bold:false,italic:false,align:"left",rotation:-3,shadow:true},
        {id:2002,x:215,y:110,width:150,height:70,text:"✍️ Another idea",     background:"#EDE9FE",fontSize:12,fontFamily:"Inter, sans-serif",fontColor:"#4C1D95",bold:false,italic:false,align:"left",rotation:2, shadow:true},
        {id:2003,x:640,y:115,width:150,height:70,text:"✍️ Your idea here",   background:"#D1FAE5",fontSize:12,fontFamily:"Inter, sans-serif",fontColor:"#065F46",bold:false,italic:false,align:"left",rotation:-2,shadow:true},
        {id:2004,x:800,y:110,width:150,height:70,text:"✍️ Wild idea!",       background:"#D1FAE5",fontSize:12,fontFamily:"Inter, sans-serif",fontColor:"#065F46",bold:false,italic:false,align:"left",rotation:3, shadow:true},
        {id:2005,x:55, y:400,width:150,height:70,text:"✍️ Constraint/risk",  background:"#FEE2E2",fontSize:12,fontFamily:"Inter, sans-serif",fontColor:"#991B1B",bold:false,italic:false,align:"left",rotation:-1,shadow:true},
        {id:2006,x:640,y:400,width:150,height:70,text:"✍️ Opportunity",      background:"#FEF3C7",fontSize:12,fontFamily:"Inter, sans-serif",fontColor:"#92400E",bold:false,italic:false,align:"left",rotation:2, shadow:true},
      ],
      texts:[
        {id:3001,x:20,y:-55,width:800,height:36,text:"🌪️ Brainstorm Board — No bad ideas!",fontSize:22,fontFamily:"'Syne', sans-serif",color:"#0F172A",bold:true,italic:false,underline:false,align:"left",rotation:0},
        {id:3002,x:20,y:500,width:900,height:28,text:"👆 Replace the question in the center. Fill sticky notes for each group.",fontSize:12,fontFamily:"Inter, sans-serif",color:"#94A3B8",bold:false,italic:true,underline:false,align:"left",rotation:0},
      ]
    }
  },
  {
    title:"User Story Map", category:"UX Design",
    description:"Map user journeys across activities and tasks. Great for product planning.",
    thumbnail:"userflow",
    canvas_data:{
      strokes:[],images:[],
      shapes:[
        {id:1001,type:"Circle",   x:30, y:80,width:80, height:80, color:"#6C47FF",borderColor:"#4F35C7",borderSize:2,text:"👤 User",   fontSize:11,fontFamily:"Inter, sans-serif",fontColor:"#fff",rotation:0},
        {id:1002,type:"Rectangle",x:140,y:20,width:160,height:50, color:"#0F172A",borderColor:"#000",   borderSize:0,text:"🏠 Discover",fontSize:13,fontFamily:"Inter, sans-serif",fontColor:"#fff",rotation:0},
        {id:1003,type:"Rectangle",x:320,y:20,width:160,height:50, color:"#0F172A",borderColor:"#000",   borderSize:0,text:"🔍 Evaluate",fontSize:13,fontFamily:"Inter, sans-serif",fontColor:"#fff",rotation:0},
        {id:1004,type:"Rectangle",x:500,y:20,width:160,height:50, color:"#0F172A",borderColor:"#000",   borderSize:0,text:"🛒 Purchase",fontSize:13,fontFamily:"Inter, sans-serif",fontColor:"#fff",rotation:0},
        {id:1005,type:"Rectangle",x:680,y:20,width:160,height:50, color:"#0F172A",borderColor:"#000",   borderSize:0,text:"🎁 Use",     fontSize:13,fontFamily:"Inter, sans-serif",fontColor:"#fff",rotation:0},
        {id:1006,type:"Rectangle",x:140,y:80,width:160,height:40, color:"#EDE9FE",borderColor:"#C4B5FD",borderSize:1,text:"Search online",fontSize:11,fontFamily:"Inter, sans-serif",fontColor:"#4C1D95",rotation:0},
        {id:1007,type:"Rectangle",x:320,y:80,width:160,height:40, color:"#EDE9FE",borderColor:"#C4B5FD",borderSize:1,text:"Read reviews", fontSize:11,fontFamily:"Inter, sans-serif",fontColor:"#4C1D95",rotation:0},
        {id:1008,type:"Rectangle",x:500,y:80,width:160,height:40, color:"#EDE9FE",borderColor:"#C4B5FD",borderSize:1,text:"Add to cart",  fontSize:11,fontFamily:"Inter, sans-serif",fontColor:"#4C1D95",rotation:0},
        {id:1009,type:"Rectangle",x:680,y:80,width:160,height:40, color:"#EDE9FE",borderColor:"#C4B5FD",borderSize:1,text:"Onboard",      fontSize:11,fontFamily:"Inter, sans-serif",fontColor:"#4C1D95",rotation:0},
      ],
      notes:[
        {id:2001,x:140,y:130,width:150,height:60,text:"Visit website\nSee social ad",   background:"#F3E8FF",fontSize:11,fontFamily:"Inter, sans-serif",fontColor:"#6B21A8",bold:false,italic:false,align:"left",rotation:0,shadow:false},
        {id:2002,x:320,y:130,width:150,height:60,text:"Compare prices\nCheck features", background:"#F3E8FF",fontSize:11,fontFamily:"Inter, sans-serif",fontColor:"#6B21A8",bold:false,italic:false,align:"left",rotation:0,shadow:false},
        {id:2003,x:140,y:205,width:150,height:50,text:"⚠️ Pain: Hard to find pricing",  background:"#FEE2E2",fontSize:10,fontFamily:"Inter, sans-serif",fontColor:"#991B1B",bold:false,italic:false,align:"left",rotation:0,shadow:false},
      ],
      texts:[{id:3001,x:20,y:-50,width:800,height:36,text:"🗺️ User Story Map — Add tasks and pain points below each activity",fontSize:22,fontFamily:"'Syne', sans-serif",color:"#0F172A",bold:true,italic:false,underline:false,align:"left",rotation:0}]
    }
  },
  {
    title:"Weekly Planner", category:"Productivity",
    description:"7-day planner with morning, afternoon and evening time blocks.",
    thumbnail:"planner",
    canvas_data:{
      strokes:[],images:[],
      shapes:[
        ...["MON","TUE","WED","THU","FRI","SAT","SUN"].map((d,i)=>({
          id:1001+i,type:"Rectangle",
          x:20+i*130,y:20,width:120,height:45,
          color:i>=5?"#EC4899":"#6C47FF",
          borderColor:i>=5?"#DB2777":"#4F35C7",
          borderSize:0,text:d,fontSize:14,
          fontFamily:"Inter, sans-serif",fontColor:"#fff",rotation:0
        })),
        {id:1008,type:"Rectangle",x:20,y:75, width:910,height:35,color:"#F8FAFC",borderColor:"#E2E8F0",borderSize:1,text:"🌅 Morning",   fontSize:11,fontFamily:"Inter, sans-serif",fontColor:"#64748B",rotation:0},
        {id:1009,type:"Rectangle",x:20,y:190,width:910,height:35,color:"#F8FAFC",borderColor:"#E2E8F0",borderSize:1,text:"☀️ Afternoon", fontSize:11,fontFamily:"Inter, sans-serif",fontColor:"#64748B",rotation:0},
        {id:1010,type:"Rectangle",x:20,y:305,width:910,height:35,color:"#F8FAFC",borderColor:"#E2E8F0",borderSize:1,text:"🌆 Evening",   fontSize:11,fontFamily:"Inter, sans-serif",fontColor:"#64748B",rotation:0},
      ],
      notes:[
        {id:2001,x:25, y:115,width:110,height:65,text:"📅 Add\nyour event",  background:"#EDE9FE",fontSize:10,fontFamily:"Inter, sans-serif",fontColor:"#4C1D95",bold:false,italic:false,align:"left",rotation:0,shadow:false},
        {id:2002,x:155,y:115,width:110,height:65,text:"📅 Team\nmeeting",    background:"#DBEAFE",fontSize:10,fontFamily:"Inter, sans-serif",fontColor:"#1E40AF",bold:false,italic:false,align:"left",rotation:0,shadow:false},
        {id:2003,x:285,y:230,width:110,height:65,text:"📅 Deep\nwork block", background:"#D1FAE5",fontSize:10,fontFamily:"Inter, sans-serif",fontColor:"#065F46",bold:false,italic:false,align:"left",rotation:0,shadow:false},
        {id:2004,x:675,y:115,width:110,height:65,text:"🎉 Weekend\nfun!",    background:"#FCE7F3",fontSize:10,fontFamily:"Inter, sans-serif",fontColor:"#9D174D",bold:false,italic:false,align:"left",rotation:0,shadow:false},
      ],
      texts:[
        {id:3001,x:20,y:-55,width:800,height:36,text:"📅 Weekly Planner — Week of ___",fontSize:22,fontFamily:"'Syne', sans-serif",color:"#0F172A",bold:true,italic:false,underline:false,align:"left",rotation:0},
        {id:3002,x:20,y:410,width:900,height:28,text:"💡 Drag notes into time slots. Color-code: purple=work, blue=meetings, green=focus.",fontSize:12,fontFamily:"Inter, sans-serif",color:"#94A3B8",bold:false,italic:true,underline:false,align:"left",rotation:0},
      ]
    }
  }
];

// ─── Main init ────────────────────────────────────────────────────────────
const initDB = async () => {
  const client = await pool.connect();
  try {

    // 1 ── Core tables (all safe with IF NOT EXISTS) ─────────────────────
    await safe(client, `CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      avatar VARCHAR(20) DEFAULT '🧑',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`, "create users");

    await safe(client, `CREATE TABLE IF NOT EXISTS groups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      description TEXT,
      owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
      invite_code VARCHAR(12) UNIQUE,
      created_at TIMESTAMP DEFAULT NOW()
    )`, "create groups");

    await safe(client, `CREATE TABLE IF NOT EXISTS group_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
      user_id  UUID REFERENCES users(id)  ON DELETE CASCADE,
      role VARCHAR(20) DEFAULT 'member',
      joined_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(group_id, user_id)
    )`, "create group_members");

    await safe(client, `CREATE TABLE IF NOT EXISTS boards (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL DEFAULT 'Untitled Board',
      description TEXT,
      owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
      thumbnail TEXT,
      is_public BOOLEAN DEFAULT false,
      canvas_data JSONB DEFAULT '{"strokes":[],"shapes":[],"notes":[],"texts":[],"images":[]}'::jsonb,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`, "create boards");

    await safe(client, `CREATE TABLE IF NOT EXISTS board_collaborators (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
      user_id  UUID REFERENCES users(id)  ON DELETE CASCADE,
      role VARCHAR(20) DEFAULT 'editor',
      joined_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(board_id, user_id)
    )`, "create board_collaborators");

    await safe(client, `CREATE TABLE IF NOT EXISTS templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      category VARCHAR(100),
      description TEXT,
      canvas_data JSONB,
      thumbnail VARCHAR(50),
      is_default BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )`, "create templates");

    // 2 ── Add new columns to existing tables (each wrapped individually) ─
    await safe(client, `ALTER TABLE boards ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE SET NULL`, "add boards.group_id");

    // 3 ── Indexes ─────────────────────────────────────────────────────────
    await safe(client, `CREATE INDEX IF NOT EXISTS idx_boards_owner ON boards(owner_id)`,                     "idx boards owner");
    await safe(client, `CREATE INDEX IF NOT EXISTS idx_boards_group ON boards(group_id)`,                     "idx boards group");
    await safe(client, `CREATE INDEX IF NOT EXISTS idx_bc_board     ON board_collaborators(board_id)`,        "idx bc board");
    await safe(client, `CREATE INDEX IF NOT EXISTS idx_bc_user      ON board_collaborators(user_id)`,         "idx bc user");
    await safe(client, `CREATE INDEX IF NOT EXISTS idx_gm_group     ON group_members(group_id)`,              "idx gm group");

    // 4 ── Seed templates ──────────────────────────────────────────────────
    await safe(client, `DELETE FROM templates WHERE is_default = true`, "delete old templates");

    for (const t of TEMPLATES) {
      await client.query(
        `INSERT INTO templates (title, category, description, canvas_data, thumbnail, is_default)
         VALUES ($1,$2,$3,$4,$5,true)`,
        [t.title, t.category, t.description, JSON.stringify(t.canvas_data), t.thumbnail]
      );
    }

    console.log(`✅ Database ready — ${TEMPLATES.length} templates seeded`);

  } catch (err) {
    console.error("❌ DB init error:", err.message);
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { pool, initDB };
