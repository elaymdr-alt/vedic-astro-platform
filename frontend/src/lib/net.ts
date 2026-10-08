/** Turns low-level fetch failures into a message the user can act on. */
export function friendlyError(e: unknown): string {
  if (e instanceof TypeError || (e instanceof Error && /failed to fetch|networkerror|load failed/i.test(e.message))) {
    return 'ارتباط با سرور برقرار نشد. مطمئن شو سرور برنامه روشن است (پورت ۸۰۰۰) و دوباره تلاش کن.'
  }
  return e instanceof Error ? e.message : 'خطای ناشناخته'
}
