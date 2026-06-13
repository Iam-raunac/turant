import { useMemo, useState } from "react";

// Feature: Neighborhood Pulse.
// A simulated "live demand" banner. In a real build this would come from
// area-level order telemetry; for the demo it's a hardcoded set of scenarios
// that rotate, with one-tap to generate the matching cart.

const PULSES = [
  {
    emoji: "🔴",
    count: 12,
    headline: "ordered Power Cut kits in the last hour",
    sub: "Heavy rain + outages reported in your area.",
    cta: "Get a Power Cut kit",
    prompt: "light chali gayi, monsoon hai bahar, ghar pe kuch nahi hai",
  },
  {
    emoji: "🤒",
    count: 9,
    headline: "ordered Cold & Cough kits nearby today",
    sub: "Seasonal flu going around your locality.",
    cta: "Get a Cold & Cough kit",
    prompt: "bukhar lag raha hai, throat bhi kharab hai",
  },
  {
    emoji: "🪔",
    count: 18,
    headline: "ordered Pooja saamagri in your area",
    sub: "Festival prep is peaking around you.",
    cta: "Get Pooja essentials",
    prompt: "ghar pe chhoti pooja hai, saamagri chahiye",
  },
];

export default function NeighborhoodPulse({ city, onTrigger }) {
  const [dismissed, setDismissed] = useState(false);
  // Pick one scenario per session so it feels organic ("kabhi kabhi dikhaye").
  const pulse = useMemo(() => PULSES[Math.floor(Math.random() * PULSES.length)], []);

  if (dismissed) return null;

  return (
    <div className="pulse" role="status">
      <button
        className="pulse-close"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
      >
        ×
      </button>
      <div className="pulse-body">
        <span className="pulse-emoji">{pulse.emoji}</span>
        <div className="pulse-text">
          <p className="pulse-headline">
            <strong>{pulse.count} people</strong> in {city || "your area"}{" "}
            {pulse.headline}. Need one too?
          </p>
          <p className="pulse-sub">{pulse.sub}</p>
        </div>
      </div>
      <button className="pulse-cta" onClick={() => onTrigger(pulse.prompt)}>
        ⚡ {pulse.cta}
      </button>
    </div>
  );
}
