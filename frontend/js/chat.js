window.conversationId = null;
window.currentDocumentText = null;
window.currentDocumentName = null;

const chatState = {
    historyRows: [],
    theme: localStorage.getItem("indicare-theme") || "light",
    recognition: null,
    isRecording: false,
    speechSupported: false,
    draftKeyPrefix: "indicare-chat-draft:",
    isStreamingResponse: false
};

function initChat() {
    applyTheme(chatState.theme);
    bindChatInput();
    bindConversationButtons();
    bindDocumentUpload();
    bindLogout();
    bindHistorySearch();
    bindSidebarControls();
    bindThemeToggle();
    bindGlobalMessageActions();
    bindResponseMode();
    initSpeechToText();
    applyWelcomeMessage();
    applyFooterMeta();
    refreshUploadStatus();
    restoreDraft();
    loadConversations(true);
}

window.initChat = initChat;

function bindChatInput() {
    const sendBtn = document.getElementById("send-btn");
    const input = document.getElementById("chat-input");
    const clearBtn = document.getElementById("clearChatBtn");

    if (!sendBtn || !input) return;

    autoResizeTextarea(input);

    sendBtn.addEventListener("click", sendMessage);

    input.addEventListener("input", () => {
        autoResizeTextarea(input);
        saveDraft();
    });

    input.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
            e.preventDefault();
            document.getElementById("historySearch")?.focus();
            return;
        }

        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    clearBtn?.addEventListener("click", () => {
        input.value = "";
        autoResizeTextarea(input);
        saveDraft();
        input.focus();
    });

    document.querySelectorAll(".ica-prompt-chip").forEach((chip) => {
        chip.addEventListener("click", () => {
            input.value = chip.textContent?.trim() || "";
            autoResizeTextarea(input);
            saveDraft();
            input.focus();
        });
    });
}

function bindConversationButtons() {
    document.getElementById("newConversationBtn")?.addEventListener("click", startNewConversation);
    document.getElementById("headerNewChatBtn")?.addEventListener("click", startNewConversation);
}

function bindHistorySearch() {
    const search = document.getElementById("historySearch");
    if (!search) return;

    search.addEventListener("input", () => {
        renderConversationList(chatState.historyRows, search.value.trim());
    });
}

function bindSidebarControls() {
    const shell = document.getElementById("assistantShell");
    const toggle = document.getElementById("sidebarToggle");
    const backdrop = document.getElementById("sidebarBackdrop");

    if (!shell) return;

    toggle?.addEventListener("click", () => {
        shell.classList.toggle("is-sidebar-open");
        toggle.setAttribute("aria-expanded", String(shell.classList.contains("is-sidebar-open")));
    });

    backdrop?.addEventListener("click", closeSidebar);

    window.addEventListener("resize", () => {
        if (window.innerWidth > 980) closeSidebar();
    });
}

function bindThemeToggle() {
    document.getElementById("themeToggle")?.addEventListener("click", () => {
        applyTheme(chatState.theme === "dark" ? "light" : "dark");
    });
}

function bindResponseMode() {
    const select = document.getElementById("responseMode");
    if (!select) return;

    const saved = localStorage.getItem("indicare-response-mode");
    if (saved && ["quick", "balanced", "deep"].includes(saved)) {
        select.value = saved;
    }

    select.addEventListener("change", () => {
        const value = getResponseMode();
        localStorage.setItem("indicare-response-mode", value);
        showStatusBanner("success", `Response mode set to ${labelForResponseMode(value)}.`);
    });
}

function getResponseMode() {
    const select = document.getElementById("responseMode");
    const value = select?.value || localStorage.getItem("indicare-response-mode") || "balanced";
    return ["quick", "balanced", "deep"].includes(value) ? value : "balanced";
}

function labelForResponseMode(value) {
    if (value === "quick") return "Quick";
    if (value === "deep") return "Deep review";
    return "Balanced";
}

