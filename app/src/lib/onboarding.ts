const STORAGE_KEY = "fek-onboarding";

export interface OnboardingState {
  dismissed: boolean;
  workspaceConfigured: boolean;
  firstEngagementCreated: boolean;
  firstStandupDone: boolean;
}

const DEFAULT: OnboardingState = {
  dismissed: false,
  workspaceConfigured: false,
  firstEngagementCreated: false,
  firstStandupDone: false,
};

export function loadOnboarding(): OnboardingState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT };
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT };
  }
}

export function saveOnboarding(state: OnboardingState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function isOnboardingComplete(state: OnboardingState): boolean {
  return (
    state.dismissed ||
    (state.workspaceConfigured && state.firstEngagementCreated && state.firstStandupDone)
  );
}
