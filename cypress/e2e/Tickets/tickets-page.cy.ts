import { beamOnPathDefinition } from '@utils/pathDefinitions/beamOnPathDefinition';
import * as testIds from '@utils/testIds';

import { pathToRouteMatcher } from '../../support/utils/intercept';
import {
  interceptSettingsAndProfile,
  waitForSettingsAndProfile,
} from '../../support/utils/interceptSettingsAndProfile';

describe('Tickets page', () => {
  beforeEach(() => {
    cy.loginWithApi({ withSession: true });
    cy.intercept(
      pathToRouteMatcher('/studios/:studioId/tickets/v2', {
        method: 'POST',
      }),
    ).as('studioTickets');
    interceptSettingsAndProfile();
  });
  it('Loads into tickets page', () => {
    cy.visit('/');
    waitForSettingsAndProfile();

    cy.findByTestId(testIds.sidebarLinkId(`/tickets`)).click();
    cy.findByTestId(testIds.misc.pageLayoutTitle).contains(
      beamOnPathDefinition.paths.tickets.label,
    );
    cy.wait('@studioTickets');
    cy.findByTestId(testIds.misc.tbody).should('be.visible');
  });
});
