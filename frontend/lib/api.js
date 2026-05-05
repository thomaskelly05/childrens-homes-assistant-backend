const DEFAULT_API_BASE = 'https://app.indicare.co.uk';

export const API_BASE =
  window.__INDICARE_API_BASE__ ||
  import.meta?.env?.VITE_API_BASE_URL ||
  DEFAULT_API_BASE;

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || error.error || 'Request failed');
  }

  return response.json();
}

export const api = {
  getCommandCentre: () => request('/command-centre'),
  getMyTasks: () => request('/tasks/my'),
  getNotifications: () => request('/notifications'),
  getUnreadNotifications: () => request('/notifications/unread-count'),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'POST' }),
  dismissNotification: (id) => request(`/notifications/${id}/dismiss`, { method: 'POST' }),
  askChildAssistant: (youngPersonId, question) => request('/assistant/os/reason', {
    method: 'POST',
    body: JSON.stringify({ young_person_id: youngPersonId, question }),
  }),
  getAiAuditLogs: () => request('/api/ai-audit'),
  getAiAuditLog: (id) => request(`/api/ai-audit/${id}`),
};