function bindGlobalMessageActions() {
    const messages = document.getElementById("messages");
    if (!messages) return;

    messages.addEventListener("click", async (event) => {
        const copyBtn = event.target.closest("[data-copy-text]");
        if (copyBtn) {
            const text = copyBtn.getAttribute("data-copy-text") || "";
            try {
                await navigator.clipboard.writeText(text);
                const original = copyBtn.textContent;
                copyBtn.textContent = "Copied";
                setTimeout(() => {
                    copyBtn.textContent = original;
                }, 1500);
            } catch (err) {
                console.error("Copy failed:", err);
            }
            return;
        }

        const editBtn = event.target.closest("[data-edit-message-id]");
        if (editBtn) {
            const messageId = editBtn.getAttribute("data-edit-message-id");
            const currentText = decodeURIComponent(editBtn.getAttribute("data-current-text") || "");
            if (messageId) await startInlineMessageEdit(messageId, currentText);
            return;
        }

        const cancelBtn = event.target.closest("[data-cancel-edit-message-id]");
        if (cancelBtn) {
            const messageId = cancelBtn.getAttribute("data-cancel-edit-message-id");
            if (messageId) cancelInlineMessageEdit(messageId);
            return;
        }

        const saveBtn = event.target.closest("[data-save-edit-message-id]");
        if (saveBtn) {
            const messageId = saveBtn.getAttribute("data-save-edit-message-id");
            if (messageId) await submitInlineMessageEdit(messageId);
        }
    });

    messages.addEventListener("keydown", async (event) => {
        const textarea = event.target.closest(".ica-inline-edit-textarea");
        if (!textarea) return;

        const messageId = textarea.getAttribute("data-editing-message-id");
        if (!messageId) return;

        if (event.key === "Escape") {
            event.preventDefault();
            cancelInlineMessageEdit(messageId);
        }

        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            await submitInlineMessageEdit(messageId);
        }
    });

    messages.addEventListener("input", (event) => {
        const textarea = event.target.closest(".ica-inline-edit-textarea");
        if (!textarea) return;
        autoResizeTextarea(textarea);
    });
}

function applyTheme(theme) {
    chatState.theme = theme;
    localStorage.setItem("indicare-theme", theme);
    document.body.classList.toggle("theme-dark", theme === "dark");
}

function closeSidebar() {
    const shell = document.getElementById("assistantShell");
    const toggle = document.getElementById("sidebarToggle");
    if (!shell) return;

    shell.classList.remove("is-sidebar-open");
    toggle?.setAttribute("aria-expanded", "false");
}

function bindDocumentUpload() {
    const uploadInput = document.getElementById("documentUpload");
    const clearBtn = document.getElementById("clearDocumentBtn");

    uploadInput?.addEventListener("change", async () => {
        const file = uploadInput.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        if (window.conversationId) {
            formData.append("conversation_id", String(window.conversationId));
        }

        setUploadStatus(`Uploading ${file.name}...`);
        showStatusBanner("success", `Uploading ${file.name}...`);

        try {
            const token = localStorage.getItem("access_token");

            const response = await fetch("/chat/upload", {
                method: "POST",
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                credentials: "include",
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem("access_token");
                    localStorage.removeItem("current_user");
                    window.location.href = "/login";
                    return;
                }

                setUploadStatus(data.detail || "Upload failed.");
                showStatusBanner("error", data.detail || "Upload failed.");
                return;
            }

            window.currentDocumentText = data.text || "";
            window.currentDocumentName = data.filename || file.name;
            refreshUploadStatus();
            showStatusBanner("success", "Document attached.");
        } catch (error) {
            console.error("Upload failed:", error);
            setUploadStatus("Could not upload the document.");
            showStatusBanner("error", "Could not upload the document.");
        } finally {
            uploadInput.value = "";
        }
    });

    clearBtn?.addEventListener("click", async () => {
        if (window.conversationId) {
            try {
                await apiRequest(`/chat/conversations/${window.conversationId}/document`, {
                    method: "DELETE"
                });
            } catch (error) {
                console.error("Failed to clear stored document:", error);
            }
        }

        window.currentDocumentText = null;
        window.currentDocumentName = null;
        refreshUploadStatus();
        showStatusBanner("warn", "Document removed.");
    });
}

function setUploadStatus(text) {
    const uploadStatus = document.getElementById("uploadStatus");
    if (uploadStatus) uploadStatus.textContent = text || "";
}

function refreshUploadStatus() {
    const chip = document.getElementById("documentChip");
    const chipText = document.getElementById("documentChipText");

    if (window.currentDocumentName && window.currentDocumentText) {
        chip?.classList.remove("ica-hidden");
        if (chipText) chipText.textContent = window.currentDocumentName;
        setUploadStatus("Document attached to this chat.");
    } else {
        chip?.classList.add("ica-hidden");
        if (chipText) chipText.textContent = "";
        setUploadStatus("");
    }
}

function showStatusBanner(type, message) {
    const banner = document.getElementById("statusBanner");
    if (!banner) return;

    const icons = {
        success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"></path></svg>`,
        warn: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4"></path><path d="M12 17h.01"></path><path d="M10.3 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0z"></path></svg>`,
        error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18"></path><path d="M6 6l12 12"></path></svg>`
    };

    banner.className = `ica-status-banner is-show is-${type}`;
    banner.innerHTML = `${icons[type] || ""}<span>${escapeHtml(message)}</span>`;

    clearTimeout(showStatusBanner._timer);
    showStatusBanner._timer = setTimeout(() => {
        banner.className = "ica-status-banner";
        banner.innerHTML = "";
    }, 2800);
}

