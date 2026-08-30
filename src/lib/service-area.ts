/**
 * Service-area enforcement for task creation.
 *
 * The `service_areas` table (0001_schema.sql) has existed since the first
 * migration with RLS already wired up (public reads active rows, admin
 * writes — 0002_functions_rls.sql), but nothing in any of the three apps
 * ever read from it: a Requester could create a task with any zip code,
 * anywhere, and there was no way for an admin to constrain that without a
 * code change. This module is the enforcement side; the admin CRUD UI is
 * in doneadmin's /admin/settings.
 *
 * Same "don't let an unconfigured setting silently break the core loop"
 * lesson as the open-pool visibility rule in the architecture doc: a fresh
 * or pre-launch platform has zero rows in `service_areas`, and treating
 * that as "nothing is in a service area" would brick task creation for
 * every Requester before an admin has configured anything. So: zero
 * *active* service areas means unrestricted (not yet configured / open
 * everywhere); one or more active rows means the zip must match one of
 * them. This mirrors the visibility rule's shape exactly, just applied to
 * launch-market gating instead of Doer category prefs.
 */

export interface ServiceAreaZips {
  zip_codes: string[];
}

export function isZipInServiceArea(
  zip: string,
  activeServiceAreas: ServiceAreaZips[]
): boolean {
  if (activeServiceAreas.length === 0) return true;
  return activeServiceAreas.some((area) => area.zip_codes.includes(zip));
}
