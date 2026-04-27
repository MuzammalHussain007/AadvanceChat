/**
 * Returns whether userId is among chat participants (ObjectIds or populated users).
 */
export function userIdInParticipantList(participants, userId) {
  if (!userId || !Array.isArray(participants)) {
    return false;
  }
  const uid = String(userId);
  return participants.some((p) => String(p?._id ?? p) === uid);
}
