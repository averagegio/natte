export const ONBOARDING_KEYS = {
  dashboard: "poh-onboarding-dashboard",
  toggles: "poh-onboarding-toggles",
} as const;

export function shouldShowOnboarding(key: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(key) !== "done";
}

export function completeOnboarding(key: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, "done");
}

export function requestOnboarding(keys: string[]): void {
  if (typeof window === "undefined") return;
  for (const key of keys) {
    localStorage.removeItem(key);
  }
}
