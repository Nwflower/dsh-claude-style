/**
 * Drop the rejection of a host promise this skin started.
 *
 * A failed selection is the host toast's to report and a failed catalog load is
 * the popover's own error line with its retry, so a second report here would be
 * noise; the rejection still has to be claimed, or it surfaces as this skin's.
 * A host version that hands back no promise leaves nothing to claim.
 */
export function dropHostRejection(pending: Promise<unknown> | null | undefined) {
  if (pending && typeof pending.catch === 'function') {
    pending.catch(() => { /* the host's own surface reports it */ })
  }
}
