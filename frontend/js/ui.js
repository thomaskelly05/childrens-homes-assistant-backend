async function copyReport() {
  const output = document.getElementById("aiOutput");

  if (!output) {
    alert("Report output not found.");
    return;
  }

  const text = output.innerText.trim();

  if (!text) {
    alert("There is no report to copy.");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    alert("Report copied.");
  } catch (error) {
    console.error("Copy failed:", error);
    alert("Could not copy the report.");
  }
}

function exportPDF() {
  const output = document.getElementById("aiOutput");

  if (!output) {
    alert("Report output not found.");
    return;
  }

  const text = output.innerText.trim();

  if (!text) {
    alert("There is no report to export.");
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>AI Report</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 32px;
          line-height: 1.6;
          color: #111;
          white-space: pre-wrap;
        }
        h1 {
          margin-bottom: 24px;
        }
      </style>
    </head>
    <body>
      <h1>AI Report</h1>
      <div>${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    alert("Could not open print window.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
  }, 300);
}

function saveReport() {
  const output = document.getElementById("aiOutput");

  if (!output) {
    alert("Report output not found.");
    return;
  }

  const text = output.innerText.trim();

  if (!text) {
    alert("There is no report to save.");
    return;
  }

  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "ai-report.txt";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
  alert("Report downloaded.");
}
