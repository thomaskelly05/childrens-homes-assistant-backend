const els = {
  form: document.getElementById("createUserForm"),
  email: document.getElementById("email"),
  password: document.getElementById("password"),
  firstName: document.getElementById("firstName"),
  lastName: document.getElementById("lastName"),
  role: document.getElementById("role"),
  providerId: document.getElementById("providerId"),
  homeId: document.getElementById("homeId"),
  homeIds: document.getElementById("homeIds"),
  isActive: document.getElementById("isActive"),
  subscriptionActive: document.getElementById("subscriptionActive"),
  formStatus: document.getElementById("formStatus"),
  usersList: document.getElementById("usersList"),
  refreshUsersBtn: document.getElementById("refreshUsersBtn"),
};

let options = {
  roles: [],
  providers: [],
  homes: [],
};

function getCookie(name) {
  return (
    document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${name}=`))
      ?.split("=")[1] || ""
  );
}

function getCsrfToken() {
  return decodeURIComponent(
    getCookie("indicare_csrf") ||
      getCookie("csrf_token") ||
      getCookie("csrftoken") ||
      ""
  );
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function readError(response, fallback) {
  try {
    const data = await response.json();
    return data.detail || data.error || fallback;
  } catch {
    return fallback;
  }
}

function selectedMulti(select) {
  return Array.from(select?.selectedOptions || [])
    .map((option) => Number(option.value))
    .filter((value) => Number.isFinite(value) && value > 0);
}

function setStatus(message, type = "") {
  if (!els.formStatus) return;
  els.formStatus.textContent = message;
  els.formStatus.className = `status ${type}`;
}

function fillSelect(select, rows, labelFn, valueFn, placeholder) {
  if (!select) return;

  select.innerHTML = "";

  if (placeholder) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = placeholder;
    select.appendChild(option);
  }

  rows.forEach((row) => {
    const option = document.createElement("option");
    option.value = String(valueFn(row));
    option.textContent = labelFn(row);
    select.appendChild(option);
  });
}

async function loadOptions() {
  const response = await fetch("/admin/users/options", {
    credentials: "include",
  });

  if (response.status === 403) {
    document.body.innerHTML =
      "<main class='admin-users-shell'><h1>Admin access required</h1></main>";
    return;
  }

  if (!response.ok) {
    throw new Error(await readError(response, "Failed to load admin options"));
  }

  options = await response.json();

  fillSelect(els.role, options.roles || [], (role) => role, (role) => role, null);

  fillSelect(
    els.providerId,
    options.providers || [],
    (provider) => provider.name,
    (provider) => provider.id,
    "No provider"
  );

  fillSelect(
    els.homeId,
    options.homes || [],
    (home) => home.name,
    (home) => home.id,
    "No main home"
  );

  fillSelect(
    els.homeIds,
    options.homes || [],
    (home) => home.name,
    (home) => home.id,
    null
  );

  if (els.role) els.role.value = "staff";
}

async function loadUsers() {
  if (!els.usersList) return;

  els.usersList.innerHTML = "<p>Loading users...</p>";

  const response = await fetch("/admin/users", {
    credentials: "include",
  });

  if (!response.ok) {
    const message = await readError(response, "Could not load users.");
    els.usersList.innerHTML = `<p>${escapeHtml(message)}</p>`;
    setStatus(message, "error");
    return;
  }

  const data = await response.json();
  const users = data.users || [];

  if (!users.length) {
    els.usersList.innerHTML = "<p>No users found.</p>";
    return;
  }

  els.usersList.innerHTML = users
    .map((user) => {
      const name =
        [user.first_name, user.last_name].filter(Boolean).join(" ") || "No name";
      const status = user.is_active ? "Active" : "Inactive";

      return `
        <article class="user-row">
          <div>
            <strong>${escapeHtml(name)}</strong>
            <span>${escapeHtml(user.email)}</span>
          </div>

          <div>
            <span class="pill">${escapeHtml(user.role)}</span>
            <span>${escapeHtml(user.provider_name || "No provider")}</span>
            <span>${escapeHtml(user.home_name || "No main home")}</span>
            <span>${escapeHtml(status)}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

async function createUser(event) {
  event.preventDefault();

  setStatus("Creating user...", "");

  const payload = {
    email: els.email.value.trim(),
    password: els.password.value,
    first_name: els.firstName.value.trim() || null,
    last_name: els.lastName.value.trim() || null,
    role: els.role.value || "staff",
    provider_id: els.providerId.value ? Number(els.providerId.value) : null,
    home_id: els.homeId.value ? Number(els.homeId.value) : null,
    home_ids: selectedMulti(els.homeIds),
    is_active: els.isActive.checked,
    subscription_active: els.subscriptionActive.checked,
  };

  const csrfToken = getCsrfToken();

  const response = await fetch("/admin/users", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    setStatus(await readError(response, "Could not create user."), "error");
    return;
  }

  setStatus("User created successfully.", "success");
  els.form.reset();

  if (els.role) els.role.value = "staff";
  if (els.isActive) els.isActive.checked = true;
  if (els.subscriptionActive) els.subscriptionActive.checked = true;

  await loadUsers();
}

els.form?.addEventListener("submit", createUser);
els.refreshUsersBtn?.addEventListener("click", loadUsers);

try {
  await loadOptions();
  await loadUsers();
} catch (error) {
  console.error("[admin-users] failed to initialise", error);
  setStatus(error.message || "Admin users failed to load.", "error");
}