function bindLogout() {
    const logoutBtn = document.getElementById("logoutBtn");
    if (!logoutBtn) return;

    logoutBtn.addEventListener("click", async () => {
        try {
            localStorage.removeItem("access_token");
            localStorage.removeItem("current_user");

            try {
                await apiRequest("/auth/logout", { method: "POST" });
            } catch (_) {}

            window.location.href = "/login";
        } catch (_) {
            window.location.href = "/login";
        }
    });
}

function getAdultFirstName() {
    try {
        const raw = localStorage.getItem("current_user");
        if (!raw) return "";
        const parsed = JSON.parse(raw);

        if (parsed?.first_name) return String(parsed.first_name).trim();
        if (parsed?.user?.first_name) return String(parsed.user.first_name).trim();
        if (parsed?.adult?.first_name) return String(parsed.adult.first_name).trim();

        return "";
    } catch (error) {
        console.error("Could not read first_name from current_user:", error);
        return "";
    }
}

function getUserInitials() {
    const firstName = getAdultFirstName();
    if (firstName) return firstName.trim().slice(0, 1).toUpperCase();
    return "Y";
}

function getTimeGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
}

function applyWelcomeMessage() {
    const heading = document.getElementById("welcomeHeading");
    const subtext = document.getElementById("welcomeSubtext");

    if (!heading || !subtext) return;

    const firstName = getAdultFirstName();
    const greeting = getTimeGreeting();

    heading.textContent = firstName ? `${greeting}, ${firstName}` : greeting;

    subtext.textContent = firstName
        ? `How can I help with support for ${firstName} today? Ask for help with care records, professional wording, reflection, planning, behaviour support, key work ideas, incident follow-up, or day-to-day residential practice.`
        : `How can I help today? Ask for help with care records, professional wording, reflection, planning, behaviour support, key work ideas, incident follow-up, or day-to-day residential practice.`;
}

function applyFooterMeta() {
    const warning = document.getElementById("footerWarning");
    const copyright = document.getElementById("footerCopyright");

    if (warning) {
        warning.textContent = "Important: Always accuracy-check AI outputs against the facts provided, current guidance, and your organisation’s policy before use.";
    }

    if (copyright) {
        copyright.textContent = `© ${new Date().getFullYear()} IndiCare. All rights reserved.`;
    }
}

function initSpeechToText() {
    const micBtn = document.getElementById("micBtn");
    const input = document.getElementById("chat-input");
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!micBtn || !input || !SpeechRecognition) {
        if (micBtn) {
            micBtn.disabled = true;
            micBtn.title = "Speech to text not supported in this browser";
            micBtn.setAttribute("aria-label", "Speech to text not supported");
        }
        return;
    }

    chatState.speechSupported = true;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-GB";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    let baseTextBeforeRecording = "";
    let micBusy = false;

    recognition.onstart = () => {
        chatState.isRecording = true;
        baseTextBeforeRecording = input.value.trim();
        micBtn.classList.add("is-recording");
        micBtn.setAttribute("aria-label", "Stop voice input");
        micBtn.title = "Listening… click to stop";
        showStatusBanner("success", "Listening…");
    };

    recognition.onresult = (event) => {
        const results = Array.from(event.results);
        const transcript = results.map((r) => r[0].transcript).join(" ").trim();

        input.value = [baseTextBeforeRecording, transcript].filter(Boolean).join(baseTextBeforeRecording ? " " : "");
        autoResizeTextarea(input);
        saveDraft();
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);

        if (event.error === "aborted") {
            stopMicVisualState();
            return;
        }

        if (event.error === "no-speech") {
            stopMicVisualState();
            showStatusBanner("warn", "No speech was detected.");
            return;
        }

        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
            stopMicVisualState();
            showStatusBanner("error", "Microphone access was not allowed.");
            return;
        }

        stopMicVisualState();
        showStatusBanner("error", "Voice input could not be completed.");
    };

    recognition.onend = () => {
        stopMicVisualState();
        input.focus();
        saveDraft();
    };

    micBtn.addEventListener("click", () => {
        if (micBusy) return;

        if (!chatState.isRecording) {
            try {
                micBusy = true;
                recognition.start();
                setTimeout(() => {
                    micBusy = false;
                }, 400);
            } catch (error) {
                micBusy = false;
                console.error("Could not start speech recognition:", error);
            }
        } else {
            micBusy = true;
            recognition.stop();
            setTimeout(() => {
                micBusy = false;
            }, 400);
        }
    });

    chatState.recognition = recognition;
}

function stopMicVisualState() {
    const micBtn = document.getElementById("micBtn");
    chatState.isRecording = false;

    if (micBtn) {
        micBtn.classList.remove("is-recording");
        micBtn.setAttribute("aria-label", "Start voice input");
        micBtn.title = "Start voice input";
    }
}

function getDraftStorageKey() {
    return `${chatState.draftKeyPrefix}${window.conversationId || "new"}`;
}

