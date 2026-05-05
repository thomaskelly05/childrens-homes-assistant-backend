const main = document.getElementById('workspace-main');
const nav = document.getElementById('workspace-nav');

nav.addEventListener('click', e => {
  if (e.target.matches('button')) {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    loadView(e.target.dataset.view);
  }
});

async function loadView(view) {
  if (view === 'home') {
    const res = await fetch('/workspace/manager');
    const data = await res.json();
    main.innerHTML = `<h3>Home dashboard</h3><pre>${JSON.stringify(data, null, 2)}</pre>`;
  }
  if (view === 'child') {
    const res = await fetch('/workspace/child/1');
    const data = await res.json();
    main.innerHTML = `<h3>Child journey</h3><pre>${JSON.stringify(data, null, 2)}</pre>`;
  }
}

loadView('home');