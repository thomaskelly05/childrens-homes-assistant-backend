async function fetchHtml(path) {
    const res = await fetch(path, { cache: "no-store" });

    if (!res.ok) {
        throw new Error(`Failed to load ${path} (${res.status})`);
    }

    return await res.text();
}

async function loadSidebar() {
    const sidebarEl = document.getElementById("sidebar");

    if (!sidebarEl) {
        console.warn("Sidebar container not found");
        return;
    }

    try {
        const html = await fetchHtml("/components/sidebar.html");
        sidebarEl.innerHTML = html;

        const newChatBtn = document.getElementById("new-chat-btn");

        if (newChatBtn && window.createConversation) {
            newChatBtn.onclick = window.createConversation;
        }

        if (window.loadConversations) {
            await window.loadConversations();
        }
    } catch (error) {
        console.error("Sidebar load error:", error);
        sidebarEl.innerHTML = `
            <div style="padding:16px; color:#b91c1c; font-family:Arial,sans-serif;">
                Could not load the sidebar.
            </div>
        `;
    }
}

async function loadWorkspace() {
    const workspaceEl = document.getElementById("workspace");

    if (!workspaceEl) {
        console.warn("Workspace container not found");
        return;
    }

    try {
        const html = await fetchHtml("/components/workspace.html");
        workspaceEl.innerHTML = html;

        if (window.initChat) {
            window.initChat();
        }

        if (window.initAssistantMeetingModal) {
            window.initAssistantMeetingModal();
        } else {
            console.error("initAssistantMeetingModal is not available");
        }

        if (window.createConversation) {
            window.createConversation();
        }
    } catch (error) {
        console.error("Workspace load error:", error);
        workspaceEl.innerHTML = `
            <div style="padding:16px; color:#b91c1c; font-family:Arial,sans-serif;">
                Could not load the workspace.
            </div>
        `;
    }
}

window.onload = async () => {
    try {
        await loadSidebar();
        await loadWorkspace();
    } catch (error) {
        console.error("App initialisation error:", error);
    }
};
