import { API_CONFIG } from '../constants/api';

const PING_INTERVAL_MS = 60 * 1000; // 1 minute
const PING_URL = `${API_CONFIG.BASE_URL}/onboarding`;

let intervalId: ReturnType<typeof setInterval> | null = null;

const ping = async (): Promise<void> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout
    await fetch(PING_URL, { method: 'GET', signal: controller.signal });
    clearTimeout(timeout);
  } catch {
    // Silently ignore — network may be unavailable, will retry next minute
  }
};

const keepAliveService = {
  start(): void {
    if (intervalId !== null) return; // already running
    ping(); // immediate ping on start
    intervalId = setInterval(ping, PING_INTERVAL_MS);
  },

  stop(): void {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  },
};

export default keepAliveService;
