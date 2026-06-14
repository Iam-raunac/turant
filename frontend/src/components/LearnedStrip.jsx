// Shows what Turant has learned about this user from their actual orders.

export default function LearnedStrip({ profile }) {
  if (!profile || !profile.exists) return null;

  const counts = profile.item_counts || {};
  const names = profile.item_names || {};
  const top = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  if (!top.length) return null;

  return (
    <div className="learned-strip">
      <span className="learned-label">
        ✨ Turant remembers ({profile.order_count} order
        {profile.order_count === 1 ? "" : "s"}):
      </span>
      <div className="learned-chips">
        {top.map(([pid, count]) => (
          <span key={pid} className="learned-chip">
            {names[pid] || pid}
            <span className="learned-count">×{count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
