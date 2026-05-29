"use client";

import { useEffect, useState } from "react";

const KEY = "kbm:wishlist";

function read(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(arr: string[]) {
  try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch { /* ignore */ }
}

export function WishlistButton({ id, className }: { id: string; className?: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => { setOn(read().includes(id)); }, [id]);
  function toggle(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    const cur = read();
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    write(next); setOn(!on);
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      className={`grid place-items-center w-8 h-8 rounded-full border ${on ? "bg-pink-600 border-pink-600 text-white" : "bg-white/90 border-neutral-200 text-neutral-500 hover:border-pink-400"} transition ${className || ""}`}
    >
      <span className="text-sm leading-none">{on ? "♥" : "♡"}</span>
    </button>
  );
}
