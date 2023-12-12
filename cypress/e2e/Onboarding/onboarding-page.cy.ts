import { BeamStatusOptionEnum } from '@models/Onboarding.model';

import { beamOnPathDefinition } from '@utils/pathDefinitions/beamOnPathDefinition';
import * as testIds from '@utils/testIds';

import { beamRequestStatusNameMap } from '@components/OnboardingRequestStatus/OnboardingRequestStatus.utils';

import { pathToRouteMatcher } from '../../support/utils/intercept';
import {
  interceptSettingsAndProfile,
  waitForSettingsAndProfile,
} from '../../support/utils/interceptSettingsAndProfile';

describe('Loads Onboarding module', () => {
  beforeEach(() => {
    cy.loginWithApi({ withSession: true });
    cy.intercept(
      pathToRouteMatcher(
        '/api/v1/file/status',
        { method: 'GET' },
        { api: 'onboarding' },
      ),
    ).as('onboardingFiles');
    interceptSettingsAndProfile();
  });

  it('Navigates to Onboarding and loads the page', () => {
    cy.visit('/');
    waitForSettingsAndProfile();

    cy.findByTestId(testIds.sidebarLinkId('/onboarding')).click();
    cy.findByTestId(testIds.misc.pageLayoutTitle).contains(
      beamOnPathDefinition.paths.onboarding.label,
    );

    cy.wait(['@onboardingFiles']);
    cy.findByTestId(testIds.misc.tbody).should('be.visible');
  });
  it('Visits the onboarding module and opens a file', () => {
    cy.visit('/onboarding', { failOnStatusCode: false });
    waitForSettingsAndProfile();

    cy.wait(['@onboardingFiles']);

    const validatedName =
      beamRequestStatusNameMap[BeamStatusOptionEnum.validated];
    cy.log(`Opening a ${validatedName} file`);
    cy.contains(
      `[data-testid*=${testIds.onboarding.fileRow}]`,
      validatedName,
    ).click();
  });
});
