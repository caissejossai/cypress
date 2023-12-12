import { IRecentAssetsFixture } from '@beam-app/mocks/seedUtils/fixtureUtils.types';
import { format, parseISO } from 'date-fns';

import { IRecentProductApiModel } from '@models/ProductRaw.model';

import { IGetStudioSummaryRecentResponse } from '@services/queries/studios/getStudioSummaryRecentRaw';

import { DEFAULT_DATE_FORMAT } from '@utils/Formatting/formatDate';
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

const dashboardQueries: MatchTuple[] = [
  [
    pathToRouteMatcher('/import/:studioId/studioSummary/graphs'),
    'studioSummaryGraphs',
  ],
  [
    pathToRouteMatcher('/import/:studioId/studioSummary/overview'),
    'studioSummaryOverview',
  ],
  [
    pathToRouteMatcher('/import/:studioId/studioSummary/recent'),
    'studioSummaryRecent',
  ],
];
const { _ } = Cypress;

describe('Loads dashboard module', () => {
  beforeEach(() => {
    cy.loginWithApi({ withSession: true });
  });
  it('Opens dashboard', () => {
    interceptSettingsAndProfile();
    interceptMatchTuples(dashboardQueries);
    cy.visit('/');

    waitForSettingsAndProfile();
    cy.findByTestId(testIds.misc.pageLayoutTitle).contains(
      beamOnPathDefinition.paths.dashboard.label,
    );
    waitForMatchTuples(dashboardQueries);

    cy.findByTestId(testIds.misc.tbody).should('be.visible');
  });
  context('Renders dashboard module correctly', () => {
    interface ICtx {
      fullProduct: IRecentProductApiModel;
      emptyProduct: IRecentProductApiModel;
      stubProducts: IGetStudioSummaryRecentResponse;
    }
    const ctx = {} as ICtx;
    beforeEach(() => {
      cy.fixture('generated/recent-assets-response').then(
        (fixture: IRecentAssetsFixture) => {
          const {
            specialCases: { fullData, missingAll },
            data: { recentProducts },
          } = fixture;
          ctx.fullProduct = _.find(recentProducts, {
            equipmentid: fullData,
          }) as IRecentProductApiModel;
          ctx.emptyProduct = _.find(recentProducts, {
            equipmentid: missingAll,
          }) as IRecentProductApiModel;
          ctx.stubProducts = fixture.data;
          expect(ctx.emptyProduct).to.be.an('object');
          expect(ctx.fullProduct).to.be.an('object');
        },
      );
    });

    it('All graphs are visible', () => {
      interceptSettingsAndProfile();
      interceptMatchTuples(dashboardQueries);
      cy.visit('/dashboard', { failOnStatusCode: false });
      waitForSettingsAndProfile();
      waitForMatchTuples(dashboardQueries);
      const graphs = [
        testIds.dashboard.statusCategoryGraph,
        testIds.dashboard.productLifecycleGraph,
        testIds.dashboard.warrantyChart,
        testIds.dashboard.mfrChart,
        testIds.dashboard.productCategoryChart,
        testIds.dashboard.ageChart,
      ];
      _.each(graphs, graph => {
        cy.findByTestId(graph).should($el => {
          expect($el).to.have.attr('data-ready');
          expect($el).to.be.visible;
        });
      });
    });

    it('Recently added assets is visible below the graph', () => {
      interceptMatchTuples([dashboardQueries[0], dashboardQueries[1]]);
      cy.intercept(
        pathToRouteMatcher('/import/:studioId/studioSummary/recent'),
        ctx.stubProducts,
      ).as('studioSummaryRecent');
      interceptSettingsAndProfile();
      cy.visit('/dashboard', { failOnStatusCode: false });
      waitForSettingsAndProfile();
      waitForMatchTuples(dashboardQueries);

      cy.findByTestId(testIds.dashboard.recentlyAdded)
        .scrollIntoView()
        .as('recentlyAddedTable');

      const { emptyProduct, fullProduct } = ctx;
      cy.log('Testing a product with data');
      cy.get('@recentlyAddedTable')
        .findByTestId(testIds.rowId(`${fullProduct.equipmentid}`))
        .within(() => {
          cy.findByTestId(testIds.fieldId('productName')).should(
            'contain',
            fullProduct.productname,
          );
          cy.findByTestId(testIds.fieldId('productModel')).should(
            'contain',
            fullProduct.model,
          );
          cy.findByTestId(testIds.fieldId('manufacturerName')).should(
            'contain',
            fullProduct.manufacturername,
          );
          cy.findByTestId(testIds.fieldId('productCategory')).should(
            'contain',
            fullProduct.categoryname,
          );
          cy.findByTestId(testIds.fieldId('productStatus'))
            .findByTestId(testIds.valueId(fullProduct.productStatus))
            .should('exist');

          cy.findByTestId(testIds.fieldId('createdAt')).should(
            'contain',
            format(
              parseISO(fullProduct.equipmentcreatedat),
              DEFAULT_DATE_FORMAT,
            ),
          );
        });

      cy.log('Testing a product without data');
      cy.get('@recentlyAddedTable')
        .findByTestId(testIds.rowId(`${emptyProduct.equipmentid}`))
        .within(() => {
          cy.findByTestId(testIds.fieldId('productName')).should(
            'contain',
            'Empty',
          );
          cy.findByTestId(testIds.fieldId('productModel')).should(
            'contain',
            'Empty',
          );
          cy.findByTestId(testIds.fieldId('manufacturerName')).should(
            'contain',
            'Empty',
          );
          cy.findByTestId(testIds.fieldId('productCategory')).should(
            'contain',
            'Empty',
          );
        });
    });
  });
});
