/* IndiCare AI clean layout guard
   Final runtime pass to stop legacy shell scripts hiding the clean assistant composer.
*/

(function () {
  function $(id) {
    return document.getElementById(id);
  }

  function forceCleanHome() {
    document.body.classList.add('ic-clean-home-ready');

    const cockpit = $('icCockpit');
    if (cockpit) {
      cockpit.dataset.assistantSurface = 'standalone-clean';
    }

    const empty = $('empty');
    if (empty) {
      empty.classList.remove('hidden');
      empty.style.display = 'grid';
    }

    const messages = $('messages');
    if (messages && !messages.children.length) {
      messages.classList.add('hidden');
      messages.style.display = 'none';
    }

    const composer = $('composerDock');
    if (composer) {
      composer.classList.remove('hidden');
      composer.removeAttribute('hidden');
      composer.style.display = 'block';
      composer.style.visibility = 'visible';
      composer.style.opacity = '1';
      composer.style.pointerEvents = 'auto';
    }

    const input = $('input');
    if (input) {
      input.removeAttribute('disabled');
      input.placeholder = 'Message IndiCare AI...';
    }

    document.querySelectorAll('#icQuickStarts').forEach((node) => node.remove());
    document.querySelectorAll('.ic-ops-centre, .ic-proactive-dock, .ic-evidence, .ic-live-status').forEach((node) => {
      node.remove();
    });
  }

  window.addEventListener('DOMContentLoaded', () => {
    forceCleanHome();
    setTimeout(forceCleanHome, 100);
    setTimeout(forceCleanHome, 500);
    setTimeout(forceCleanHome, 1200);
  });
})();
