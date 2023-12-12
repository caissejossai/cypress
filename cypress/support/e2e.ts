import './commands';

beforeEach(() => {
  // cy.intercept middleware to remove 'if-none-match' headers from all requests
  // to prevent the server from returning cached responses of API requests
  cy.intercept(
    { url: `${Cypress.env('apiUrl')}/**`, middleware: true },
    req => delete req.headers['if-none-match'],
  );
  cy.intercept(
    { url: `${Cypress.env('onboardingApiUrl')}/**`, middleware: true },
    req => delete req.headers['if-none-match'],
  );
});
