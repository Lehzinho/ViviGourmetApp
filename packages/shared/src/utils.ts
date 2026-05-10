/**
 * ISO timestamp for logs and health payloads.
 */
export function isoNow(): string {
  return new Date().toISOString();
}
