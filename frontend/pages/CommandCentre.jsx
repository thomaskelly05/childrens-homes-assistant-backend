import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import NotificationBell from '../components/NotificationBell';

export default function CommandCentre() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const t = await api.getMyTasks();
    setTasks(t || []);
  }

  return (
    <div className="command-centre">
      <header>
        <h1>IndiCare OS</h1>
        <NotificationBell />
      </header>

      <section>
        <h2>My Tasks</h2>
        {tasks.map(t => (
          <div key={t.id} className="task-card">
            <strong>{t.title}</strong>
            <p>{t.status}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
