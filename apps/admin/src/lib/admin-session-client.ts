export const ADMIN_SESSION_EPOCH_KEY = "netphim_admin_session_epoch";

export function beginAdminSession() {
  const epoch = `${Date.now()}:${crypto.randomUUID()}`;
  localStorage.setItem(ADMIN_SESSION_EPOCH_KEY, epoch);
  return epoch;
}

export function currentAdminSessionEpoch() {
  return localStorage.getItem(ADMIN_SESSION_EPOCH_KEY);
}

export function endAdminSession() {
  localStorage.removeItem(ADMIN_SESSION_EPOCH_KEY);
}
