import { ypAssistantStream } from "./api.js";
import { state } from "./state.js";
import { appendAssistantMessage, clearAssistantInput, getAssistantInput, setStatus } from "./ui.js";

function currentYoungPersonId() {
  return state.youngPersonId || document.body?.dataset?.youngPersonId || null;
}

function buildAssistantPayload(prompt) {
  return {
    message: prompt,
    prompt,
    young_person_id: currentYoungPersonId(),
    context: {
      scope: "child",
      active_section: state.currentSection || state.activeSection || "workspace",
    },
  };
}

export async function sendAssistantMessage(prompt = getAssistantInput()) {
  const message = String(prompt || "").trim();
  if (!message) return false;

  if (!currentYoungPersonId()) {
    setStatus("Select a young person before asking the assistant.");
    return false;
  }

  appendAssistantMessage("user", message);
  clearAssistantInput();
  const assistantNode = appendAssistantMessage("assistant", "");
  setStatus("Assistant thinking...");

  let output = "";

  try {
    await ypAssistantStream(buildAssistantPayload(message), {
      onToken(token) {
        output += token || "";
        if (assistantNode) assistantNode.textContent = output;
      },
      onDone() {
        setStatus("Assistant ready.");
      },
      onError(error) {
        const detail = typeof error === "string" ? error : error?.detail || error?.message || "Assistant error.";
        if (assistantNode) assistantNode.textContent = detail;
        setStatus("Assistant could not complete the response.");
      },
    });

    if (!output && assistantNode && !assistantNode.textContent) {
      assistantNode.textContent = "No response was returned.";
    }

    return true;
  } catch (error) {
    console.error("[young-people-shell/assistant] send failed", error);
    if (assistantNode) assistantNode.textContent = error?.message || "Assistant failed.";
    setStatus("Assistant failed.");
    return false;
  }
}

export function bindAssistant() {
  const send = document.getElementById("ypAssistantSend");
  const input = document.getElementById("ypAssistantInput");

  send?.addEventListener("click", () => sendAssistantMessage());
  input?.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      sendAssistantMessage();
    }
  });
}

window.IndiCareYoungPeopleAssistant = Object.freeze({ bindAssistant, sendAssistantMessage });
