export default function ModeToggle({ mode, onModeChange, budget, onBudgetChange }) {
  return (
    <div className="mode-toggle">
      <span className="switch-label">Mode</span>
      <div className="mode-row">
        <button
          className={`mode-btn ${mode === "single" ? "active" : ""}`}
          onClick={() => onModeChange("single")}
        >
          One confident cart
        </button>
        <button
          className={`mode-btn ${mode === "battle" ? "active" : ""}`}
          onClick={() => onModeChange("battle")}
        >
          Cart Battle <span className="badge">Budget vs Premium</span>
        </button>
      </div>
      {mode === "battle" && (
        <div className="budget-row">
          <label htmlFor="budget">Target budget ₹</label>
          <input
            id="budget"
            type="number"
            min={100}
            step={50}
            value={budget}
            onChange={(e) => onBudgetChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
