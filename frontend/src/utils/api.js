/**
 * Place at: frontend/src/utils/api.js
 * This adds the auth token to every API call automatically
 */

const getToken = () => localStorage.getItem('cjn_token') || '';

export async function apiFetch(url, options = {}) {
  const token = getToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  // If unauthorized, redirect to login
  if (res.status === 401) {
    localStorage.clear();
    window.location.reload();
    return;
  }

  return res;
}