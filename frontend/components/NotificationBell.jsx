import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function NotificationBell() {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const c = await api.getUnreadNotifications();
    setCount(c.count || 0);
    const list = await api.getNotifications();
    setItems(list.items || []);
  }

  return (
    <div className="notif-wrapper">
      <button onClick={() => setOpen(!open)} className="notif-btn">
        🔔 {count > 0 && <span className="badge">{count}</span>}
      </button>

      {open && (
        <div className="notif-dropdown">
          {items.map(n => (
            <div key={n.id} className="notif-item">
              <strong>{n.title}</strong>
              <p>{n.body}</p>
              <button onClick={() => api.markNotificationRead(n.id)}>Mark read</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
