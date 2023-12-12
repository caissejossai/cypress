import {
  beamOnPathDefinition,
  beamOnConfigurationTabs,
} from '@utils/pathDefinitions/beamOnPathDefinition';
import { IPageRoute } from '@utils/pathDefinitions/pathDefinition.types';
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

const userQueries: MatchTuple[] = [
  [
    pathToRouteMatcher('/studios/membersAuth0', { method: 'GET' }),
    'membersAuth0',
  ],
  [
    pathToRouteMatcher('/studios/:id/invites', { method: 'GET' }),
    'studioInvites',
  ],
];

const fieldsManagementQueries: MatchTuple[] = [
  [
    pathToRouteMatcher('/studios/:id/customField', {
      method: 'GET',
    }),
    'studioCustomField',
  ],
  [
    pathToRouteMatcher('/studios/barcode/field', { method: 'GET' }),
    'studioBarcodeField',
  ],
  [
    pathToRouteMatcher('/studios/:id/equipmentStatus', {
      method: 'GET',
    }),
    'studioEquipmentStatus',
  ],
  [
    pathToRouteMatcher('/studios/:id/ticketStatus', {
      method: 'GET',
    }),
    'studioTicketStatus',
  ],
  [
    pathToRouteMatcher('/studios/:id/taskStatus', { method: 'GET' }),
    'studioTaskStatus',
  ],
  [pathToRouteMatcher('/defaultFields', { method: 'GET' }), 'defaultFields'],
];

const tagsQueries: MatchTuple[] = [
  [pathToRouteMatcher('/tagsCategory', { method: 'GET' }), 'tagsCategory'],
];
const defaultDisplayQueries: MatchTuple[] = [
  [
    pathToRouteMatcher('/fieldsConfiguration/:location', {
      method: 'GET',
    }),
    'fieldsConfigurationLocationInventory',
  ],
  [
    pathToRouteMatcher('/fieldsConfiguration/:location', {
      method: 'GET',
    }),
    'fieldsConfigurationLocationAsset',
  ],
  [
    pathToRouteMatcher('/studios/:id/customField', {
      method: 'GET',
    }),
    'studioCustomField',
  ],
];

const notificationsQueries: MatchTuple[] = [
  [
    pathToRouteMatcher('/notifications/configuration', { method: 'GET' }),
    'notificationsConfiguration',
  ],
];
interface IQueryMap {
  [id: string]: MatchTuple[];
}
const queryMap: IQueryMap = {
  [beamOnConfigurationTabs.user]: userQueries,
  [beamOnConfigurationTabs.fieldsManagement]: fieldsManagementQueries,
  [beamOnConfigurationTabs.tags]: tagsQueries,
  [beamOnConfigurationTabs.defaultDisplay]: defaultDisplayQueries,
  [beamOnConfigurationTabs.notifications]: notificationsQueries,
};

interface ICtx {
  tabNameMap: Record<string, string>;
  sections: Record<string, IPageRoute>;
  tabValueMap: Record<string, string>;
  defaultTab: string;
}
describe('Loads configuration module', () => {
  const ctx = {
    tabNameMap: beamOnPathDefinition.paths.configuration.tabNameMap,
    sections: beamOnPathDefinition.paths.configuration.sections,
    tabValueMap: beamOnPathDefinition.paths.configuration.tabValueMap,
    defaultTab: beamOnPathDefinition.paths.configuration.defaultTab,
  } as ICtx;
  beforeEach(() => {
    cy.loginWithApi({ withSession: true });

    interceptSettingsAndProfile();
    cy.intercept(
      pathToRouteMatcher('/studios/:id/invites', { method: 'GET' }),
    ).as('studioInvites');

    _.each(queryMap, queries => {
      interceptMatchTuples(queries);
    });
  });

  it('Navigates to configuration page', () => {
    const { tabNameMap } = ctx;
    cy.visit('/');
    waitForSettingsAndProfile();
    cy.findByTestId(testIds.sidebarLinkId('/configuration')).click();
    cy.findAllByTestId(testIds.misc.pageLayoutTitle)
      .contains('configuration', {
        matchCase: false,
      })
      .should('have.length', 1);
    cy.location('search').should('contain', ctx.defaultTab);
    cy.findByTestId(testIds.panelId(ctx.defaultTab))
      .findByTestId(testIds.misc.pageLayoutTitle)
      .contains(tabNameMap[ctx.defaultTab]);
  });
  /**
   * @function ensureSectionLoads
   * @description Validates that a configuration page section, its default tab and its tabs load by clicking through.
   */
  function ensureConfigSectionLoads(
    configTab: string,
    section: IPageRoute | undefined,
  ) {
    const { tabNameMap } = ctx;
    const { defaultTab, tabValueMap } = section || {};
    cy.location('search').should('contain', configTab);
    cy.findByTestId(testIds.panelId(configTab))
      .findByTestId(testIds.misc.pageLayoutTitle)
      .contains(tabNameMap[configTab]);

    // Wait for query
    waitForMatchTuples(queryMap[configTab]);
    // Assert it (and its default Tab)
    cy.findByTestId(testIds.panelId(configTab))
      .should('be.visible')
      .within(() => {
        cy.findByTestId(testIds.misc.defaultTbody).should('be.visible');
      });
    // Stop if no subtabs
    if (!tabValueMap) return;
    // Assert it's default tab
    cy.location('search').should('contain', defaultTab);
    const tabs = Object.values(tabValueMap).filter(tab => tab !== defaultTab);
    //   Next
    tabs.forEach(tab => {
      cy.findByTestId(testIds.tabId(tab)).click();
      cy.location('search').should('contain', tab);
      cy.findByTestId(testIds.panelId(tab))
        .should('be.visible')
        .within(() => {
          cy.findByTestId(testIds.misc.tbody).should('be.visible');
        });
    });
  }
  it('Loads all configuration tabs', () => {
    cy.visit('/configuration', { failOnStatusCode: false });
    waitForSettingsAndProfile();

    cy.log(`Validating section ${ctx.defaultTab}`);
    ensureConfigSectionLoads(ctx.defaultTab, ctx.sections[ctx.defaultTab]);

    const remainingTabs = Object.keys(queryMap).filter(tab => {
      return tab !== beamOnPathDefinition.paths.configuration.defaultTab;
    });

    remainingTabs.forEach(configTab => {
      cy.log(`Validating section ${configTab}`);
      const section = ctx.sections[configTab];
      cy.findByTestId(testIds.tabId(configTab)).click();
      ensureConfigSectionLoads(configTab, section);
    });
  });
});
