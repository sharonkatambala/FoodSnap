"use client";

import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export default function AuthBar() {
  const [email, setEmail] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });
    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signIn = async () => {
    if (!email) return;
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      setMessage("Sign-in failed. Check your Supabase settings.");
    } else {
      setMessage("Check your email for the magic link.");
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUserEmail(null);
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
        Supabase not configured. Auth is disabled.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
      {userEmail ? (
        <div className="flex items-center justify-between gap-3">
          <span>Signed in as {userEmail}</span>
          <button
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
            onClick={signOut}
          >
            Sign out
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="rounded-full border border-slate-200 px-3 py-1 text-xs"
            placeholder="Email for magic link"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button
            className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white"
            onClick={signIn}
          >
            Send link
          </button>
          {message && <span className="text-xs text-emerald-700">{message}</span>}
        </div>
      )}
    </div>
  );
}
