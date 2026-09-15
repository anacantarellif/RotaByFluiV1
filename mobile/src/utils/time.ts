// Relative-time formatter for HistoryContext entries. Everywhere else in the
// app (Station's `dist`, Review.when, Report.when, CommunityScreen feed's
// `when`, ...) is a fixed curated display string — none of that mock data
// carries a real timestamp. HistoryContext is the one place that logs a real
// Date.now(), so this is the one real "how long ago" implementation in the
// app rather than another hand-picked string.
export function timeAgo(at: number, now: number = Date.now()): string {
  const diffSec = Math.max(0, Math.round((now - at) / 1000));
  if (diffSec < 60) return 'agora';

  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `há ${diffMin} min`;

  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `há ${diffH} h`;

  const diffD = Math.round(diffH / 24);
  if (diffD === 1) return 'ontem';
  if (diffD < 30) return `há ${diffD} dias`;

  const diffMonth = Math.round(diffD / 30);
  if (diffMonth < 12) return `há ${diffMonth} ${diffMonth === 1 ? 'mês' : 'meses'}`;

  const diffYear = Math.round(diffMonth / 12);
  return `há ${diffYear} ${diffYear === 1 ? 'ano' : 'anos'}`;
}
