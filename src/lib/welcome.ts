const SEEN_KEY = 'reading-room:welcome-seen';

/** Whether this browser has already gone past the welcome screen. Storage can throw in private mode. */
export function hasSeenWelcome() {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function markWelcomeSeen() {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    // Without storage the welcome screen simply shows again next visit.
  }
}
