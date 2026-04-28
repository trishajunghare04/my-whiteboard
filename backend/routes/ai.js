const express = require("express");
const router  = express.Router();
const authMiddleware = require("../middleware/auth");

// POST /api/ai/summarize
router.post("/summarize", authMiddleware, async (req, res) => {
  const { text } = req.body;
  if (!text || text.trim().length < 5)
    return res.json({ result: "⚠️ Not enough text to summarize. Add some content to the board first." });

  // Try OpenAI first
  const key = process.env.OPENAI_API_KEY;
  if (key && key.startsWith("sk-")) {
    try {
      const axios = require("axios");
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a helpful whiteboard assistant. Summarize the following whiteboard content clearly. Start with a bold title, then use bullet points. Format: **Title**\n• point\n• point"
            },
            { role: "user", content: text }
          ],
          max_tokens: 400,
          temperature: 0.5
        },
        {
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json"
          },
          timeout: 15000
        }
      );
      const output = response?.data?.choices?.[0]?.message?.content;
      if (output) return res.json({ result: output });
    } catch (err) {
      console.error("OpenAI error:", err.response?.data?.error?.message || err.message);
      // Fall through to local summary
    }
  }

  // ── Fallback: local extractive summary ──
  const sentences = text
    .split(/[.!?\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 8);

  const words = text.toLowerCase().split(/\s+/);
  const freq  = {};
  words.forEach(w => { if (w.length > 4) freq[w] = (freq[w]||0) + 1; });

  const scored = sentences.map(s => ({
    s,
    score: s.toLowerCase().split(/\s+/).reduce((acc,w) => acc + (freq[w]||0), 0)
  }));

  scored.sort((a,b) => b.score - a.score);
  const top = scored.slice(0, Math.min(5, scored.length)).map(x => "• " + x.s);

  const result = top.length > 0
    ? "**Board Summary**\n" + top.join("\n")
    : "• " + sentences.slice(0,3).join("\n• ");

  res.json({ result });
});

module.exports = router;
