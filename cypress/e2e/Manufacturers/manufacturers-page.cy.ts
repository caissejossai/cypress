import { beamOnPathDefinition } from '@utils/pathDefinitions/beamOnPathDefinition';
import * as testIds from '@utils/testIds';

import { pathToRouteMatcher } from '../../support/utils/intercept';
import {
  interceptSettingsAndProfile,
  waitForSettingsAndProfile,
} from '../../support/utils/interceptSettingsAndProfile';

describe('Manufacturers module', () => {
  beforeEach(() => {
    cy.loginWithApi({ withSession: true });
    cy.intercept(
      pathToRouteMatcher('/manufacturers/view/:studioId', { method: 'GET' }),
    ).as('manufacturersView');
    interceptSettingsAndProfile();
  });

  // Todo: Expand on this in renders and paginates
  it('Navigates to the manufacturers page', () => {
    cy.visit('/');
    waitForSettingsAndProfile();

    cy.findByTestId(testIds.sidebarLinkId('/manufacturers')).click();
    cy.findByTestId(testIds.misc.pageLayoutTitle).contains(
      beamOnPathDefinition.paths.manufacturers.label,
    );
    cy.wait('@manufacturersView');
    cy.findByTestId(testIds.misc.tbody).should('be.visible');
  });
});
