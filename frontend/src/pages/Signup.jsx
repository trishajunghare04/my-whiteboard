import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../services/api";
import useAuthStore from "../stores/authStore";
import { FiUser, FiMail, FiLock, FiAlertCircle } from "react-icons/fi";

export default function Signup() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) { setError("Passwords do not match"); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      const data = await api.register({ name: form.name, email: form.email, password: form.password });
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

        <h1 style={styles.title}>Create account</h1>
        <p style={styles.subtitle}>Join thousands of creators & teams</p>

        {error && (
          <div style={styles.errorBox}><FiAlertCircle size={14} />{error}</div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          {[
            { key: "name", label: "Full Name", type: "text", icon: <FiUser size={16} />, placeholder: "Jane Doe" },
            { key: "email", label: "Email", type: "email", icon: <FiMail size={16} />, placeholder: "you@example.com" },
            { key: "password", label: "Password", type: "password", icon: <FiLock size={16} />, placeholder: "Min 6 characters" },
            { key: "confirm", label: "Confirm Password", type: "password", icon: <FiLock size={16} />, placeholder: "Repeat password" },
          ].map(f => (
            <div key={f.key} style={styles.field}>
              <label style={styles.label}>{f.label}</label>
              <div style={styles.inputWrap}>
                <span style={styles.inputIcon}>{f.icon}</span>
                <input
                  className="input"
                  type={f.type}
                  placeholder={f.placeholder}
                  value={form[f.key]}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  style={{ paddingLeft: "40px" }}
                  required
                />
              </div>
            </div>
          ))}

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p style={styles.footer}>
          Already have an account?{" "}
          <Link to="/login" style={styles.link}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
    background: "linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 50%, #EDE9FE 100%)",
    position: "relative", overflow: "hidden"
  },
  bg: {
    position: "absolute", inset: 0,
    backgroundImage: "radial-gradient(circle at 20% 50%, rgba(108,71,255,0.08) 0%, transparent 60%)",
    pointerEvents: "none"
  },
  card: {
    background: "#fff", borderRadius: 20, padding: "40px 36px", width: 420,
    boxShadow: "0 24px 64px rgba(0,0,0,0.12)", position: "relative", zIndex: 1
  },
  logoRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 24 },
  logoIcon: { fontSize: 28 },
  logoText: { fontSize: 18, fontWeight: 700, color: "#0F172A", fontFamily: "'Syne', sans-serif" },
  title: { fontSize: 26, fontWeight: 700, color: "#0F172A", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#64748B", marginBottom: 28 },
  form: { display: "flex", flexDirection: "column", gap: 14 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 500, color: "#374151" },
  inputWrap: { position: "relative" },
  inputIcon: { position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8", display: "flex" },
  errorBox: {
    display: "flex", alignItems: "center", gap: 8,
    background: "rgba(239,68,68,0.08)", color: "#EF4444",
    border: "1px solid rgba(239,68,68,0.2)",
    borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 4
  },
  footer: { marginTop: 24, textAlign: "center", fontSize: 14, color: "#64748B" },
  link: { color: "#6C47FF", fontWeight: 600, textDecoration: "none" }
};
