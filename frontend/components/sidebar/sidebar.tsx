export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="logo">IndiCare</div>
      <nav>
        <a href="/today" className="active">Today</a>
        <a href="/guidance">Guidance</a>
        <a href="/reflect">Reflect</a>
        <a href="/assistant">Assistant</a>
        <a href="/settings">Settings</a>
      </nav>
    </aside>
  );
}
