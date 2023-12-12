import { IProductTestFixture } from '@beam-app/mocks/seedUtils/fixtureUtils.types';
import { faker } from '@faker-js/faker';
import type { CyHttpMessages } from 'cypress/types/net-stubbing';
import { isToday } from 'date-fns';

import { IProductApiModel } from '@models/Product.model';
import { IStudioApiModel } from '@models/Studio.model';
import { IUserInvitedApiModel } from '@models/UserInvited.model';

import { IPostLoginWithEmailResponse } from '@services/queries/auth0/postLoginWithEmail';
import { IPostCreateAsset } from '@services/queries/onboarding/createAsset';
import { IGetStudioSummaryRecentResponse } from '@services/queries/studios/getStudioSummaryRecentRaw';

import { parseDate } from '@utils/Parsers/parseDate';

import {
  bodyHelper,
  checkExp,
  serialiseExp,
  setUserAndStudio,
} from '../../support/utils/misc';

interface IOnboardingApiCtx {
  authHeaders: CyHttpMessages.BaseMessage['headers'];
  identifiedProduct: IProductApiModel;
  studio: IStudioApiModel;
  user: IUserInvitedApiModel;
  expiresAt: number;
}
const apiAssets = `${Cypress.env('onboardingApiUrl')}/api/v1/assets`;
const apiImport = `${Cypress.env('apiUrl')}/import`;
const { _ } = Cypress;

describe('Onboarding Assets API', () => {
  const ctx = {} as IOnboardingApiCtx;
  beforeEach(() => {
    const body = {
      email: `${Cypress.env('userEmail')}`,
      password: `${Cypress.env('userPassword')}`,
    };
    cy.session(
      body.email,
      () => {
        cy.request({
          method: 'POST',
          body,
          url: `${Cypress.env('apiUrl')}/auth0/token`,
        })
          .its('body')
          .then(($body: IPostLoginWithEmailResponse) => {
            const { access_token, expires_in } = $body;
            expect(access_token).length.above(0);
            ctx.expiresAt = serialiseExp(expires_in);
            ctx.authHeaders = { Authorization: `Bearer ${access_token}` };
          });
      },
      {
        validate() {
          expect(checkExp(ctx.expiresAt), 'checkExp(ctx.expiresAt)').true;
        },
      },
    );
  });
  beforeEach(() => {
    // Consider refreshing if token expires mid-test here.

    // Get fixtures
    cy.fixture('generated/products').then((fixture: IProductTestFixture) => {
      const { data, specialCases } = fixture;
      ctx.identifiedProduct = _.find(data, {
        id: specialCases.identified,
      }) as IProductApiModel;
    });
    cy.task('db:seed:filled');

    setUserAndStudio(ctx);
  });

  context('POST /manual/matched', () => {
    it('Creates an identified product', () => {
      const { identifiedProduct } = ctx;
      const { id: studioId, name: studioName } = ctx.studio;
      const {
        avatar: triggeredByAvatar,
        email: triggeredByEmail,
        id: triggeredById,
        name: triggeredBy,
      } = ctx.user;

      // Adding a product via quick add
      cy.request({
        url: `${apiAssets}/manual/matched`,
        method: 'POST',
        headers: ctx.authHeaders,
        body: bodyHelper<IPostCreateAsset>({
          amountProducts: [
            {
              amount: 1,
              productId: identifiedProduct.id,
              manufacturerId: `${identifiedProduct.manufacturerId}`,
            },
          ],
          studioId,
          studioName,
          user: {
            triggeredByAvatar: `${triggeredByAvatar}`,
            triggeredByEmail,
            triggeredById,
            triggeredBy,
          },
          processMatch: true,
        }),
      });
      // It should show up on dashboard
      cy.request({
        url: `${apiImport}/${studioId}/studioSummary/recent`,
        method: 'GET',
        headers: ctx.authHeaders,
      })
        .its('body')
        .then(($body: IGetStudioSummaryRecentResponse) => {
          const [recentProduct] = $body.recentProducts;
          // It should be the the first one on the list, and added today.
          expect(recentProduct.productId).to.equal(identifiedProduct.id);
          const createdAt = parseDate(recentProduct.equipmentcreatedat);
          expect(createdAt).to.be.a('date');
          expect(isToday(createdAt as Date)).to.be.true;
        });
    });
  });
  context('POST /manual/internal', () => {
    it('Creates an internal product', () => {
      const { id: studioId, name: studioName } = ctx.studio;
      const {
        avatar: triggeredByAvatar,
        email: triggeredByEmail,
        id: triggeredById,
        name: triggeredBy,
      } = ctx.user;

      const internalProduct = {
        name: faker.string.uuid(),
        manufacturerName: faker.string.uuid(),
      };
      cy.request({
        url: `${apiAssets}/manual/internal`,
        headers: ctx.authHeaders,
        method: 'POST',
        body: bodyHelper<IPostCreateAsset>({
          amountProducts: [
            {
              amount: 1,
              // GIVEN an internal product
              tempManufacturerName: internalProduct.manufacturerName,
              tempProductName: internalProduct.name,
            },
          ],
          studioId,
          studioName,
          user: {
            triggeredByAvatar: `${triggeredByAvatar}`,
            triggeredByEmail,
            triggeredById,
            triggeredBy,
          },
          processMatch: false,
        }),
      });
      // It should show up on dashboard
      cy.request({
        url: `${apiImport}/${studioId}/studioSummary/recent`,
        method: 'GET',
        headers: ctx.authHeaders,
      })
        .its('body')
        .then(($body: IGetStudioSummaryRecentResponse) => {
          const [recentProduct] = $body.recentProducts;
          // It should be the the first one on the list
          expect(recentProduct.productname).to.equal(internalProduct.name);
          expect(recentProduct.manufacturername).to.equal(
            internalProduct.manufacturerName,
          );
        });
    });
  });
});
