import { beamOnPathDefinition } from '@utils/pathDefinitions/beamOnPathDefinition';
import * as testIds from '@utils/testIds';

import { pathToRouteMatcher } from '../../support/utils/intercept';
import {
  interceptSettingsAndProfile,
  waitForSettingsAndProfile,
} from '../../support/utils/interceptSettingsAndProfile';

const { _ } = Cypress;
interface ICtx {
  tabValueMap: Record<string, string>;
  defaultTab: string;
}
describe('Tasks page', () => {
  const ctx = {
    tabValueMap: beamOnPathDefinition.paths.tasks.tabValueMap,
    defaultTab: beamOnPathDefinition.paths.tasks.defaultTab,
  } as ICtx;
  beforeEach(() => {
    cy.loginWithApi({ withSession: true });
    cy.intercept(
      pathToRouteMatcher('/studios/:studioId/tasks', {
        method: 'GET',
      }),
    ).as('studioTasks');
    interceptSettingsAndProfile();
  });
  it('Loads into tasks page', () => {
    cy.visit('/');
    waitForSettingsAndProfile();

    cy.findByTestId(testIds.sidebarLinkId(`/tasks`)).click();
    cy.findByTestId(testIds.misc.pageLayoutTitle).contains(
      beamOnPathDefinition.paths.tasks.label,
    );
    cy.wait('@studioTasks');
    cy.findByTestId(testIds.misc.tbody).should('be.visible');

    // Assert default tab
    const { tabValueMap, defaultTab } = ctx;
    cy.location('search').should('contain', defaultTab);
    const otherPaths = _.filter(tabValueMap, value => value !== defaultTab);
    // Assert for next and every other tab
    otherPaths.forEach(tab => {
      cy.findByTestId(testIds.tabId(tab)).click();
      cy.wait('@studioTasks');
      cy.location('search').should('contain', tab);
      cy.findByTestId(testIds.panelId(tab))
        .should('be.visible')
        .within(() => {
          cy.findByTestId(testIds.misc.tbody).should('be.visible');
        });
    });
  });
});