function saveDraft() {
    const input = document.getElementById("chat-input");
    if (!input) return;
    localStorage.setItem(getDraftStorageKey(), input.value || "");
}

function restoreDraft() {
    const input = document.getElementById("chat-input");
    if (!input) return;

    const draft = localStorage.getItem(getDraftStorageKey()) || "";
    if (draft) {
        input.value = draft;
        autoResizeTextarea(input);
    } else {
        input.value = "";
        autoResizeTextarea(input);
    }
}

function clearDraft() {
    localStorage.removeItem(getDraftStorageKey());
}

async function sendMessage() {
    const input = document.getElementById("chat-input");
    if (!input || chatState.isStreamingResponse) return;

    const message = input.value.trim();
    if (!message) return;

    removeChatEmptyState();
    ensureMessagesContainer();
    appendMessage("user", message);
    input.value = "";
    autoResizeTextarea(input);
    clearDraft();

    setSendLoading(true);
    showTypingIndicator(true);
    chatState.isStreamingResponse = true;

    try {
        await streamAssistantResponse("/chat/", {
            message,
            conversation_id: window.conversationId || null,
            document_text: window.currentDocumentText,
            document_name: window.currentDocumentName,
            response_mode: getResponseMode()
        });

        await loadConversations(true);
    } finally {
        chatState.isStreamingResponse = false;
        showTypingIndicator(false);
        setSendLoading(false);
    }
}

async function streamAssistantResponse(url, bodyData) {
    try {
        const token = localStorage.getItem("access_token");

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            credentials: "include",
            body: JSON.stringify(bodyData)
        });

        if (!response.ok || !response.body) {
            let data = {};
            try {
                data = await response.json();
            } catch {
                data = {};
            }

            console.error("Chat request failed:", {
                status: response.status,
                data
            });

            if (response.status === 401) {
                localStorage.removeItem("access_token");
                localStorage.removeItem("current_user");
                window.location.href = "/login";
                return;
            }

            appendMessage("assistant", data.detail || `Request failed (${response.status}).`);
            showStatusBanner("error", data.detail || `Request failed (${response.status}).`);
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let fullAssistantMessage = "";
        let renderBuffer = "";
        let isRendering = false;
        let streamFinished = false;

        createOrResetStreamingAssistantMessage();

        async function flushRenderBuffer() {
            if (isRendering) return;
            isRendering = true;

            while (renderBuffer.length > 0) {
                fullAssistantMessage += renderBuffer[0];
                renderBuffer = renderBuffer.slice(1);

                updateAssistantMessage(fullAssistantMessage);

                await new Promise((resolve) => setTimeout(resolve, 8));
            }

            isRendering = false;
        }

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                streamFinished = true;
                break;
            }

            const chunk = decoder.decode(value, { stream: true });
            renderBuffer += chunk;
            flushRenderBuffer();
        }

        while (!streamFinished || renderBuffer.length > 0 || isRendering) {
            await new Promise((resolve) => setTimeout(resolve, 10));

            if (!isRendering && renderBuffer.length > 0) {
                flushRenderBuffer();
            }

            if (streamFinished && renderBuffer.length === 0 && !isRendering) {
                break;
            }
        }
    } catch (error) {
        console.error("Stream failed:", error);

        const isNetworkDrop =
            error instanceof TypeError &&
            /load failed|network connection was lost|fetch/i.test(String(error.message || error));

        if (isNetworkDrop) {
            appendMessage("assistant", "The connection dropped while waiting for a response. Please try again.");
            showStatusBanner("error", "The connection was lost while generating the reply.");
            return;
        }

        appendMessage("assistant", `Connection error: ${error?.message || "Unknown error"}`);
        showStatusBanner("error", "The connection was lost while generating the reply.");
    }
}

