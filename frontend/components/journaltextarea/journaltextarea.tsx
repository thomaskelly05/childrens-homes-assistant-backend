export default function JournalTextArea({ label, value, onChange, placeholder }) {
  return (
    <div className="card">
      <h2>{label}</h2>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
