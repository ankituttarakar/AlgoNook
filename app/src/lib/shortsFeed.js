/** Append unseen YouTube videos while preserving their first-seen order. */
export function appendUniqueShorts(current, incoming) {
  const seen = new Set(current.map((item) => item.youtubeId));
  return [...current, ...incoming.filter((item) => !seen.has(item.youtubeId))];
}
