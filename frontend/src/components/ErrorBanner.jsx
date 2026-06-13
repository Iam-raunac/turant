export default function ErrorBanner({ message, onDismiss }) {
  return (
    <div className="error-banner">
      <span>⚠ {message}</span>
      <button onClick={onDismiss}>Dismiss</button>
    </div>
  );
}
