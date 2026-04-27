/**
 * Agora channel + uid helpers (server + client safe).
 * Channel names must be ≤64 chars; uids must be uint32 in [1, 2^32-1].
 */

export function agoraChannelForRoom(roomId) {
  const raw = String(roomId).replace(/[^a-zA-Z0-9 _#\-.,]/g, "_");
  const name = `chat_${raw}`;
  return name.length > 64 ? name.slice(0, 64) : name;
}

export function agoraUidFromUserId(userId) {
  const s = String(userId);
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  const unsigned = h >>> 0;
  return unsigned === 0 ? 1 : unsigned;
}
