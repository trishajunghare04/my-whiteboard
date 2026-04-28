# 🧠 MyWhiteboard

A professional real-time collaborative whiteboard app with AI features.

## 🚀 Quick Setup
Clone Repository
git clone https://github.com/YOUR_USERNAME/my-whiteboard.git
cd my-whiteboard

### 1. PostgreSQL Database
```bash
psql -U postgres
CREATE DATABASE my_whiteboard;
```

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env
# Fill in DB_PASSWORD, JWT_SECRET, OPENAI_API_KEY
npm start
```

### 3. Frontend
```bash
cd frontend
npm install
npm start
# Opens at http://localhost:3000

🔐 Environment Variables

Create a .env file inside /backend:

PORT=5000
MONGO_URI=your_database_url
JWT_SECRET=your_secret_key

⚠️ Do NOT commit .env files.
```

🌐 App URLs
Frontend: http://localhost:3000
Backend: http://localhost:5000

## ✨ Features
- 🔐 JWT Auth + PostgreSQL
- 🎨 Pen, Eraser, 9 Shapes, Sticky Notes, Text
- 🔄 Undo/Redo (Ctrl+Z/Y), Auto-save
- 🤝 Real-time collaboration via Socket.IO
- 💬 In-board team chat
- 🎤 Voice commands & dictation  
- 🤖 AI summarize (OpenAI)
- 📤 PNG export, Dark mode, Templates

## ⌨️ Keyboard Shortcuts
| Key | Action |
|-----|--------|
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Ctrl+S | Save |
| P | Pen tool |
| E | Eraser |
| V | Select |
| T | Text |
| Delete | Delete selected |

## 🎤 Voice Commands
"clear board", "undo", "redo", "add circle", "add note", "pen mode", "save"
