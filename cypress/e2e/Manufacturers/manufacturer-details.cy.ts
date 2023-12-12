import { pathToRegexp } from 'path-to-regexp';

import { beamOnPathDefinition } from '@utils/pathDefinitions/beamOnPathDefinition';
import * as testIds from '@utils/testIds';

import { pathToRouteMatcher } from '../../support/utils/intercept';
import {
  interceptMatchTuples,
  MatchTuple,
  waitForMatchTuples,
} from '../../support/utils/interceptMatchTuple';
import {
  interceptSettingsAndProfile,
  waitForSettingsAndProfile,
} from '../../support/utils/interceptSettingsAndProfile';

const { _ } = Cypress;
const { manufacturerDetails } = beamOnPathDefinition.paths;

const manufacturerDetailsQueries: Record<string, MatchTuple[]> = {
  [manufacturerDetails.defaultTab]: [
    [
      pathToRouteMatcher('/manufacturers/view/:studioId/:manufacturerId', {
        method: 'GET',
      }),
      'manufacturerDetails',
    ],
    [
      pathToRouteMatcher(
        '/manufacturers/view/assets/:studioId/:manufacturerId',
        {
          method: 'GET',
        },
      ),
      'manufacturerAssets',
    ],
  ],

  [manufacturerDetails.tabValueMap.tasks]: [
    [
      pathToRouteMatcher('/studios/:studioId/tasks', {
        method: 'GET',
      }),
      'tasks',
    ],
  ],
  [manufacturerDetails.tabValueMap.contacts]: [
    [
      pathToRouteMatcher(
        '/manufacturers/view/contacts/:studioId/:manufacturerId',
        {
          method: 'GET',
        },
      ),
      'manufacturerContacts',
    ],
  ],
  [manufacturerDetails.tabValueMap.resources]: [
    [
      pathToRouteMatcher(
        '/manufacturers/view/resources/:studioId/:manufacturerId',
        {
          method: 'GET',
        },
      ),
      'manufacturerResources',
    ],
  ],
  [manufacturerDetails.tabValueMap.tickets]: [
    [
      pathToRouteMatcher('/studios/:studioId/tickets/v2', {
        method: 'POST',
      }),
      'tickets',
    ],
  ],
  [manufacturerDetails.tabValueMap.activity]: [
    [
      pathToRouteMatcher('/equipments/:studioId/manufacturerLogs', {
        method: 'POST',
      }),
      'manufacturerHistory',
    ],
  ],
  [manufacturerDetails.tabValueMap.updates]: [
    [
      pathToRouteMatcher('/studios/:studioId/updates', {
        method: 'GET',
      }),
      'manufacturerUpdates',
    ],
  ],
  [manufacturerDetails.tabValueMap.documents]: [
    [
      pathToRouteMatcher('/documents/:studioId', {
        method: 'GET',
      }),
      'manufacturerDocuments',
    ],
  ],
};

interface ICtx {
  tabNameMap: Record<string, string>;
  tabValueMap: Record<string, string>;
  defaultTab: string;
}
describe('Manufacturer details', () => {
  beforeEach(() => {
    cy.loginWithApi({ withSession: true });
    cy.intercept(
      pathToRouteMatcher('/manufacturers/view/:studioId', { method: 'GET' }),
    ).as('manufacturersView');
    const allQueries = Object.values(manufacturerDetailsQueries).flat();
    interceptMatchTuples(allQueries);
    interceptSettingsAndProfile();
  });

  // Todo: Expand on this in manufacturer details test, and then check each tab
  it('Opens any manufacturer', () => {
    const ctx = {
      defaultTab: manufacturerDetails.defaultTab,
      tabNameMap: manufacturerDetails.tabNameMap,
      tabValueMap: manufacturerDetails.tabValueMap,
    } as ICtx;
    const { defaultTab, tabValueMap } = ctx;
    cy.visit('/manufacturers', { failOnStatusCode: false });
    waitForSettingsAndProfile();

    cy.wait('@manufacturersView');

    cy.findAllByTestId(testIds.misc.tr).first().click();
    cy.location('pathname').should('match', pathToRegexp('/manufacturers/:id'));
    // Wait for initial
    waitForMatchTuples(manufacturerDetailsQueries[ctx.defaultTab]);

    // Assert it loads
    const sidebarId = testIds.queryId(testIds.misc.innerSidebar)('success');
    cy.findByTestId(sidebarId).should('be.visible');
    cy.location('search').should('contain', defaultTab);

    // Assert its default tabs
    cy.findByTestId(testIds.misc.defaultTbody).should('be.visible');

    // Next

    const otherTabs = _.filter(tabValueMap, tab => tab !== defaultTab);
    otherTabs.forEach(tab => {
      cy.findByTestId(testIds.tabId(tab)).click();
      cy.location('search').should('contain', tab);
      waitForMatchTuples(manufacturerDetailsQueries[tab]);
      cy.findByTestId(testIds.panelId(tab))
        .should('be.visible')
        .within(() => {
          cy.findByTestId(testIds.misc.tbody).should('be.visible');
        });
    });
  });
});
