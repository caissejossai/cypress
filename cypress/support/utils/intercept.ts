import type { RouteMatcherOptions } from 'cypress/types/net-stubbing';
import { pathToRegexp } from 'path-to-regexp';

/**
 * @param url
 * @description Extract hostname, and check if url has https protocol.
 */
function parseUrl(url: string) {
  const urlObject = new URL(url);

  const { hostname, pathname } = urlObject;
  const isHttps = urlObject.protocol === 'https:';
  const basePath = pathname === '/' ? '' : pathname;

  return { hostname, isHttps, basePath };
}

/**
 * @description Remove trailing slash from path.
 */
function normalizePath(path: string) {
  if (path.endsWith('/')) {
    return path.slice(0, -1);
  }
  return path;
}
interface IApiOpts {
  api: 'beam' | 'onboarding' | 'unleash';
}
/**
 * Converts convenient url to one cypress can use to match a route.
 * Reference: https://docs.cypress.io/api/commands/intercept
 */
export function pathToRouteMatcher(
  path: string,
  matcherParts?: RouteMatcherOptions,
  api?: IApiOpts,
): RouteMatcherOptions {
  const getApi = () => {
    switch (api?.api) {
      case 'onboarding':
        return parseUrl(`${Cypress.env('onboardingApiUrl')}`);
      case 'unleash':
        return parseUrl(`${Cypress.env('unleashUrl')}`);
      default:
        return parseUrl(`${Cypress.env('apiUrl')}`);
    }
  };
  const { hostname, isHttps, basePath } = getApi();
  const normalPath = normalizePath(path);
  const indexMatch = pathToRegexp(`${basePath}${normalPath}`, undefined, {
    start: false,
  });
  const value: RouteMatcherOptions = {
    pathname: indexMatch,
    hostname,
    https: isHttps,
    ...matcherParts,
  };
  return value;
}
