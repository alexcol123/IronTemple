// A creator can have at most this many plans marked "public" at once — keeps
// the JOIN-code numbered choice (see lib/sms-engine.ts) to a sane length,
// matching the same "reply with a number" pattern already used for the
// goal/experience-tier pickers. Exceeding it rejects the save with a clear
// error rather than silently demoting an older plan to personal.
export const MAX_PUBLIC_PLANS = 5;
