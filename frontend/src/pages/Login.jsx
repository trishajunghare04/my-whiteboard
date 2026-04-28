import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../services/api";
import useAuthStore from "../stores/authStore";
import { FiMail, FiLock, FiAlertCircle } from "react-icons/fi";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.login(form);
      if (data?.error) { setError(data.error); return; }
      login(data.user, data.token);
      navigate("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.bg} />
      <div style={styles.card} className="animate-fade">
        <div style={styles.logoRow}>
          <div style={styles.logoIcon}>🧠</div>
          <span style={styles.logoText}>MyWhiteboard</span>
        </div>

        <h1 style={styles.title}>Welcome back</h1>
        <p style={styles.subtitle}>Sign in to your workspace</p>

        {error && (
          <div style={styles.errorBox}>
            <FiAlertCircle size={14} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <div style={styles.inputWrap}>
              <FiMail style={styles.inputIcon} size={16} />
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                style={{ paddingLeft: "40px" }}
                required
              />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrap}>
              <FiLock style={styles.inputIcon} size={16} />
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                style={{ paddingLeft: "40px" }}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p style={styles.footer}>
          Don't have an account?{" "}
          <Link to="/signup" style={styles.link}>Create one</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 50%, #EDE9FE 100%)",
    position: "relative",
    overflow: "hidden"
  },
  bg: {
    position: "absolute", inset: 0,
    backgroundImage: "radial-gradient(circle at 20% 50%, rgba(108,71,255,0.08) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(99,102,241,0.06) 0%, transparent 50%)",
    pointerEvents: "none"
  },
  card: {
    background: "#fff",
    borderRadius: 20,
    padding: "40px 36px",
    width: 400,
    boxShadow: "0 24px 64px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.06)",
    position: "relative", zIndex: 1
  },
  logoRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 24 },
  logoIcon: { fontSize: 28 },
  logoText: { fontSize: 18, fontWeight: 700, color: "#0F172A", fontFamily: "'Syne', sans-serif" },
  title: { fontSize: 26, fontWeight: 700, color: "#0F172A", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#64748B", marginBottom: 28 },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 500, color: "#374151" },
  inputWrap: { position: "relative" },
  inputIcon: { position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" },
  errorBox: {
    display: "flex", alignItems: "center", gap: 8,
    background: "rgba(239,68,68,0.08)", color: "#EF4444",
    border: "1px solid rgba(239,68,68,0.2)",
    borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 4
  },
  footer: { marginTop: 24, textAlign: "center", fontSize: 14, color: "#64748B" },
  link: { color: "#6C47FF", fontWeight: 600, textDecoration: "none" }
};
