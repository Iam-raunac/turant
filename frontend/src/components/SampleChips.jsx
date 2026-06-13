export default function SampleChips({ prompts, onPick }) {
  return (
    <div className="chips">
      <span className="chips-label">Try one:</span>
      {prompts.map((p, i) => (
        <button key={i} className="chip" onClick={() => onPick(p)} title={p}>
          {p.length > 36 ? p.slice(0, 35) + "…" : p}
        </button>
      ))}
    </div>
  );
}
