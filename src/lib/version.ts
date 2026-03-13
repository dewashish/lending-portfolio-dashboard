/**
 * Single source of truth for the application version.
 *
 * Versioning scheme (semver):
 *   x.y.z
 *   - z increments for each incremental change
 *   - x and y change only on explicit major/minor releases
 *
 * After changing this value, also update package.json to match.
 */
export const APP_VERSION = '0.4.16';