function createMessageElement(role, text = "", messageId = null, timestamp = null) {
    const wrapper = document.createElement("div");
    wrapper.className = `ica-message-wrapper ${role === "user" ? "is-user" : "is-assistant"}`;
    if (messageId) wrapper.dataset.messageId = messageId;

    const avatar = document.createElement("div");
    avatar.className = "ica-message-avatar";
    avatar.textContent = role === "assistant" ? "IC" : getUserInitials();

    const block = document.createElement("div");
    block.className = "ica-message-block";

    const meta = document.createElement("div");
    meta.className = "ica-message-meta";

    const roleLabel = role === "assistant" ? "IndiCare" : "You";
    const displayTime = formatTime(timestamp ? new Date(timestamp) : new Date());

    if (role === "assistant") {
        meta.innerHTML = `<span class="ica-message-role-dot"></span><span>${roleLabel} · ${displayTime}</span>`;
    } else {
        meta.textContent = `${roleLabel} · ${displayTime}`;
    }

    const msg = document.createElement("div");
    msg.className = `ica-message ${role === "user" ? "is-user" : "is-assistant"}`;

    block._messageEl = msg;
    block._rawText = text;
    block._messageId = messageId;

    if (role === "assistant") {
        msg.innerHTML = renderMarkdown(text);

        const actions = document.createElement("div");
        actions.className = "ica-message-actions";

        const copyBtn = document.createElement("button");
        copyBtn.className = "ica-copy-btn";
        copyBtn.type = "button";
        copyBtn.textContent = "Copy";
        copyBtn.setAttribute("data-copy-text", text);

        actions.appendChild(copyBtn);
        block.appendChild(meta);
        block.appendChild(msg);
        block.appendChild(actions);
    } else {
        msg.textContent = text;

        const actions = document.createElement("div");
        actions.className = "ica-message-actions";

        if (messageId) {
            const editBtn = document.createElement("button");
            editBtn.className = "ica-copy-btn";
            editBtn.type = "button";
            editBtn.textContent = "Edit";
            editBtn.setAttribute("data-edit-message-id", messageId);
            editBtn.setAttribute("data-current-text", encodeURIComponent(text));
            actions.appendChild(editBtn);
        }

        block.appendChild(meta);
        block.appendChild(msg);
        if (messageId) block.appendChild(actions);
    }

    if (role === "user") {
        wrapper.appendChild(block);
        wrapper.appendChild(avatar);
    } else {
        wrapper.appendChild(avatar);
        wrapper.appendChild(block);
    }

    return wrapper;
}

function appendMessage(role, text, messageId = null, timestamp = null) {
    const messages = ensureMessagesContainer();
    if (!messages) return;

    const el = createMessageElement(role, text, messageId, timestamp);
    messages.appendChild(el);
    scrollChatToBottom();
}

function createOrResetStreamingAssistantMessage() {
    const messages = ensureMessagesContainer();
    if (!messages) return;

    const wrapper = createMessageElement("assistant", "");
    wrapper.dataset.streaming = "true";
    messages.appendChild(wrapper);
    scrollChatToBottom();
}

function updateAssistantMessage(text) {
    const messages = document.getElementById("messages");
    if (!messages) return;

    const streamingWrappers = messages.querySelectorAll('.ica-message-wrapper.is-assistant[data-streaming="true"]');
    const lastStreaming = streamingWrappers[streamingWrappers.length - 1];
    const lastAssistant = lastStreaming || messages.querySelector(".ica-message-wrapper.is-assistant:last-of-type");

    if (!lastAssistant) {
        appendMessage("assistant", text);
        return;
    }

    const block = lastAssistant.querySelector(".ica-message-block");
    const msg = block?.querySelector(".ica-message.is-assistant");
    const copyBtn = block?.querySelector("[data-copy-text]");

    if (msg) msg.innerHTML = renderMarkdown(text);
    if (block) block._rawText = text;
    if (copyBtn) copyBtn.setAttribute("data-copy-text", text);

    scrollChatToBottom();
}

function renderMarkdown(text) {
    const source = String(text || "").replace(/\r\n/g, "\n");
    const escaped = escapeHtml(source);
    const lines = escaped.split("\n");

    let html = "";
    let inCodeBlock = false;
    let inUl = false;
    let inOl = false;
    let inBlockquote = false;
    let paragraphBuffer = [];

    function flushParagraph() {
        if (!paragraphBuffer.length) return;
        html += `<p>${paragraphBuffer.join("<br>")}</p>`;
        paragraphBuffer = [];
    }

    function closeLists() {
        if (inUl) {
            html += "</ul>";
            inUl = false;
        }
        if (inOl) {
            html += "</ol>";
            inOl = false;
        }
    }

    function closeBlockquote() {
        if (inBlockquote) {
            html += "</blockquote>";
            inBlockquote = false;
        }
    }

    for (const rawLine of lines) {
        const line = rawLine;

        if (line.trim().startsWith("```")) {
            flushParagraph();
            closeLists();
            closeBlockquote();

            if (!inCodeBlock) {
                inCodeBlock = true;
                html += "<pre><code>";
            } else {
                inCodeBlock = false;
                html += "</code></pre>";
            }
            continue;
        }

        if (inCodeBlock) {
            html += `${line}\n`;
            continue;
        }

        if (!line.trim()) {
            flushParagraph();
            closeLists();
            closeBlockquote();
            continue;
        }

        const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
        if (headingMatch) {
            flushParagraph();
            closeLists();
            closeBlockquote();
            const level = headingMatch[1].length;
            html += `<h${level}>${applyInlineMarkdown(headingMatch[2])}</h${level}>`;
            continue;
        }

        const blockquoteMatch = line.match(/^&gt;\s?(.*)$/);
        if (blockquoteMatch) {
            flushParagraph();
            closeLists();
            if (!inBlockquote) {
                html += "<blockquote>";
                inBlockquote = true;
            }
            html += `<p>${applyInlineMarkdown(blockquoteMatch[1])}</p>`;
            continue;
        } else {
            closeBlockquote();
        }

        const ulMatch = line.match(/^[-*]\s+(.*)$/);
        if (ulMatch) {
            flushParagraph();
            if (inOl) {
                html += "</ol>";
                inOl = false;
            }
            if (!inUl) {
                html += "<ul>";
                inUl = true;
            }
            html += `<li>${applyInlineMarkdown(ulMatch[1])}</li>`;
            continue;
        }

        const olMatch = line.match(/^\d+\.\s+(.*)$/);
        if (olMatch) {
            flushParagraph();
            if (inUl) {
                html += "</ul>";
                inUl = false;
            }
            if (!inOl) {
                html += "<ol>";
                inOl = true;
            }
            html += `<li>${applyInlineMarkdown(olMatch[1])}</li>`;
            continue;
        }

        closeLists();
        paragraphBuffer.push(applyInlineMarkdown(line));
    }

    flushParagraph();
    closeLists();
    closeBlockquote();

    if (inCodeBlock) html += "</code></pre>";

    return html;
}

