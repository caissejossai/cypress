import { pathToRegexp } from 'path-to-regexp';

import { beamOnPathDefinition } from '@utils/pathDefinitions/beamOnPathDefinition';
import * as testIds from '@utils/testIds';

import { pathToRouteMatcher } from '../../support/utils/intercept';
import {
  interceptSettingsAndProfile,
  waitForSettingsAndProfile,
} from '../../support/utils/interceptSettingsAndProfile';

describe('Inventory Page', () => {
  beforeEach(() => {
    cy.loginWithApi({ withSession: true });
    cy.intercept(
      pathToRouteMatcher('/equipmentsfts', {
        method: 'POST',
      }),
    ).as('equipmentsFts');
    cy.intercept(
      pathToRouteMatcher('/equipments/:id', {
        method: 'GET',
      }),
    ).as('equipment');
    interceptSettingsAndProfile();
  });
  it('Opens the inventory page and navigates to an asset', () => {
    cy.visit('/');
    waitForSettingsAndProfile();

    cy.findByTestId(testIds.sidebarLinkId(`/products`)).click();
    cy.findByTestId(testIds.misc.pageLayoutTitle).contains(
      beamOnPathDefinition.paths.products.label,
    );
    cy.wait('@equipmentsFts');
    cy.findByTestId(testIds.misc.tbody).should('be.visible');
    cy.findAllByTestId(testIds.misc.tr).first().click();

    cy.location('pathname').should('match', pathToRegexp('/equipments/:id'));
    cy.wait('@equipment');
    cy.findByTestId(testIds.misc.tabTitle).should('exist');
  });

  // Test Case 1: Open Inventory page
  it('Opens the inventory page sucessfully', () => {
    cy.visit('/products');
    cy.get('.mantine-Autocomplete-input').type('BD-C430F{enter}');
  });

  // Test Case 2: Search for known equipment
  it.only('Search for known equipment', () => {
    const knownEquipmentModel = 'NP3C';
    // Intercept requests dynamically based on the "q" query parameter
    cy.intercept(`**/products?q=${knownEquipmentModel}`).as('searchRequest');

    // Perform a search using the known equipment's model
    cy.visit('/products');
    cy.wait(5000);
    cy.get('input[placeholder="Search Products"]')
      .should('exist')
      .type('NP3C{enter}');

    // Wait for the search results to load
    cy.wait('@equipmentsFts');

    // Assert that the known equipment is visible in the search results by checking for its ID
    cy.wait(5000);
    // cy.findByTestId(testIds.misc.tbody).should('be.visible');
    cy.findAllByTestId(testIds.rowId('62ef85e0-3470-49f6-af8e-2d5257f4f595'))
      .should('be.visible')
      .click();
  });

  it('Search for Non-Existent Equipment', () => {
    const nonExistentEquipmentModel = 'NP3C3';
    // Intercept requests dynamically based on the "q" query parameter
    cy.intercept(`**/products?q=${nonExistentEquipmentModel}`).as(
      'searchRequest',
    );

    // Perform a search using the known equipment's model
    cy.visit('/products'); // Replace with the actual URL
    cy.wait(5000);
    cy.get('input[placeholder="Search Products"]')
      .should('exist')
      .type('NP3C3{enter}');

    // Wait for the search results to load
    cy.wait('@equipmentsFts');

    // Assert that no results are returned.
    cy.findByTestId(testIds.misc.tbody).should('not.exist');
    cy.contains('Error on load products').should('be.visible');
  });
});
