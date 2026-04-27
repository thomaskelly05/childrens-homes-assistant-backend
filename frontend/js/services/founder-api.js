// frontend/js/services/founder-api.js

async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (response.status === 401) {
    throw new Error("UNAUTHENTICATED");
  }

  if (response.status === 403) {
    throw new Error("FORBIDDEN");
  }

  if (response.status === 404) {
    throw new Error("NOT_FOUND");
  }

  if (!response.ok) {
    throw new Error("REQUEST_FAILED");
  }

  return response.json();
}

export const FounderAPI = {
  // =========================
  // HEALTH
  // =========================
  health() {
    return request("/founder/health");
  },

  // =========================
  // DASHBOARD
  // =========================
  getSummary() {
    return request("/founder/summary");
  },

  // =========================
  // AI
  // =========================
  chat({ message, mode = "strategy", thread_id = null, title = null }) {
    return request("/founder/ai/chat", {
      method: "POST",
      body: JSON.stringify({
        message,
        mode,
        thread_id,
        title,
      }),
    });
  },

  quickAction(action) {
    return request("/founder/ai/quick-action", {
      method: "POST",
      body: JSON.stringify({
        action,
      }),
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
  // LEADS
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

  updateLeadStatus(leadId, status) {
    return request(`/founder/leads/${leadId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
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

  updateTaskStatus(taskId, status) {
    return request(`/founder/tasks/${taskId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  // =========================
  // STRATEGY NOTES
  // =========================
  getStrategyNotes() {
    return request("/founder/strategy-notes");
  },

  createStrategyNote(data) {
    return request("/founder/strategy-notes/create", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};