function applyInlineMarkdown(text) {
    return String(text)
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/__(.*?)__/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/_(.*?)_/g, "<em>$1</em>")
        .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function removeChatEmptyState() {
    const empty = document.getElementById("chatEmpty");
    if (empty) empty.hidden = true;
}

function clearChatWindow() {
    const messages = document.getElementById("messages");
    const empty = document.getElementById("chatEmpty");

    if (messages) {
        messages.innerHTML = "";
        messages.hidden = true;
    }

    if (empty) empty.hidden = false;

    showTypingIndicator(false);
    applyWelcomeMessage();
}

function ensureMessagesContainer() {
    const messages = document.getElementById("messages");
    if (!messages) return null;

    messages.hidden = false;
    removeChatEmptyState();
    return messages;
}

function startNewConversation() {
    window.conversationId = null;
    window.currentDocumentText = null;
    window.currentDocumentName = null;
    clearChatWindow();
    setConversationHeading("New conversation");
    renderConversationSelection();
    refreshUploadStatus();
    restoreDraft();
    closeSidebar();
}

function setConversationHeading(text) {
    const heading = document.getElementById("conversationHeading");
    if (heading) heading.textContent = text || "New conversation";
}

function setSendLoading(isLoading) {
    const sendBtn = document.getElementById("send-btn");
    if (!sendBtn) return;

    sendBtn.classList.toggle("is-loading", isLoading);
    sendBtn.disabled = isLoading;
}

function showTypingIndicator(show) {
    const typingRow = document.getElementById("typingRow");
    if (!typingRow) return;

    typingRow.hidden = !show;
    if (show) scrollChatToBottom();
}

async function loadConversations(autoOpenLatest = false) {
    const list = document.getElementById("conversationList");
    if (!list) return;

    try {
        const rows = await apiRequest("/chat/conversations");
        chatState.historyRows = Array.isArray(rows) ? rows : [];

        if (!chatState.historyRows.length) {
            list.innerHTML = `<div class="ica-history-empty">No conversations yet.</div>`;
            updateHistoryCount(0);
            if (!window.conversationId) setConversationHeading("New conversation");
            return;
        }

        if (autoOpenLatest && !window.conversationId) {
            await openConversation(chatState.historyRows[0].id, chatState.historyRows[0].title || "Conversation", false);
        }

        const searchValue = document.getElementById("historySearch")?.value?.trim() || "";
        renderConversationList(chatState.historyRows, searchValue);
    } catch (error) {
        console.error("Failed to load conversations:", error);
        list.innerHTML = `<div class="ica-history-empty">Could not load conversations.</div>`;
        updateHistoryCount(0);
    }
}

