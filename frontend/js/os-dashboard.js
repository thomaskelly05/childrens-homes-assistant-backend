async function loadScope(scope) {
  const res = await fetch(`/os/intelligence/${scope}`);
  const data = await res.json();
  document.getElementById('output').textContent = JSON.stringify(data, null, 2);
}

loadScope('manager');