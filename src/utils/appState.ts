// Глобальные флаги состояния между тестами (в рамках одного процесса раннера)
let onboardingCompleted = false;
let environmentPrepared = false;

export function isOnboardingCompleted() {
  return onboardingCompleted;
}
export function markOnboardingCompleted() {
  onboardingCompleted = true;
}
export function isEnvironmentPrepared() {
  return environmentPrepared;
}
export function markEnvironmentPrepared() {
  environmentPrepared = true;
}

// Возможность сброса (например, для отладки)
export function resetAppStateFlags() {
  onboardingCompleted = false;
  environmentPrepared = false;
}
