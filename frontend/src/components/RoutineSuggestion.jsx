import { useMemo, useState } from "react";

// Proactive Feature A — Time-of-day routine anticipation.
//
// This is GENUINE proactivity with zero external dependency: it reads the
// real device clock and anticipates the household rhythm for that part of the
// day. Tapping the suggestion runs it through the same Adaptive Situation
// Engine as any typed request — so the cart is real, not canned.

// Each window maps the current hour to a household routine + a natural-language
// prompt the engine already understands.
const WINDOWS = [
  {
    match: (h) => h >= 5 && h < 10,
    part: "morning",
    emoji: "🌅",
    title: "Good morning — pooja & breakfast time",
    sub: "Most households are setting up the morning routine now.",
    cta: "Morning essentials",
    prompt: "subah ka time hai — pooja ke liye saamagri aur breakfast essentials chahiye",
  },
  {
    match: (h) => h >= 10 && h < 16,
    part: "midday",
    emoji: "🍱",
    title: "Midday — lunch & restock",
    sub: "A good time to top up groceries and plan lunch.",
    cta: "Lunch & groceries",
    prompt: "dopahar ka time hai — lunch aur ghar ke grocery staples chahiye",
  },
  {
    match: (h) => h >= 16 && h < 20,
    part: "evening",
    emoji: "☕",
    title: "Shaam ho gayi — chai & snacks?",
    sub: "Evening tea time. Want the usual chai-and-snacks run?",
    cta: "Chai & snacks",
    prompt: "shaam ki chai aur snacks chahiye, ghar pe mehmaan bhi aa sakte hain",
  },
  {
    match: (h) => h >= 20 || h < 5,
    part: "night",
    emoji: "🌙",
    title: "Winding down — set up for tomorrow",
    sub: "Get tomorrow's essentials in before you sleep.",
    cta: "Next-day essentials",
    prompt: "kal subah ke liye doodh, bread aur ghar ke daily essentials chahiye",
  },
];

export default function RoutineSuggestion({ onTrigger, now = new Date() }) {
  const [dismissed, setDismissed] = useState(false);
  const hour = now.getHours();
  const window = useMemo(() => WINDOWS.find((w) => w.match(hour)), [hour]);

  if (dismissed || !window) return null;

  return (
    <div className="proactive proactive-routine" role="status">
      <button
        className="proactive-close"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
      >
        ×
      </button>
      <div className="proactive-body">
        <span className="proactive-emoji">{window.emoji}</span>
        <div className="proactive-text">
          <p className="proactive-title">{window.title}</p>
          <p className="proactive-sub">{window.sub}</p>
        </div>
      </div>
      <button className="proactive-cta" onClick={() => onTrigger(window.prompt)}>
        ⚡ {window.cta}
      </button>
    </div>
  );
}
