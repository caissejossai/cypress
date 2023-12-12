import { allPathDefinitions } from '@utils/pathDefinitions/allPathDefinitions';
import * as testIds from '@utils/testIds';

import { pathToRouteMatcher } from '../../support/utils/intercept';
import {
  interceptSettingsAndProfile,
  waitForSettingsAndProfile,
} from '../../support/utils/interceptSettingsAndProfile';

describe('Login', () => {
  beforeEach(() => {
    cy.intercept(
      pathToRouteMatcher(`/auth0/organizations/:name`, {
        method: 'get',
      }),
    ).as('getName');
  });
  it('Shows the welcome screen', () => {
    cy.visit('/');
    cy.findByText(/welcome to the beam platform!/i);
    cy.findByRole('textbox', { name: /email address/i });
  });

  it("Gives a helpful message when email isn't found", () => {
    cy.visit('/');
    cy.findByRole('textbox', { name: /email address/i }).type(
      'test-email@example.com',
    );
    cy.findByRole('button', { name: /next/i }).click();
    cy.wait('@getName').its('request.url').should('include', '/auth0');
    cy.findByText(/email not found/i);
  });

  it('Logs the user in and shows the default page', () => {
    interceptSettingsAndProfile();

    cy.loginWithAuth0Ui({
      email: Cypress.env('userEmail'),
      password: Cypress.env('userPassword'),
    });
    waitForSettingsAndProfile();
    cy.findByTestId(testIds.misc.pageLayoutTitle).should(
      'contain.text',
      allPathDefinitions.beam.paths.dashboard.label,
    );
  });
});
