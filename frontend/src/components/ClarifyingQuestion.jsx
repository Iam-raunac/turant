import { useState } from "react";

export default function ClarifyingQuestion({ question, onAnswer }) {
  const [reply, setReply] = useState("");

  return (
    <div className="clarify">
      <div className="clarify-bubble">
        <span className="clarify-emoji">🤔</span>
        <p>{question}</p>
      </div>
      <div className="clarify-input">
        <input
          type="text"
          value={reply}
          placeholder="Type your reply…"
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && reply.trim()) onAnswer(reply.trim());
          }}
        />
        <button
          className="clarify-btn"
          disabled={!reply.trim()}
          onClick={() => onAnswer(reply.trim())}
        >
          Send →
        </button>
      </div>
    </div>
  );
}
