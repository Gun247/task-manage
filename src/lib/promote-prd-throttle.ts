const PROMOTE_INTERVAL_MS = 60_000;
let lastPromotedAt = 0;
let inFlight: Promise<void> | null = null;

export async function promotePrdTasksToDoneIfDue(
  promote: () => Promise<unknown>,
): Promise<void> {
  const now = Date.now();
  if (now - lastPromotedAt < PROMOTE_INTERVAL_MS) return;

  if (!inFlight) {
    inFlight = promote()
      .then(() => {
        lastPromotedAt = Date.now();
      })
      .finally(() => {
        inFlight = null;
      });
  }

  await inFlight;
}
