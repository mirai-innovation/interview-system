/**
 * MIRI registration / student code (e.g. MIRI-2026-01-049, MIRI-2026-8).
 */
export function isMiriStudentCode(value) {
  if (!value || typeof value !== "string") return false;
  return /^MIRI-2026/i.test(value.trim());
}

export function resolveStudentCode(user, application = null) {
  if (!user) return null;

  const candidates = [
    application?.registrationCode,
    application?.promotionalCode,
    user.digitalId,
  ]
    .map((value) => value?.trim())
    .filter(Boolean);

  for (const code of candidates) {
    if (isMiriStudentCode(code)) return code;
  }

  return null;
}
