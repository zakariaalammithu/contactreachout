/**
 * Theme sections: which routes are the public website and which are the
 * app (dashboard / admin / campaigns / CRM / ...).
 *
 * - Public routes render the marketing site and auth entry pages. They are
 *   ALWAYS dark: the dashboard theme choice never changes them.
 * - Every other route is an app route and follows the stored dashboard
 *   theme, defaulting to white (light) when nothing is stored.
 *
 * This list mirrors the routes DashboardShell treats as public (it imports
 * this module, so the two can never drift apart). The root layout's
 * no-flash inline script carries its own copy of the same list because it
 * must run before any module loads — keep all three in sync when a public
 * route is added or removed.
 */
export const PUBLIC_ROUTES: string[] = [
  '/',
  '/features',
  '/how-it-works',
  '/pricing',
  '/contact-form-outreach',
  '/website-contact-form-automation',
  '/ai-outreach',
  '/b2b-lead-generation',
  '/benefits',
  '/about',
  '/contact',
  '/help',
  '/terms',
  '/privacy',
  '/login',
  '/signup',
];

export function isPublicRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return PUBLIC_ROUTES.includes(pathname);
}
