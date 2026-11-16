"use client";

import { useState } from "react";

// Adapted from PNW Culinary's PasswordField interaction and accessible labels.
export function AdminPasswordField() {
  const [visible, setVisible] = useState(false);
  return <div>
    <label htmlFor="admin-password" className="text-sm font-medium text-foreground">Password</label>
    <div className="relative mt-2">
      <input id="admin-password" name="password" type={visible ? "text" : "password"} autoComplete="current-password" required className="min-h-12 w-full rounded-lg border border-card-border bg-background px-3 pr-20 text-base text-foreground outline-none transition-colors focus:border-nausea" />
      <button type="button" aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} onClick={() => setVisible(value => !value)} className="absolute inset-y-0 right-0 min-w-16 rounded-r-lg px-3 text-xs font-semibold text-nausea transition-colors hover:bg-nausea/10">
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  </div>;
}
