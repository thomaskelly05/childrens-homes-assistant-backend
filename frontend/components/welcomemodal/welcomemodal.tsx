export default function WelcomeModal({ onClose }) {
  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h2>Welcome to today.</h2>
        <p>
          Take a moment to settle in. This space is here to support your thinking,
          your practice, and your wellbeing as you step into the day.
        </p>
        <button onClick={onClose}>Enter my dashboard</button>
      </div>
    </div>
  );
}
