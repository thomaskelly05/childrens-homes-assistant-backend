// frontend/js/services/founder-api.js

async function request(path, options = {}) {
  const res = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  if (res.status === 403) {
    throw new Error("FORBIDDEN");
  }

  if (!res.ok) {
    throw new Error("REQUEST_FAILED");
  }

  return res.json();
}

export const FounderAPI = {
  // =========================
  // HEALTH
  // =========================
  health() {
    return request("/founder/health");
  },

  // =========================
  // AI
  // =========================
  chat({ message, mode = "strategy", thread_id = null }) {
    return request("/founder/ai/chat", {
      method: "POST",
      body: JSON.stringify({ message, mode, thread_id }),
    });
  },

  quickAction(action) {
    return request("/founder/ai/quick-action", {
      method: "POST",
      body: JSON.stringify({ action }),
    });
  },

  // =========================
  // THREADS
  // =========================
  getThreads() {
    return request("/founder/threads");
  },

  getThreadMessages(threadId) {
    return request(`/founder/threads/${threadId}/messages`);
  },

  // =========================
  // DASHBOARD / SUMMARY
  // =========================
  getSummary() {
    return request("/founder/summary");
  },

  // =========================
  // LEADS (CRM)
  // =========================
  getLeads() {
    return request("/founder/leads");
  },

  createLead(data) {
    return request("/founder/leads/create", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // =========================
  // TASKS
  // =========================
  getTasks() {
    return request("/founder/tasks");
  },

  createTask(data) {
    return request("/founder/tasks/create", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};