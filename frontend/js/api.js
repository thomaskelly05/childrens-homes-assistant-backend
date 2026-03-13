const API = "https://childrens-homes-assistant-backend-new.onrender.com";
const ACCESS_TOKEN_KEY = "indicare_access_token";
const CURRENT_USER_KEY = "indicare_current_user";

function getAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY) || "";
}

function setAccessToken(token) {
    if (!token) return;
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

function clearAccessToken() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
}

function getStoredUser() {
    const raw = localStorage.getItem(CURRENT_USER_KEY);

    if (!raw) return null;

    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function setStoredUser(user) {
    if (!user) return;
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

function clearStoredUser() {
    localStorage.removeItem(CURRENT_USER_KEY);
}

function clearAuthState() {
    clearAccessToken();
    clearStoredUser();
}

function getAuthHeaders(extraHeaders = {}) {
    const token = getAccessToken();

    if (!token) {
        return { ...extraHeaders };
    }

    return {
        ...extraHeaders,
        Authorization: `Bearer ${token}`
    };
}

async function safeJson(response) {
    const text = await response.text();

    try {
        return text ? JSON.parse(text) : {};
    } catch {
        return { detail: text || "Invalid server response" };
    }
}

function redirectToLogin() {
    clearAuthState();
    window.location.href = "/login.html";
}

function handleUnauthorizedResponse(response, data = null) {
    if (response.status === 401) {
        console.warn("Unauthorized response:", data);
        redirectToLogin();
        return true;
    }

    return false;
}

async function apiFetch(path, options = {}) {
    const headers = getAuthHeaders(options.headers || {});

    const response = await fetch(`${API}${path}`, {
        ...options,
        headers
    });

    return response;
}

async function apiFetchJson(path, options = {}) {
    const response = await apiFetch(path, options);
    const data = await safeJson(response);

    if (!response.ok) {
        if (handleUnauthorizedResponse(response, data)) {
            throw new Error("Unauthorized");
        }

        throw new Error(data.detail || data.message || "Request failed");
    }

    return data;
}

async function checkAuth() {
    const token = getAccessToken();

    if (!token) {
        return false;
    }

    try {
        const data = await apiFetchJson("/auth/check", {
            method: "GET"
        });

        return !!data.authenticated;
    } catch (error) {
        console.error("Auth check failed:", error);
        return false;
    }
}

async function loadCurrentUser() {
    try {
        const data = await apiFetchJson("/auth/me", {
            method: "GET"
        });

        if (data.user) {
            setStoredUser(data.user);
            return data.user;
        }

        return null;
    } catch (error) {
        console.error("Load current user failed:", error);
        return null;
    }
}

async function logoutUser() {
    try {
        await apiFetch("/auth/logout", {
            method: "POST"
        });
    } catch (error) {
        console.error("Logout request failed:", error);
    } finally {
        clearAuthState();
        window.location.href = "/login.html";
    }
}
