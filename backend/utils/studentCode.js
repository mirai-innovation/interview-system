/**
 * Assigned student / registration code for a user.
 * Uses registrationCode, promotionalCode, or digitalId — whichever is set.
 */
export function resolveStudentCode(user, application = null) {
  if (!user) return null;

  const candidates = [
    application?.registrationCode,
    application?.promotionalCode,
    user.digitalId,
  ]
    .map((value) => value?.trim())
    .filter(Boolean);

  return candidates[0] || null;
}