function renderConversationList(rows, filter = "") {
    const list = document.getElementById("conversationList");
    if (!list) return;

    const query = filter.toLowerCase();
    const filteredRows = rows.filter((row) => {
        const title = String(row.title || "New chat").toLowerCase();
        return !query || title.includes(query);
    });

    updateHistoryCount(filteredRows.length);

    if (!filteredRows.length) {
        list.innerHTML = `<div class="ica-history-empty">No matching conversations found.</div>`;
        return;
    }

    list.innerHTML = filteredRows.map((row) => `
        <article class="ica-history-item ${String(window.conversationId) === String(row.id) ? "is-active" : ""}" data-row-id="${row.id}" tabindex="0">
            <div class="ica-history-item-top">
                <div class="ica-history-item-title">${escapeHtml(row.title || "New chat")}</div>
                <div class="ica-history-actions">
                    <button class="ica-history-icon-btn" type="button" data-open-id="${row.id}" data-title="${escapeHtmlAttr(row.title || "Conversation")}" aria-label="Open conversation" title="Open">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6"></path><path d="M10 14L21 3"></path><path d="M21 14v7H3V3h7"></path></svg>
                    </button>
                    <button class="ica-history-icon-btn" type="button" data-rename-id="${row.id}" data-title="${escapeHtmlAttr(row.title || "Conversation")}" aria-label="Rename conversation" title="Rename">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path></svg>
                    </button>
                    <button class="ica-history-icon-btn" type="button" data-delete-id="${row.id}" aria-label="Delete conversation" title="Delete">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M19 6l-1 14H6L5 6"></path></svg>
                    </button>
                </div>
            </div>
            <div class="ica-history-item-meta">${escapeHtml(formatDate(row.created_at))}</div>
            <div class="ica-history-item-preview">${escapeHtml(row.title || "Conversation")}</div>
        </article>
    `).join("");

    list.querySelectorAll("[data-open-id]").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            await openConversation(btn.dataset.openId, btn.dataset.title || "Conversation");
        });
    });

    list.querySelectorAll("[data-rename-id]").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            await renameConversationInline(btn.dataset.renameId, btn.dataset.title || "");
        });
    });

    list.querySelectorAll("[data-delete-id]").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            await deleteConversation(btn.dataset.deleteId);
        });
    });

    list.querySelectorAll(".ica-history-item").forEach((item) => {
        item.addEventListener("click", async () => {
            const openBtn = item.querySelector("[data-open-id]");
            if (!openBtn) return;
            await openConversation(openBtn.dataset.openId, openBtn.dataset.title || "Conversation");
        });

        item.addEventListener("keydown", async (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                const openBtn = item.querySelector("[data-open-id]");
                if (openBtn) await openConversation(openBtn.dataset.openId, openBtn.dataset.title || "Conversation");
            }
        });
    });
}

function updateHistoryCount(count) {
    const countEl = document.getElementById("historyCount");
    if (countEl) countEl.textContent = String(count);
}

function renderConversationSelection() {
    document.querySelectorAll(".ica-history-item").forEach((item) => {
        item.classList.remove("is-active");
    });
}

async function openConversation(conversationId, title = "Conversation", reloadList = true) {
    try {
        const payload = await apiRequest(`/chat/conversations/${conversationId}`);
        window.conversationId = conversationId;

        const rows = Array.isArray(payload.messages) ? payload.messages : [];
        const documentInfo = payload.document || null;

        window.currentDocumentText = documentInfo?.text || null;
        window.currentDocumentName = documentInfo?.filename || null;
        refreshUploadStatus();

        clearChatWindow();

        if (rows.length) {
            ensureMessagesContainer();
            rows.forEach((row) => {
                appendMessage(row.role, row.message || "", row.id || null, row.created_at || null);
            });
        }

        setConversationHeading(title || "Conversation");

        if (reloadList) {
            await loadConversations(false);
        }

        restoreDraft();
        closeSidebar();
    } catch (error) {
        console.error("Failed to open conversation:", error);
        showStatusBanner("error", "Failed to open conversation.");
    }
}

async function renameConversationInline(conversationId, currentTitle = "") {
    const button = document.querySelector(`.ica-history-item [data-rename-id="${cssEscapeSafe(String(conversationId))}"]`);
    const item = button?.closest(".ica-history-item");
    if (!item) return;

    const titleEl = item.querySelector(".ica-history-item-title");
    if (!titleEl) return;
    if (item.querySelector(".ica-rename-input")) return;

    const input = document.createElement("input");
    input.className = "ica-rename-input";
    input.value = currentTitle;
    input.type = "text";
    input.maxLength = 120;

    titleEl.replaceWith(input);
    input.focus();
    input.select();

    const commit = async () => {
        const newTitle = input.value.trim();
        if (!newTitle) {
            renderConversationList(chatState.historyRows, document.getElementById("historySearch")?.value?.trim() || "");
            return;
        }

        try {
            await apiRequest(`/chat/conversations/${conversationId}/rename`, {
                method: "POST",
                body: JSON.stringify({ title: newTitle })
            });

            if (String(window.conversationId) === String(conversationId)) {
                setConversationHeading(newTitle);
            }

            await loadConversations(false);
            showStatusBanner("success", "Conversation renamed.");
        } catch (error) {
            console.error("Failed to rename conversation:", error);
            showStatusBanner("error", "Failed to rename conversation.");
            await loadConversations(false);
        }
    };

    input.addEventListener("keydown", async (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            await commit();
        }
        if (e.key === "Escape") {
            renderConversationList(chatState.historyRows, document.getElementById("historySearch")?.value?.trim() || "");
        }
    });

    input.addEventListener("blur", commit, { once: true });
}

