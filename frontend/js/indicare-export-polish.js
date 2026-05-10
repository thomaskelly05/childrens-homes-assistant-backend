/* IndiCare AI export polish
   Adds clean client-side exports for chat, DOCS and Notes while reusing existing workspace content.
*/

(function () {
  function $(id) {
    return document.getElementById(id);
  }

  function safeText(value) {
    return String(value || '').trim();
  }

  function htmlEscape(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function download(content, mime, filename) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function dateStamp() {
    return new Date().toISOString().slice(0, 10);
  }

  function conversationText() {
    return Array.from(document.querySelectorAll('#messages .wrap')).map((wrap) => {
      const role = wrap.classList.contains('user') ? 'User' : 'IndiCare AI';
      const msg = wrap.querySelector('.msg');
      return `${role}:\n${safeText(msg?.innerText)}`;
    }).filter(Boolean).join('\n\n');
  }

  function docsText() {
    const editor = $('indicareDocEditor');
    return safeText(editor?.innerText);
  }

  function notesText() {
    return safeText($('indicareTranscript')?.value);
  }

  function exportHtml(title, bodyText) {
    const html = `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8" />
<title>${htmlEscape(title)}</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;line-height:1.6;color:#0f172a;padding:42px;max-width:860px;margin:0 auto;background:#fff}
h1{font-size:28px;letter-spacing:-.03em;margin:0 0 8px}.meta{color:#64748b;font-size:13px;margin-bottom:28px}.content{white-space:pre-wrap;font-size:15px}hr{border:0;border-top:1px solid #e2e8f0;margin:24px 0}
</style>
</head>
<body>
<h1>${htmlEscape(title)}</h1>
<div class="meta">Exported from IndiCare AI on ${htmlEscape(dateStamp())}</div>
<hr />
<div class="content">${htmlEscape(bodyText)}</div>
</body>
</html>`;
    download(html, 'text/html;charset=utf-8', `${slug(title)}-${dateStamp()}.html`);
  }

  function exportTxt(title, bodyText) {
    download(`${title}\nExported from IndiCare AI on ${dateStamp()}\n\n${bodyText}`, 'text/plain;charset=utf-8', `${slug(title)}-${dateStamp()}.txt`);
  }

  function slug(value) {
    return String(value || 'indicare-ai-export').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'indicare-ai-export';
  }

  function showToast(text) {
    let toast = $('icExportToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'icExportToast';
      toast.className = 'ic-tier-toast';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<strong>Export</strong><span>${htmlEscape(text)}</span>`;
    toast.classList.add('visible');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('visible'), 2600);
  }

  function currentSurface() {
    if (!$('indicareDocs')?.classList.contains('hidden')) return 'docs';
    if (!$('indicareNotes')?.classList.contains('hidden')) return 'notes';
    return 'chat';
  }

  function exportCurrent(format) {
    const surface = currentSurface();
    const title = surface === 'docs' ? 'IndiCare DOCS Export' : surface === 'notes' ? 'IndiCare Notes Export' : 'IndiCare AI Chat Export';
    const body = surface === 'docs' ? docsText() : surface === 'notes' ? notesText() : conversationText();

    if (!body) {
      showToast('Nothing to export yet.');
      return;
    }

    if (format === 'html') exportHtml(title, body);
    else exportTxt(title, body);
    showToast(`${surface.toUpperCase()} exported.`);
  }

  function ensureExportMenu() {
    const button = $('exportConversation');
    if (!button || $('icExportMenu')) return;

    const menu = document.createElement('div');
    menu.id = 'icExportMenu';
    menu.className = 'ic-export-menu';
    menu.innerHTML = `
      <button type="button" data-export-format="txt">Export as text</button>
      <button type="button" data-export-format="html">Export as clean HTML</button>
    `;
    document.body.appendChild(menu);

    button.addEventListener('click', (event) => {
      event.preventDefault();
      const rect = button.getBoundingClientRect();
      menu.style.right = `${Math.max(14, window.innerWidth - rect.right)}px`;
      menu.style.top = `${rect.bottom + 8}px`;
      menu.classList.toggle('visible');
    });
  }

  function bind() {
    document.addEventListener('click', (event) => {
      const item = event.target.closest('[data-export-format]');
      if (item) {
        exportCurrent(item.dataset.exportFormat || 'txt');
        $('icExportMenu')?.classList.remove('visible');
        return;
      }

      if (!event.target.closest('#icExportMenu') && event.target.id !== 'exportConversation') {
        $('icExportMenu')?.classList.remove('visible');
      }
    });
  }

  window.addEventListener('DOMContentLoaded', () => {
    ensureExportMenu();
    bind();
  });
})();
