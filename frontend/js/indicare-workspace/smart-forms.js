const guidanceBox = document.getElementById("smart-form-guidance");
const formFields = document.getElementById("record-form-fields");

if (formFields) {
  formFields.addEventListener("input", handleSmartGuidance);
}

function handleSmartGuidance() {
  const text = formFields.innerText.toLowerCase();

  let prompts = [];

  if (text.includes("hit") || text.includes("aggressive")) {
    prompts.push("What was the trigger?");
    prompts.push("Was this fight, flight or freeze?");
    prompts.push("How did staff respond?");
  }

  if (text.includes("refused")) {
    prompts.push("Was this anxiety, control or sensory?");
    prompts.push("Was choice offered?");
  }

  if (text.includes("sad") || text.includes("cry")) {
    prompts.push("What was the child communicating?");
    prompts.push("Was comfort or reassurance offered?");
  }

  if (!prompts.length) {
    prompts = ["What happened?", "What did the child communicate?", "What did staff do?"];
  }

  guidanceBox.innerHTML = `
    <div class="guidance-panel">
      <strong>Smart guidance</strong>
      <ul>${prompts.map(p => `<li>${p}</li>`).join("")}</ul>
    </div>
  `;
}
