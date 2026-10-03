// In-memory access token — never persisted to localStorage (XSS-safe).
// Refresh happens via the httpOnly refreshToken cookie.
let accessToken = null;

export const setAccessToken = (t) => { accessToken = t || null; };
export const getAccessToken = () => accessToken;
export const clearAccessToken = () => { accessToken = null; };
