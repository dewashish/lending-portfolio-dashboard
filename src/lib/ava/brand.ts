/**
 * AVA — the Avalora Virtual Analyst.
 *
 * Brand tokens for the embedded AI analyst experience. AVA's identity bridges
 * the platform teal into an "iris" violet: analysis grows out of the data.
 * Keep every AVA surface on these tokens so the affordance is instantly
 * recognizable anywhere in the app.
 */

export const AVA_NAME = 'AVA';
export const AVA_FULL_NAME = 'AVA — Avalora Virtual Analyst';
export const AVA_ROLE = 'Embedded Risk & Business Analyst';

export const AVA_TEAL = '#00bfa5';
export const AVA_IRIS = '#8b7cf7';

export const AVA_GRADIENT = `linear-gradient(135deg, ${AVA_TEAL} 0%, ${AVA_IRIS} 100%)`;
export const AVA_GRADIENT_SOFT = `linear-gradient(135deg, ${AVA_TEAL}22 0%, ${AVA_IRIS}22 100%)`;

/** Selection highlight used on chart cells/stages the user has picked for AVA. */
export const AVA_SELECTION = AVA_IRIS;

export const AVA_DISCLAIMER =
  'AVA reads the portfolio data behind this screen. Figures shown here are analytical estimates — verify thin cohorts before acting.';
