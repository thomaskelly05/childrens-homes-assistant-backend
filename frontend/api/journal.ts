export async function loadJournal(token) {
  const res = await fetch("/staff/journal", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function saveJournal(token, data) {
  await fetch("/staff/journal", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
}