async function deleteConversation(conversationId) {
    const confirmed = window.confirm("Delete this conversation?");
    if (!confirmed) return;

    try {
        await apiRequest(`/chat/conversations/${conversationId}`, {
            method: "DELETE"
        });

        if (String(window.conversationId) === String(conversationId)) {
            startNewConversation();
        }

        await loadConversations(false);
        showStatusBanner("success", "Conversation deleted.");
    } catch (error) {
        console.error("Failed to delete conversation:", error);
        showStatusBanner("error", "Failed to delete conversation.");
    }
}

async function startInlineMessageEdit(messageId, currentText) {
    const wrapper = document.querySelector(`.ica-message-wrapper.is-user[data-message-id="${cssEscapeSafe(String(messageId))}"]`);
    if (!wrapper) return;

    const messageEl = wrapper.querySelector(".ica-message.is-user");
    const actionsEl = wrapper.querySelector(".ica-message-actions");
    if (!messageEl || !actionsEl) return;
    if (wrapper.querySelector(".ica-inline-edit-wrap")) return;

    messageEl.hidden = true;
    actionsEl.hidden = true;

    const editWrap = document.createElement("div");
    editWrap.className = "ica-inline-edit-wrap";
    editWrap.innerHTML = `
        <textarea
            class="ica-inline-edit-textarea"
            data-editing-message-id="${escapeHtmlAttr(String(messageId))}"
            rows="1"
            aria-label="Edit message"
        >${escapeHtml(currentText)}</textarea>
        <div class="ica-message-actions">
            <button class="ica-copy-btn" type="button" data-save-edit-message-id="${escapeHtmlAttr(String(messageId))}">Save</button>
            <button class="ica-copy-btn" type="button" data-cancel-edit-message-id="${escapeHtmlAttr(String(messageId))}">Cancel</button>
        </div>
    `;

    wrapper.querySelector(".ica-message-block")?.appendChild(editWrap);

    const textarea = editWrap.querySelector(".ica-inline-edit-textarea");
    if (textarea) {
        textarea.value = currentText;
        autoResizeTextarea(textarea);
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }
}

function cancelInlineMessageEdit(messageId) {
    const wrapper = document.querySelector(`.ica-message-wrapper.is-user[data-message-id="${cssEscapeSafe(String(messageId))}"]`);
    if (!wrapper) return;

    wrapper.querySelector(".ica-inline-edit-wrap")?.remove();

    const messageEl = wrapper.querySelector(".ica-message.is-user");
    const actionsEl = wrapper.querySelector(".ica-message-actions");

    if (messageEl) messageEl.hidden = false;
    if (actionsEl) actionsEl.hidden = false;
}

async function submitInlineMessageEdit(messageId) {
    const wrapper = document.querySelector(`.ica-message-wrapper.is-user[data-message-id="${cssEscapeSafe(String(messageId))}"]`);
    if (!wrapper) return;

    const textarea = wrapper.querySelector(`.ica-inline-edit-textarea[data-editing-message-id="${cssEscapeSafe(String(messageId))}"]`);
    if (!textarea) return;

    const newText = textarea.value.trim();
    const originalText = wrapper.querySelector(".ica-message.is-user")?.textContent?.trim() || "";

    if (!newText) {
        cancelInlineMessageEdit(messageId);
        return;
    }

    if (newText === originalText) {
        cancelInlineMessageEdit(messageId);
        return;
    }

    let current = wrapper;
    while (current) {
        const next = current.nextElementSibling;
        current.remove();
        current = next;
    }

    appendMessage("user", newText, messageId);
    showTypingIndicator(true);
    setSendLoading(true);

    await streamAssistantResponse(`/chat/messages/${messageId}/edit`, {
        message: newText,
        document_text: window.currentDocumentText,
        document_name: window.currentDocumentName,
        response_mode: getResponseMode()
    });

    showTypingIndicator(false);
    setSendLoading(false);

    if (window.conversationId) {
        await openConversation(
            window.conversationId,
            document.getElementById("conversationHeading")?.textContent || "Conversation",
            false
        );
    }

    await loadConversations(false);
    showStatusBanner("success", "Message updated.");
}

function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString("en-GB");
}

function formatTime(date) {
    return new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit"
    }).format(date);
}

function autoResizeTextarea(el) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 220) + "px";
}

function scrollChatToBottom() {
    const chat = document.getElementById("chat");
    if (!chat) return;
    requestAnimationFrame(() => {
        chat.scrollTop = chat.scrollHeight;
    });
}

function cssEscapeSafe(value) {
    if (window.CSS && typeof window.CSS.escape === "function") {
        return window.CSS.escape(value);
    }
    return String(value).replace(/["\\]/g, "\\$&");
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function escapeHtmlAttr(value) {
    return escapeHtml(value);
}

document.addEventListener("DOMContentLoaded", () => {
    initChat();
});
