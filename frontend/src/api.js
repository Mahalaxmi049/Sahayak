/** Sahayak Pass API client — matches the FastAPI backend exactly. */

const API = 'http://localhost:8000';

export async function request(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status >= 400) {
    const err = new Error(data.detail || 'Request failed');
    err.status = res.status;
    throw err;
  }
  return data;
}

/* ── Citizen endpoints ── */

export const getCitizen = (id) => request(`/citizens/${id}`);
export const getHelpers = () => request('/helpers');
export const getCitizenPasses = (citizenId) => request(`/citizen/${citizenId}/passes`);
export const createPass = (body) => request('/passes', { method: 'POST', body: JSON.stringify(body) });
export const getPass = (id) => request(`/passes/${id}`);
export const revokePass = (id) => request(`/passes/${id}/revoke`, { method: 'POST' });
export const getPendingStepUps = (citizenId) => request(`/citizen/${citizenId}/stepups/pending`);
export const resolveStepUp = (id, decision, via) =>
  request(`/stepups/${id}/resolve`, { method: 'POST', body: JSON.stringify({ decision, via }) });
export const getAudit = (passId) => request(`/passes/${passId}/audit`);
export const getSummary = (passId, lang) => request(`/passes/${passId}/summary?lang=${lang}`);

/* ── Helper endpoints ── */

export const helperAct = (token, action) =>
  request('/helper/act', { method: 'POST', headers: { 'X-Pass-Token': token }, body: JSON.stringify({ action }) });
export const getStepUp = (token, stepUpId) =>
  request(`/helper/stepups/${stepUpId}`, { headers: { 'X-Pass-Token': token } });
export const getHelperPass = (token) =>
  request('/helper/pass', { headers: { 'X-Pass-Token': token } });

/* ── Meta ── */

export const getActions = (lang) => request(`/meta/actions?lang=${lang}`);
export const resetDemo = () => request('/demo/reset', { method: 'POST' });

/* ── Utilities ── */

/** Parse a backend datetime (UTC but missing Z suffix) into a JS Date. */
export function asUTC(value) {
  if (!value) return new Date(0);
  return new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : value + 'Z');
}
