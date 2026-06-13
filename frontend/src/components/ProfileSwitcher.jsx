export default function ProfileSwitcher({ profiles, currentId, onChange }) {
  return (
    <div className="profile-switcher">
      <span className="switch-label">Profile</span>
      <div className="profile-row">
        {profiles.map((p) => (
          <button
            key={p.id || "anon"}
            className={`profile-btn ${p.id === currentId ? "active" : ""}`}
            onClick={() => onChange(p.id)}
          >
            <span className="profile-name">{p.name}</span>
            <span className="profile-sub">{p.subtitle}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
