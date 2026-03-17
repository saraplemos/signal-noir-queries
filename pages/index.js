import { useState } from "react";
import { useRouter } from "next/router";

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        router.push("/dashboard");
      } else {
        setError("Invalid username or password");
      }
    } catch {
      setError("Connection error. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #0D1B2A 0%, #142233 50%, #0D1B2A 100%)",
      padding: 20,
    }}>
      {/* Background grid */}
      <div style={{
        position: "fixed", inset: 0, opacity: 0.03,
        backgroundImage: "linear-gradient(#0D9488 1px, transparent 1px), linear-gradient(90deg, #0D9488 1px, transparent 1px)",
        backgroundSize: "40px 40px", pointerEvents: "none",
      }}/>

      <div style={{ width: "100%", maxWidth: 400, position: "relative" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#0D9488", boxShadow: "0 0 12px #0D9488" }}/>
            <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: 3, color: "#fff" }}>SIGNAL NOIR™</span>
          </div>
          <div style={{ fontSize: 12, color: "#64748B", letterSpacing: 2, fontFamily: "Calibri, sans-serif" }}>
            AI CITATION INTELLIGENCE
          </div>
        </div>

        {/* Card */}
        <form onSubmit={handleLogin} style={{
          background: "#142233", border: "1px solid #1C2E42", borderRadius: 12,
          padding: 36, boxShadow: "0 24px 48px rgba(0,0,0,0.4)",
        }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: "#fff" }}>Sign in</h1>
          <p style={{ fontSize: 13, color: "#64748B", fontFamily: "Calibri, sans-serif", marginBottom: 28 }}>
            Internal tool — authorised testers only
          </p>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Username</label>
            <input
              style={inputStyle}
              type="text"
              placeholder="Your name"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Password</label>
            <input
              style={inputStyle}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div style={{
              background: "#EF444420", border: "1px solid #EF444440", borderRadius: 6,
              padding: "10px 14px", fontSize: 13, color: "#EF4444",
              fontFamily: "Calibri, sans-serif", marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: "100%", background: "#0D9488", color: "#fff", border: "none",
            borderRadius: 8, padding: "12px 0", fontSize: 14, fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
            fontFamily: "Calibri, sans-serif", letterSpacing: 0.5,
            transition: "opacity 0.15s",
          }}>
            {loading ? "Signing in…" : "Sign in →"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: "#334155", fontFamily: "Calibri, sans-serif" }}>
          Spotlight Communications × Lemonade Fizz
        </div>
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block", fontSize: 11, color: "#94A3B8", fontFamily: "Calibri, sans-serif",
  textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6, fontWeight: 600,
};
const inputStyle = {
  width: "100%", background: "#1C2E42", color: "#fff", border: "1px solid #243548",
  borderRadius: 6, padding: "11px 14px", fontSize: 14, fontFamily: "Calibri, sans-serif",
  outline: "none", transition: "border-color 0.15s",
};
