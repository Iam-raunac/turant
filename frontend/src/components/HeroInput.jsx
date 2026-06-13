export default function HeroInput({ value, onChange, onSubmit, placeholder }) {
  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  }

  return (
    <div className="hero-input">
      <textarea
        className="hero-input-field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        rows={2}
        maxLength={500}
      />
      <button
        className="hero-input-btn"
        onClick={onSubmit}
        disabled={!value.trim()}
      >
        Build my cart →
      </button>
    </div>
  );
}
