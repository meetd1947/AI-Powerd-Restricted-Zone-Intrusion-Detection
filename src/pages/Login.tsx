import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Shield, Lock, Mail, AlertCircle, Loader2 } from "lucide-react";

export const Login: React.FC = () => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }

    try {
      setError(null);
      setIsSubmitting(true);
      await signIn(email.trim(), password);
    } catch (err: any) {
      console.error("Authentication error:", err);
      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        setError("Invalid email or password credentials.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Access temporarily disabled due to many failed login attempts.");
      } else {
        setError(err.message || "Failed to authenticate. Please check connection.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#090d16] text-slate-100 flex items-center justify-center p-4 selection:bg-blue-500 selection:text-white relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#121829]/90 border border-[#1e2a45] backdrop-blur-xl rounded-2xl shadow-2xl p-8 z-10">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="p-3 bg-gradient-to-tr from-blue-600 to-blue-500 rounded-xl shadow-lg shadow-blue-600/20 mb-3">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-wider text-white">STADIUM MONITORING</h1>
          <p className="text-xs font-mono tracking-widest text-slate-300 mt-1 uppercase">Restricted Zone Access Portal</p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
            <div className="leading-snug">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5 font-semibold">Operator Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@stadiumsentinel.io"
                className="w-full bg-[#0c1017] border border-slate-700/70 focus:border-rose-500 focus:outline-none rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5 font-semibold">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#0c1017] border border-slate-700/70 focus:border-rose-500 focus:outline-none rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-900/40 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>ACCESS DASHBOARD</span>
            )}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-slate-800/80 pt-4">
          <p className="text-[11px] text-slate-500 font-mono">
            SECURE RESTRICTED-ZONE ACCESS ONLY • AUTH REQUIRED
          </p>
        </div>
      </div>
    </div>
  );
};
