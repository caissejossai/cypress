import { updateTabNameMap, updateTabs } from '@pages/Updates/utils';

import { UpdateStatusType } from '@models/UpdateStatus.model';

import { IGetStudioUpdatesMetrics } from '@services/queries/studios/getStudioUpdatesMetrics/getStudioUpdatesMetrics';

import { formatNumber } from '@utils/Formatting/formatNumber';
import { beamOnPathDefinition } from '@utils/pathDefinitions/beamOnPathDefinition';
import * as testIds from '@utils/testIds';

import { pathToRouteMatcher } from '../../support/utils/intercept';
import {
  interceptSettingsAndProfile,
  waitForSettingsAndProfile,
} from '../../support/utils/interceptSettingsAndProfile';

const { _ } = Cypress;

const updatesAlias = (
  statusType: UpdateStatusType,
  isAssignedToMe?: boolean,
) => {
  if (isAssignedToMe) {
    return `studioUpdatesRaw-assignedToMe`;
  }
  return `studioUpdatesRaw-${statusType}`;
};

interface IUpdateView {
  tab: string;
  type: UpdateStatusType;
  isAssignedToMe?: boolean;
}

interface IUpdateViews {
  new: IUpdateView;
  prioritized: IUpdateView;
  completed: IUpdateView;
  dismissed: IUpdateView;
  assignedToMe: IUpdateView;
}
const updateViews: IUpdateViews = {
  new: {
    tab: updateTabs.new,
    type: UpdateStatusType.NEW,
  },
  prioritized: {
    tab: updateTabs.prioritized,
    type: UpdateStatusType.PRIORITIZED,
  },
  completed: {
    tab: updateTabs.completed,
    type: UpdateStatusType.COMPLETED,
  },
  dismissed: {
    tab: updateTabs.dismissed,
    type: UpdateStatusType.DISMISSED,
  },
  assignedToMe: {
    tab: updateTabs.assinedToMe,
    type: UpdateStatusType.PRIORITIZED,
    isAssignedToMe: true,
  },
};

type Tabs = keyof typeof updateViews;

describe('List Updates Feature', () => {
  beforeEach(() => {
    cy.loginWithApi({ withSession: true });
    cy.intercept(pathToRouteMatcher('/:id/updates', { method: 'GET' }), req => {
      const isAssignedToMe = req.query.assignedToMe === 'true';
      const statusType = req.query.type as UpdateStatusType;
      req.alias = updatesAlias(statusType, isAssignedToMe);
    });
    cy.intercept(
      pathToRouteMatcher('/:id/updatesMetrics', { method: 'GET' }),
    ).as('studioUpdatesMetrics');
    interceptSettingsAndProfile();
  });

  it(`Doesn't error on any tabs `, () => {
    cy.visit(`/updates`, { failOnStatusCode: false });
    waitForSettingsAndProfile();
    cy.findByTestId(testIds.misc.pageLayoutTitle).contains(
      beamOnPathDefinition.paths.updates.label,
    );
    cy.location('search').should('contain', 'tab');
    cy.wait(`@studioUpdatesMetrics`)
      .its('response.body')
      .then((metrics: IGetStudioUpdatesMetrics) => {
        _.each(updateViews, (updateView, tabName) => {
          // updateMetrics
          cy.findByTestId(testIds.tabId(updateView.tab)).contains(
            formatNumber(metrics[tabName as Tabs]),
          );

          // tabs load.
          cy.wait(
            `@${updatesAlias(updateView.type, updateView.isAssignedToMe)}`,
          );

          // Maybe extract this to component test?
          cy.findByTestId(testIds.tabId(updateView.tab))
            .contains(updateTabNameMap[updateView.tab])
            .click();
          cy.findByTestId(testIds.panelId(updateView.tab))
            .findByTestId(testIds.misc.tbody)
            .should('be.visible');
        });
      });
  });
});
