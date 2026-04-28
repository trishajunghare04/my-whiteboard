const express = require("express");
const router = express.Router();
const { pool } = require("../db");
const authMiddleware = require("../middleware/auth");

// GET /api/boards — list all boards for current user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, u.name as owner_name, u.avatar as owner_avatar,
        (SELECT COUNT(*) FROM board_collaborators WHERE board_id = b.id) as collaborator_count
       FROM boards b
       LEFT JOIN users u ON b.owner_id = u.id
       WHERE b.owner_id = $1
         OR b.id IN (SELECT board_id FROM board_collaborators WHERE user_id = $1)
       ORDER BY b.updated_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/boards/recent — 6 most recently updated
router.get("/recent", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.id, b.title, b.thumbnail, b.updated_at, u.name as owner_name
       FROM boards b LEFT JOIN users u ON b.owner_id = u.id
       WHERE b.owner_id = $1 ORDER BY b.updated_at DESC LIMIT 6`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/boards/:id — get single board with canvas data
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, u.name as owner_name, u.avatar as owner_avatar
       FROM boards b LEFT JOIN users u ON b.owner_id = u.id
       WHERE b.id = $1 AND (
         b.owner_id = $2
         OR b.is_public = true
         OR b.id IN (SELECT board_id FROM board_collaborators WHERE user_id = $2)
       )`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Board not found" });

    // Get collaborators
    const collabs = await pool.query(
      `SELECT u.id, u.name, u.email, u.avatar, bc.role
       FROM board_collaborators bc JOIN users u ON bc.user_id = u.id
       WHERE bc.board_id = $1`,
      [req.params.id]
    );
    const board = result.rows[0];
    board.collaborators = collabs.rows;
    res.json(board);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/boards — create new board
router.post("/", authMiddleware, async (req, res) => {
  const { title, description, template_id, is_public } = req.body;
  try {
    let canvasData = { strokes: [], shapes: [], notes: [], texts: [] };
    if (template_id) {
      const tmpl = await pool.query("SELECT canvas_data FROM templates WHERE id=$1", [template_id]);
      if (tmpl.rows.length > 0) canvasData = tmpl.rows[0].canvas_data;
    }

    const result = await pool.query(
      `INSERT INTO boards (title, description, owner_id, is_public, canvas_data)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title || "Untitled Board", description || "", req.user.id, is_public || false, JSON.stringify(canvasData)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /api/boards/:id — update board meta
router.put("/:id", authMiddleware, async (req, res) => {
  const { title, description, is_public, thumbnail } = req.body;
  try {
    const result = await pool.query(
      `UPDATE boards SET title=$1, description=$2, is_public=$3, thumbnail=$4, updated_at=NOW()
       WHERE id=$5 AND owner_id=$6 RETURNING *`,
      [title, description, is_public, thumbnail, req.params.id, req.user.id]
    );
    if (result.rows.length === 0)
      return res.status(403).json({ error: "Forbidden or not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /api/boards/:id/canvas — save canvas data
router.put("/:id/canvas", authMiddleware, async (req, res) => {
  const { canvas_data } = req.body;
  try {
    await pool.query(
      "UPDATE boards SET canvas_data=$1, updated_at=NOW() WHERE id=$2",
      [JSON.stringify(canvas_data), req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/boards/:id
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    await pool.query("DELETE FROM boards WHERE id=$1 AND owner_id=$2", [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/boards/:id/collaborators — invite collaborator
router.post("/:id/collaborators", authMiddleware, async (req, res) => {
  const { email, role } = req.body;
  try {
    const userRes = await pool.query("SELECT id FROM users WHERE email=$1", [email]);
    if (userRes.rows.length === 0)
      return res.status(404).json({ error: "User not found" });
    const userId = userRes.rows[0].id;
    await pool.query(
      "INSERT INTO board_collaborators (board_id, user_id, role) VALUES ($1,$2,$3) ON CONFLICT (board_id,user_id) DO UPDATE SET role=$3",
      [req.params.id, userId, role || "editor"]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
