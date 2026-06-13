import { useState } from "react";

const QUICK_REFINES = [
  "Maggi hata do, kuch healthy do",
  "budget kam karo",
  "kuch aur add karo",
];

export default function RefineBar({ onRefine }) {
  const [text, setText] = useState("");

  function send(t) {
    const value = (t || text).trim();
    if (!value) return;
    onRefine(value);
    setText("");
  }

  return (
    <div className="refine">
      <div className="refine-label">Want to tweak this cart?</div>
      <div className="refine-input">
        <input
          type="text"
          value={text}
          placeholder="e.g. Maggi hata do, kuch healthy do"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button onClick={() => send()} disabled={!text.trim()}>
          Refine
        </button>
      </div>
      <div className="refine-quick">
        {QUICK_REFINES.map((r, i) => (
          <button key={i} className="chip chip-sm" onClick={() => send(r)}>
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}
