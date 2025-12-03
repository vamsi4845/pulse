export function logInfo(message, data = {}) {
  console.log(`[INFO] ${message}`, data);
}

export function logError(message, error = {}) {
  console.error(`[ERROR] ${message}`, error);
}

export function logWarn(message, data = {}) {
  console.warn(`[WARN] ${message}`, data);
}

