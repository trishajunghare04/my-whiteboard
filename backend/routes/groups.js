const express = require("express");
const router  = express.Router();
const { pool } = require("../db");
const auth = require("../middleware/auth");
const crypto = require("crypto");

// GET /api/groups — my groups
router.get("/", auth, async (req, res) => {
  const r = await pool.query(
    `SELECT g.*, u.name as owner_name,
       (SELECT COUNT(*) FROM group_members WHERE group_id=g.id) as member_count
     FROM groups g
     LEFT JOIN users u ON g.owner_id=u.id
     WHERE g.owner_id=$1 OR g.id IN (SELECT group_id FROM group_members WHERE user_id=$1)
     ORDER BY g.created_at DESC`,
    [req.user.id]
  );
  res.json(r.rows);
});

// POST /api/groups — create group
router.post("/", auth, async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: "Name required" });
  const code = crypto.randomBytes(5).toString("hex").toUpperCase();
  const g = await pool.query(
    "INSERT INTO groups (name, description, owner_id, invite_code) VALUES ($1,$2,$3,$4) RETURNING *",
    [name, description||"", req.user.id, code]
  );
  // auto-add owner as admin
  await pool.query(
    "INSERT INTO group_members (group_id, user_id, role) VALUES ($1,$2,'admin') ON CONFLICT DO NOTHING",
    [g.rows[0].id, req.user.id]
  );
  res.status(201).json(g.rows[0]);
});

// GET /api/groups/:id/members
router.get("/:id/members", auth, async (req, res) => {
  const r = await pool.query(
    `SELECT u.id, u.name, u.email, u.avatar, gm.role, gm.joined_at
     FROM group_members gm JOIN users u ON gm.user_id=u.id
     WHERE gm.group_id=$1 ORDER BY gm.joined_at`,
    [req.params.id]
  );
  res.json(r.rows);
});

// POST /api/groups/:id/invite — invite by email
router.post("/:id/invite", auth, async (req, res) => {
  const { email } = req.body;
  const u = await pool.query("SELECT id FROM users WHERE email=$1", [email]);
  if (!u.rows.length) return res.status(404).json({ error: "No user found with that email" });
  await pool.query(
    "INSERT INTO group_members (group_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
    [req.params.id, u.rows[0].id]
  );
  res.json({ success: true });
});

// POST /api/groups/join — join by invite code
router.post("/join", auth, async (req, res) => {
  const { code } = req.body;
  const g = await pool.query("SELECT * FROM groups WHERE invite_code=$1", [code?.toUpperCase()]);
  if (!g.rows.length) return res.status(404).json({ error: "Invalid invite code" });
  await pool.query(
    "INSERT INTO group_members (group_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
    [g.rows[0].id, req.user.id]
  );
  res.json({ success: true, group: g.rows[0] });
});

// DELETE /api/groups/:id/members/:uid
router.delete("/:id/members/:uid", auth, async (req, res) => {
  await pool.query(
    "DELETE FROM group_members WHERE group_id=$1 AND user_id=$2",
    [req.params.id, req.params.uid]
  );
  res.json({ success: true });
});

module.exports = router;
