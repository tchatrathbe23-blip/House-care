(function () {
  const USER_TOKEN_KEY = "token";
  const USER_KEY = "user";
  const ADMIN_TOKEN_KEY = "adminToken";
  const ADMIN_KEY = "admin";
  const isHttpPage = window.location.protocol === "http:" || window.location.protocol === "https:";
  const isLocalStaticPreview =
    isHttpPage &&
    ["localhost", "127.0.0.1"].includes(window.location.hostname) &&
    window.location.port &&
    window.location.port !== "5000";
  const BACKEND_ORIGIN =
    window.HOUSECARE_BACKEND_ORIGIN ||
    (isLocalStaticPreview
      ? "http://localhost:5000"
      : isHttpPage
        ? window.location.origin
        : "http://localhost:5000");
  const API_BASE = `${BACKEND_ORIGIN}/api`;
  const SOCKET_BASE = BACKEND_ORIGIN;

  /* ---------- Token Helpers ---------- */
  function getTokenPayload(token) {
    if (!token) return null;
    try {
      const base64 = token.split('.')[1];
      return JSON.parse(atob(base64));
    } catch (e) {
      return null;
    }
  }

  function isTokenExpired(token) {
    const payload = getTokenPayload(token);
    if (!payload || !payload.exp) return true;
    return Date.now() >= payload.exp * 1000;
  }

  function isTokenNearExpiry(token, thresholdMs) {
    const threshold = thresholdMs || 3600000; // 1 hour default
    const payload = getTokenPayload(token);
    if (!payload || !payload.exp) return true;
    return (payload.exp * 1000 - Date.now()) < threshold;
  }

  let _isRefreshing = false;
  let _refreshPromise = null;

  async function refreshUserToken() {
    if (_isRefreshing) return _refreshPromise;
    _isRefreshing = true;
    _refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getUserToken()}`,
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) throw new Error('Refresh failed');
        const data = await response.json();
        localStorage.setItem(USER_TOKEN_KEY, data.token);
        return data.token;
      } catch (e) {
        clearUserSession();
        return null;
      } finally {
        _isRefreshing = false;
        _refreshPromise = null;
      }
    })();
    return _refreshPromise;
  }

  /* ---------- Helpers ---------- */
  function getJSON(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function setJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function withRedirect(target, returnTo) {
    if (!returnTo) return target;
    const url = new URL(target, window.location.origin);
    url.searchParams.set("redirect", returnTo);
    return url.pathname + url.search;
  }

  function getReturnTo(defaultPath) {
    const redirect = new URLSearchParams(window.location.search).get("redirect");
    return redirect || defaultPath;
  }

  function removeLegacyServiceWorker() {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.getRegistrations()
      .then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      })
      .catch(() => {});
  }

  /* ---------- Token / Session ---------- */
  function getUserToken() {
    return localStorage.getItem(USER_TOKEN_KEY);
  }

  function getAdminToken() {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  }

  function getUser() {
    return getJSON(USER_KEY);
  }

  function getAdmin() {
    return getJSON(ADMIN_KEY);
  }

  function setUserSession(token, user) {
    localStorage.setItem(USER_TOKEN_KEY, token);
    setJSON(USER_KEY, user);
  }

  function setAdminSession(token, admin) {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
    setJSON(ADMIN_KEY, admin);
  }

  function clearUserSession() {
    localStorage.removeItem(USER_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function clearAdminSession() {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_KEY);
  }

  function redirectTo(url) {
    window.location.replace(url);
  }

  /* ---------- Auth Guards ---------- */
  function requireUser(options) {
    const settings = options || {};
    const token = getUserToken();
    if (!token) {
      const currentPage = window.location.pathname.split("/").pop() || "index.html";
      redirectTo(withRedirect(settings.redirect || "login.html", currentPage));
      return null;
    }
    return getUser();
  }

  function requireAdmin(options) {
    const settings = options || {};
    const token = getAdminToken();
    if (!token) {
      redirectTo(withRedirect(settings.redirect || "admin-login.html", settings.returnTo || window.location.pathname.split("/").pop()));
      return null;
    }
    return getAdmin();
  }

  function redirectIfAuthenticated(role, fallbackPath) {
    if (role === "admin" && getAdminToken()) {
      redirectTo(fallbackPath || "admin-dashboard.html");
      return true;
    }

    if (role === "user" && getUserToken()) {
      redirectTo(fallbackPath || "index.html");
      return true;
    }

    return false;
  }

  /* ---------- Logout ---------- */
  function logoutUser(redirectPath) {
    clearUserSession();
    redirectTo(redirectPath || "login.html");
  }

  function logoutAdmin(redirectPath) {
    clearAdminSession();
    redirectTo(redirectPath || "admin-login.html");
  }

  /* ---------- Fetch ---------- */
  function getAuthHeaders(role, extraHeaders) {
    const headers = Object.assign({}, extraHeaders || {});
    const token = role === "admin" ? getAdminToken() : getUserToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }

  async function fetchJson(path, options) {
    const settings = options || {};
    const url = path.startsWith("http")
      ? path
      : path.startsWith("/api")
        ? `${BACKEND_ORIGIN}${path}`
        : `${API_BASE}${path}`;

    const executeRequest = async () => {
      const response = await fetch(url, {
        ...settings,
        headers: getAuthHeaders(settings.auth, settings.headers),
      });

      const contentType = response.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        const message = data && data.message ? data.message : `Request failed with status ${response.status}`;
        const error = new Error(message);
        error.status = response.status;
        error.payload = data;
        error.code = data?.code;
        throw error;
      }

      return data;
    };

    try {
      return await executeRequest();
    } catch (error) {
      if (error.status === 401 && error.code === 'TOKEN_EXPIRED' && settings.auth !== 'admin') {
        const newToken = await refreshUserToken();
        if (newToken) {
          return await executeRequest();
        } else {
          logoutUser();
        }
      }
      throw error;
    }
  }

  /* ---------- Navbar Auth UI ---------- */
  function initNavbarAuth() {
    const navActions = document.querySelector(".nav-actions");
    if (!navActions) return;

    const token = getUserToken();
    const user = getUser();

    // Remove any existing auth buttons
    const existingAuth = navActions.querySelector(".hc-auth-area");
    if (existingAuth) existingAuth.remove();

    const authArea = document.createElement("div");
    authArea.className = "hc-auth-area";
    authArea.style.cssText = "display:flex;align-items:center;gap:0.6rem;";

    if (token && user) {
      // Logged in — show modern user chip + avatar + logout
      const userChip = document.createElement("div");
      userChip.className = "hc-user-chip";
      userChip.style.cssText = "display:flex;align-items:center;gap:8px;padding:3px 8px 3px 4px;background:rgba(0,163,255,0.08);border-radius:999px;border:1px solid rgba(0,163,255,0.18);";

      const avatar = document.createElement("div");
      avatar.className = "hc-avatar";
      const initial = (user.name || user.email || "U").trim().charAt(0).toUpperCase();
      avatar.textContent = initial;
      avatar.style.cssText = "width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#00a3ff,#0066cc);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.84rem;box-shadow:0 2px 6px rgba(0,163,255,0.25);";

      const greeting = document.createElement("span");
      greeting.className = "hc-user-greeting";
      greeting.textContent = `Hi, ${user.name?.split(" ")[0] || "User"}`;
      greeting.style.cssText = "font-size:0.86rem;font-weight:600;color:var(--text-main);white-space:nowrap;";

      const logoutBtn = document.createElement("button");
      logoutBtn.className = "logout-btn";
      logoutBtn.textContent = "Logout";
      logoutBtn.addEventListener("click", () => logoutUser());

      userChip.appendChild(avatar);
      userChip.appendChild(greeting);
      userChip.appendChild(logoutBtn);
      authArea.appendChild(userChip);
    } else {
      // Not logged in — show login button
      const loginLink = document.createElement("a");
      loginLink.href = "login.html";
      loginLink.className = "auth-link";
      loginLink.textContent = "Login";
      authArea.appendChild(loginLink);
    }

    navActions.appendChild(authArea);
  }

  /* ---------- Auto-init on DOM ready ---------- */
  function autoInit() {
    initNavbarAuth();
    removeLegacyServiceWorker();
    // Proactive token refresh
    const userToken = getUserToken();
    if (userToken && isTokenNearExpiry(userToken)) {
      refreshUserToken();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInit);
  } else {
    autoInit();
  }

  /* ---------- Public API ---------- */
  window.HouseCareAuth = {
    API_BASE,
    BACKEND_ORIGIN,
    clearAdminSession,
    clearUserSession,
    fetchJson,
    getAdmin,
    getAdminToken,
    getAuthHeaders,
    getReturnTo,
    getTokenPayload,
    getUser,
    getUserToken,
    initNavbarAuth,
    isTokenExpired,
    isTokenNearExpiry,
    logoutAdmin,
    logoutUser,
    redirectIfAuthenticated,
    refreshUserToken,
    requireAdmin,
    requireUser,
    setAdminSession,
    setUserSession,
    SOCKET_BASE,
    withRedirect,
  };
})();


