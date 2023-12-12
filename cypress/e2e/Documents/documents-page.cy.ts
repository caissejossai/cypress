import { beamOnPathDefinition } from '@utils/pathDefinitions/beamOnPathDefinition';
import * as testIds from '@utils/testIds';

import { pathToRouteMatcher } from '../../support/utils/intercept';
import {
  interceptSettingsAndProfile,
  waitForSettingsAndProfile,
} from '../../support/utils/interceptSettingsAndProfile';

describe('Loads documents module', () => {
  beforeEach(() => {
    cy.loginWithApi({ withSession: true });

    cy.intercept(
      pathToRouteMatcher('/documents/:studioId', { method: 'GET' }),
    ).as('studioDocuments');
    cy.intercept(pathToRouteMatcher('/documentFolder', { method: 'GET' })).as(
      'documentsFolders',
    );
    interceptSettingsAndProfile();
  });

  it('Navigates to documents page', () => {
    cy.visit('/');
    waitForSettingsAndProfile();
    const { documents } = beamOnPathDefinition.paths;

    cy.findByTestId(testIds.sidebarLinkId(documents.id)).click();
    cy.findByTestId(testIds.misc.pageLayoutTitle).contains(documents.label);
    cy.wait(['@documentsFolders', '@studioDocuments']);
    cy.findAllByTestId(testIds.misc.tbody).should('be.visible');
  });
});
