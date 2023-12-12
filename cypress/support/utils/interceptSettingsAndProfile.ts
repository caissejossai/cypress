import { pathToRouteMatcher } from './intercept';

/**
 * @function interceptSettingsAndProfile
 * @description Intercepts all requests made in EnsureAuthorized and NavigationQuery:
 *  - GET `/users/userHasAccess` -> `@userHasAccess`
 *  - GET `/auth0/cookie` -> `@auth0Cookie`
 *  - GET `/profile` -> `@profile`
 *  - and GET `/settings` -> `@settings`
 */
export function interceptSettingsAndProfile() {
  cy.intercept(
    pathToRouteMatcher('/', { method: 'GET' }, { api: 'unleash' }),
  ).as('getFlags');
  cy.intercept(
    pathToRouteMatcher('/users/userHasAccess', { method: 'GET' }),
  ).as('userHasAccess');
  cy.intercept(pathToRouteMatcher('/auth0/cookie', { method: 'GET' })).as(
    'auth0Cookie',
  );
  cy.intercept(pathToRouteMatcher('/profile', { method: 'GET' })).as('profile');
  cy.intercept(pathToRouteMatcher('/settings', { method: 'GET' })).as(
    'settings',
  );

  cy.intercept(pathToRouteMatcher('/ticketType', { method: 'GET' })).as(
    'ticketType',
  );
}

export function waitForSettingsAndProfile() {
  // Setup
  cy.wait('@getFlags');
  cy.wait('@userHasAccess')
    .its('response')
    .should('have.property', 'statusCode', 200);
  cy.wait('@auth0Cookie')
    .its('response')
    .should('have.property', 'statusCode', 200);
  cy.wait('@profile')
    .its('response')
    .should('have.property', 'statusCode', 200);

  // Load
  cy.wait('@getFlags');

  cy.wait('@settings')
    .its('response')
    .should('have.property', 'statusCode', 200);
  return cy.wait('@ticketType');
}
