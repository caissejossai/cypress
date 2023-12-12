import * as testIds from '@utils/testIds';

import { pathToRouteMatcher } from '../../support/utils/intercept';
import {
  interceptSettingsAndProfile,
  waitForSettingsAndProfile,
} from '../../support/utils/interceptSettingsAndProfile';

describe('Activity History page', () => {
  beforeEach(() => {
    cy.loginWithApi({ withSession: true });
    cy.intercept(
      pathToRouteMatcher('/equipments/:studioId/studioAssetHistory', {
        method: 'POST',
      }),
    ).as('studioAssetHistory');
    interceptSettingsAndProfile();
  });
  it('Loads into activity page', () => {
    cy.visit('/');
    waitForSettingsAndProfile();

    cy.findByTestId(testIds.sidebarLinkId(`/activity`)).click();
    cy.findByTestId(testIds.misc.pageLayoutTitle).contains('activity history', {
      matchCase: false,
    });
    cy.wait('@studioAssetHistory');
    cy.findByTestId(testIds.misc.tbody).should('be.visible');
  });
});
