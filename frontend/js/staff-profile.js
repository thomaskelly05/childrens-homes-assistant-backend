(function () {
  const $ = (id) => document.getElementById(id);
  const PROFILE_KEY = "indicare_assistant_user_profile";
  const MODE_KEY = "indicare_assistant_default_mode";
  const THEME_KEY = "indicare_assistant_theme";
  const PROFILE_IMAGE_KEY = "indicare_profile_image";

  let currentProfile = null;
  let imageData = null;

  function text(value, fallback = "—") {
    return value === null || value === undefined || value === "" ? fallback : String(value);
  }

  function csrfToken() {
    const match = document.cookie.match(/(?:^|;\s*)(?:__Host-indicare_csrf|indicare_csrf)=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  }

  function headers(method = "GET") {
    const next = { "Content-Type": "application/json" };
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase())) {
      const token = csrfToken();
      if (token) next["X-CSRF-Token"] = token;
    }
    return next;
  }

  async function request(url, options = {}) {
    const method = options.method || "GET";
    const response = await fetch(url, {
      credentials: "include",
      ...options,
      headers: { ...headers(method), ...(options.headers || {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.detail || data.message || `Request failed with status ${response.status}`);
    }
    return data;
  }

  function initials(name, email) {
    const parts = String(name || email || "IC").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "IC";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  function setStatus(id, message, ok = true) {
    const node = $(id);
    if (!node) return;
    node.textContent = message || "";
    node.className = `status ${message ? (ok ? "ok" : "err") : ""}`;
  }

  function setAvatar(data, label) {
    const avatar = $("avatarPreview");
    if (!avatar) return;
    if (data) {
      avatar.innerHTML = `<img src="${data}" alt="Profile picture" />`;
    } else {
      avatar.textContent = initials(label || "IC");
    }
  }

  function applySystemThemePreference(pref) {
    // System-synced is the default. We only store explicit light/dark when the user chooses it.
    const value = pref === "light" || pref === "dark" ? pref : "system";
    localStorage.setItem("indicare_theme_pref", value);
    if (value === "system") {
      localStorage.removeItem(THEME_KEY);
    } else {
      localStorage.setItem(THEME_KEY, value);
    }
  }

  function mirrorToAssistant(profile, user) {
    const displayName = profile.display_name || [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email || "Assistant user";
    const assistantProfile = {
      name: displayName,
      role: user.role || "IndiCare user",
      defaultMode: profile.assistant_default_mode || "ofsted",
      tone: profile.assistant_tone || "professional",
      image: profile.profile_image_data || null,
    };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(assistantProfile));
    localStorage.setItem(MODE_KEY, assistantProfile.defaultMode);
    localStorage.setItem("first_name", user.first_name || displayName.split(" ")[0] || "");
    localStorage.setItem("last_name", user.last_name || "");
    localStorage.setItem("role", user.role || "");
    if (assistantProfile.image) localStorage.setItem(PROFILE_IMAGE_KEY, assistantProfile.image);
    else localStorage.removeItem(PROFILE_IMAGE_KEY);
    applySystemThemePreference(profile.theme || "system");
  }

  function hydrate(data) {
    currentProfile = data;
    const user = data.user || {};
    const profile = data.profile || {};
    imageData = profile.profile_image_data || null;
    const displayName = profile.display_name || [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email || "My Profile";

    if ($("profileTitle")) $("profileTitle").textContent = displayName;
    if ($("displayNamePreview")) $("displayNamePreview").textContent = displayName;
    if ($("profileRolePreview")) $("profileRolePreview").textContent = text(user.role, "IndiCare user");
    if ($("emailPreview")) $("emailPreview").textContent = text(user.email);
    if ($("rolePreview")) $("rolePreview").textContent = text(user.role);
    if ($("homePreview")) $("homePreview").textContent = text(user.home_id ? `Home ${user.home_id}` : "No home assigned");

    if ($("firstName")) $("firstName").value = user.first_name || "";
    if ($("lastName")) $("lastName").value = user.last_name || "";
    if ($("displayName")) $("displayName").value = displayName;
    if ($("phone")) $("phone").value = profile.phone || "";
    if ($("notes")) $("notes").value = profile.notes || "";
    if ($("theme")) $("theme").value = profile.theme || "system";
    if ($("accentColor")) $("accentColor").value = profile.accent_color || "blue";
    if ($("compactMode")) $("compactMode").checked = !!profile.compact_mode;
    if ($("emailNotifications")) $("emailNotifications").checked = profile.email_notifications !== false;
    if ($("assistantDefaultMode")) $("assistantDefaultMode").value = profile.assistant_default_mode || "ofsted";
    if ($("assistantTone")) $("assistantTone").value = profile.assistant_tone || "professional";

    setAvatar(imageData, displayName || user.email);
    mirrorToAssistant(profile, user);
  }

  function payload() {
    return {
      first_name: $("firstName")?.value || "",
      last_name: $("lastName")?.value || "",
      display_name: $("displayName")?.value || "",
      phone: $("phone")?.value || "",
      profile_image_data: imageData,
      theme: $("theme")?.value || "system",
      accent_color: $("accentColor")?.value || "blue",
      compact_mode: !!$("compactMode")?.checked,
      email_notifications: !!$("emailNotifications")?.checked,
      assistant_default_mode: $("assistantDefaultMode")?.value || "ofsted",
      assistant_tone: $("assistantTone")?.value || "professional",
      notes: $("notes")?.value || "",
    };
  }

  async function loadProfile() {
    setStatus("profileStatus", "Loading profile...");
    const data = await request("/account/profile");
    hydrate(data);
    setStatus("profileStatus", "");
  }

  async function saveProfile() {
    try {
      setStatus("profileStatus", "Saving...");
      const data = await request("/account/profile", {
        method: "PUT",
        body: JSON.stringify(payload()),
      });
      hydrate(data);
      setStatus("profileStatus", "Profile saved.", true);
    } catch (error) {
      setStatus("profileStatus", error.message, false);
    }
  }

  async function changePassword() {
    const current = $("currentPassword")?.value || "";
    const next = $("newPassword")?.value || "";
    const confirm = $("confirmPassword")?.value || "";
    if (!current || !next) {
      setStatus("passwordStatus", "Enter your current password and a new password.", false);
      return;
    }
    if (next.length < 8) {
      setStatus("passwordStatus", "New password must be at least 8 characters.", false);
      return;
    }
    if (next !== confirm) {
      setStatus("passwordStatus", "New passwords do not match.", false);
      return;
    }
    try {
      setStatus("passwordStatus", "Updating password...");
      await request("/account/change-password", {
        method: "POST",
        body: JSON.stringify({ current_password: current, new_password: next }),
      });
      ["currentPassword", "newPassword", "confirmPassword"].forEach((id) => { if ($(id)) $(id).value = ""; });
      setStatus("passwordStatus", "Password updated.", true);
    } catch (error) {
      setStatus("passwordStatus", error.message, false);
    }
  }

  function bindTabs() {
    document.querySelectorAll("[data-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelectorAll("[data-tab]").forEach((item) => item.classList.toggle("active", item === button));
        document.querySelectorAll(".panel").forEach((panel) => panel.classList.remove("active"));
        const target = $(`${button.dataset.tab}Panel`);
        if (target) target.classList.add("active");
      });
    });
  }

  function bindPhoto() {
    $("profilePhoto")?.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setStatus("profileStatus", "Choose an image file.", false);
        return;
      }
      if (file.size > 1_500_000) {
        setStatus("profileStatus", "Profile picture must be under 1.5MB.", false);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        imageData = String(reader.result || "");
        setAvatar(imageData, $("displayName")?.value || "Profile");
        setStatus("profileStatus", "Profile picture ready. Save changes to keep it.", true);
      };
      reader.readAsDataURL(file);
    });
    $("removePhoto")?.addEventListener("click", () => {
      imageData = null;
      const name = $("displayName")?.value || currentProfile?.profile?.display_name || currentProfile?.user?.email;
      setAvatar(null, name);
      setStatus("profileStatus", "Profile picture removed. Save changes to keep it.", true);
    });
  }

  function bindLivePreview() {
    ["firstName", "lastName", "displayName"].forEach((id) => {
      $(id)?.addEventListener("input", () => {
        const name = $("displayName")?.value || [$("firstName")?.value, $("lastName")?.value].filter(Boolean).join(" ") || "My Profile";
        if ($("profileTitle")) $("profileTitle").textContent = name;
        if ($("displayNamePreview")) $("displayNamePreview").textContent = name;
        if (!imageData) setAvatar(null, name);
      });
    });
    $("theme")?.addEventListener("change", () => applySystemThemePreference($("theme").value));
    $("assistantDefaultMode")?.addEventListener("change", () => localStorage.setItem(MODE_KEY, $("assistantDefaultMode").value));
  }

  function logout() {
    fetch("/auth/logout", { method: "POST", credentials: "include", headers: headers("POST") })
      .finally(() => { window.location.href = "/login"; });
  }

  function bind() {
    bindTabs();
    bindPhoto();
    bindLivePreview();
    $("saveProfile")?.addEventListener("click", saveProfile);
    $("saveProfileTop")?.addEventListener("click", saveProfile);
    $("resetProfile")?.addEventListener("click", loadProfile);
    $("changePassword")?.addEventListener("click", changePassword);
    $("logoutBtn")?.addEventListener("click", logout);
  }

  window.addEventListener("DOMContentLoaded", () => {
    bind();
    loadProfile().catch((error) => setStatus("profileStatus", error.message, false));
  });
})();
