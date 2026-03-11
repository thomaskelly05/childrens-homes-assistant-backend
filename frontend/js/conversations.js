window.conversationId = null;

async function loadConversations() {
  const list = document.getElementById("conversation-list");
  if (!list) return;

  const res = await fetch(API + "/chat/conversations", {
    credentials: "include"
  });

  if (!res.ok) {
    list.innerHTML = '<div class="sidebar-empty">Unable to load chats</div>';
    return;
  }

  const data = await res.json();
  list.innerHTML = "";

  if (!data.length) {
    list.innerHTML = '<div class="sidebar-empty">No recent chats yet</div>';
    return;
  }

  data.forEach((c) => {
    const row = document.createElement("div");
    row.className = "conversation-row";

    const main = document.createElement("button");
    main.className = "conversation-main";
    main.innerText = c.title || "Untitled chat";
    main.onclick = () => openConversation(c.id);

    const actions = document.createElement("div");
    actions.className = "conversation-actions";

    const renameBtn = document.createElement("button");
    renameBtn.className = "conversation-action-btn";
    renameBtn.innerText = "✎";
    renameBtn.title = "Rename chat";
    renameBtn.onclick = (e) => {
      e.stopPropagation();
      renameConversation(c.id, c.title || "Untitled chat");
    };

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "conversation-action-btn danger";
    deleteBtn.innerText = "×";
    deleteBtn.title = "Delete chat";
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      deleteConversation(c.id);
    };

    actions.appendChild(renameBtn);
    actions.appendChild(deleteBtn);

    row.appendChild(main);
    row.appendChild(actions);

    list.appendChild(row);
  });
}

window.loadConversations = loadConversations;

async function openConversation(id) {
  window.conversationId = id;

  const res = await fetch(API + "/chat/conversations/" + id, {
    credentials: "include"
  });

  if (!res.ok) return;

  const data = await res.json();
  const messages = document.getElementById("messages");
  if (!messages) return;

  messages.innerHTML = "";

  data.forEach((m) => {
    appendMessage(m.role, m.message);
  });
}

window.openConversation = openConversation;

async function renameConversation(id, currentTitle) {
  const nextTitle = prompt("Rename this chat", currentTitle || "Untitled chat");
  if (!nextTitle || !nextTitle.trim()) return;

  const res = await fetch(API + "/chat/conversations/" + id + "/rename", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: nextTitle.trim()
    })
  });

  if (!res.ok) {
    alert("Unable to rename chat");
    return;
  }

  await loadConversations();
}

window.renameConversation = renameConversation;

async function deleteConversation(id) {
  const confirmed = confirm("Delete this chat?");
  if (!confirmed) return;

  const res = await fetch(API + "/chat/conversations/" + id, {
    method: "DELETE",
    credentials: "include"
  });

  if (!res.ok) {
    alert("Unable to delete chat");
    return;
  }

  if (window.conversationId === id) {
    window.conversationId = null;
    const messages = document.getElementById("messages");
    if (messages) messages.innerHTML = "";
  }

  await loadConversations();
}

window.deleteConversation = deleteConversation;

function createConversation() {
  window.conversationId = null;

  const messages = document.getElementById("messages");
  if (messages) {
    messages.innerHTML = `
      <div id="welcome-panel" class="welcome-panel">
        <h1>Hello, how can I help today?</h1>
        <p>
          You can use IndiCare to reflect on practice, explore supervision topics,
          or ask about professional guidance.
        </p>

        <div class="welcome-suggestions">
          <button class="welcome-chip" onclick="fillPrompt('I would like to reflect on something that happened on shift')">
            Reflect on a shift
          </button>

          <button class="welcome-chip" onclick="fillPrompt('Help me prepare for supervision')">
            Prepare for supervision
          </button>

          <button class="welcome-chip" onclick="fillPrompt('What does the guidance say about safeguarding?')">
            Ask about guidance
          </button>
        </div>
      </div>
    `;
  }

  const input = document.getElementById("chat-input");
  if (input) input.focus();
}

window.createConversation = createConversation;
