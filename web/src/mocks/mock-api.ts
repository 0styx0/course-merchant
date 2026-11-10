/**
 * The API address Vitest, Playwright and `dev:mock` give the app as
 * `API_BASE_URL`, and the address the MSW handlers listen on.
 */
export const MOCK_API_BASE_URL = "http://localhost:3001";

/**
 * The shop address Vitest and Playwright give the app as `CONTACT_EMAIL`.
 * `dev:mock` in package.json repeats it as a literal, because a script can't import it.
 */
export const MOCK_CONTACT_EMAIL = "shop@example.com";
