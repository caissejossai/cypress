import {
  IManufacturerTestFixture,
  IProductTestFixture,
} from '@beam-app/mocks/seedUtils/fixtureUtils.types';
import { faker } from '@faker-js/faker';
import type { CyHttpMessages } from 'cypress/types/net-stubbing';

import { IProductApiModel } from '@models/Product.model';
import { IUserInvitedApiModel } from '@models/UserInvited.model';

import { IManufacturerInsightsApiModel } from '@services/queries/manufacturers/getManufacturersInsightsRaw';
import {
  ICreateAssetResponse,
  IPostCreateAsset,
  IPostTriggeredBy,
  IProductAmount,
} from '@services/queries/onboarding/createAsset';

import * as testIds from '@utils/testIds';

import { pathToRouteMatcher } from '../../support/utils/intercept';
import {
  interceptSettingsAndProfile,
  waitForSettingsAndProfile,
} from '../../support/utils/interceptSettingsAndProfile';
import { bodyHelper, setUser } from '../../support/utils/misc';
import * as onboardingUtils from '../../support/utils/Onboarding';

const { _ } = Cypress;
interface ICtx {
  manufacturer: IManufacturerInsightsApiModel;
  product: IProductApiModel;
  user: IUserInvitedApiModel;
  fileId: string;
}
interface IProductDetails {
  name: string;
  mfr: string;
  mpn: string;
  evidenceUrl: string;
  searchMfr?: string;
  amount: number;
}
function checkResponseForFileId(
  response: CyHttpMessages.IncomingResponse | undefined,
  ctx: ICtx,
) {
  expect(response?.statusCode).to.equal(200);
  expect(response?.body).to.be.an('object');
  const { fileId } = response?.body as ICreateAssetResponse;
  ctx.fileId = fileId;
}

function selectProductAmount(amount: number) {
  _.times(amount - 1, () => {
    cy.findByTestId(testIds.quantityCounter.addAmountBtn).click();
  });
}

function selectCustomProductFromMfr(product: IProductDetails) {
  cy.findByTestId(testIds.quickAdd.mfrSearch).type(`${product.mfr}{enter}`);
  cy.findByText(new RegExp(`continue with ${product.mfr} as manufacturer`, 'i'))
    .should($el => {
      expect($el).to.not.have.attr('[data-disabled]');
    })
    .click();

  cy.findByTestId(testIds.quickAdd.mfrContinueBtn).click();
  cy.findByText('New Product').should('exist');

  cy.findByTestId(testIds.quickAddNewProduct.mfrSelect).should(
    'have.value',
    product.mfr,
  );
  cy.findByTestId(testIds.quickAddNewProduct.productNameInput).type(
    product.name,
  );
}
function sendAndVerifyProductFromMfr(product: IProductDetails, ctx: ICtx) {
  cy.findByTestId(testIds.quickAddNewProduct.addAssetsBtn).click();

  cy.wait('@postAssetsManualInternal').then($intercept => {
    const { request, response } = $intercept;

    // Req
    const { amountProducts, user } = request.body as IPostCreateAsset;
    const [productSent] = amountProducts;
    expect(productSent).to.contain(
      bodyHelper<Partial<IProductAmount>>({
        amount: product.amount,
        tempManufacturerName: product.mfr,
        tempProductName: product.name,
        resource: product.evidenceUrl,
        tempProductModel: product.mpn,
      }),
    );
    expect(user).to.be.an('object');

    // Res
    checkResponseForFileId(response, ctx);
  });
  onboardingUtils.waitAndVerifyFileId(ctx);
}
describe('Onboarding Quick Add', () => {
  const ctx = {} as ICtx;
  beforeEach(() => {
    cy.loginWithApi({ withSession: true });

    onboardingUtils.interceptFileStatusId(ctx);
    cy.intercept(
      pathToRouteMatcher('/manufacturers/index', { method: 'GET' }),
    ).as('manufacturersIndex');
    cy.intercept(pathToRouteMatcher('/products', { method: 'GET' })).as(
      'products',
    );
    cy.intercept(
      pathToRouteMatcher(
        '/api/v1/assets/manual/matched',
        { method: 'POST' },
        { api: 'onboarding' },
      ),
    ).as('postAssetsManualMatched');
    cy.intercept(
      pathToRouteMatcher(
        '/api/v1/assets/manual/internal',
        { method: 'POST' },
        { api: 'onboarding' },
      ),
    ).as('postAssetsManualInternal');

    interceptSettingsAndProfile();
    cy.fixture('generated/manufacturers.json').then(
      (fixture: IManufacturerTestFixture) => {
        const { data, specialCases } = fixture;
        const identifiedmfr = _.find(data, {
          id: specialCases.identified,
        });
        expect(identifiedmfr).to.be.an('object');
        ctx.manufacturer = identifiedmfr as ICtx['manufacturer'];
      },
    );
    cy.fixture('generated/products.json').then(
      (fixture: IProductTestFixture) => {
        const { data, specialCases } = fixture;
        const identifiedProduct = _.find(data, {
          id: specialCases.identified,
        });
        expect(identifiedProduct).to.be.an('object');
        ctx.product = identifiedProduct as ICtx['product'];
      },
    );
    cy.task('db:seed:filled');
    setUser(ctx);

    cy.visit('/onboarding', { failOnStatusCode: false });
    waitForSettingsAndProfile();
    cy.findByTestId(testIds.onboarding.pageMenu).click();

    cy.findByTestId(testIds.globalMenu.menu)
      .findByText(/quick add/i)
      .click();
  });

  it('Adds a valid product from the list', () => {
    cy.findByText('Add a New Asset').should('exist');
    cy.findByTestId(testIds.quickAdd.mfrSearch).type(
      `${ctx.manufacturer.name}{enter}`,
    );
    cy.wait('@manufacturersIndex');

    cy.findByTestId(testIds.rowId(ctx.manufacturer.id)).click();
    cy.findByTestId(testIds.quickAdd.mfrContinueBtn).click();

    cy.findByTestId(testIds.quickAdd.mfrSearch).should(
      'have.value',
      ctx.manufacturer.name,
    );
    cy.findByTestId(testIds.quickAdd.mfrSearchImage).should('exist');

    cy.findByTestId(testIds.quickAdd.productSearch).type(
      `${ctx.product.name}{enter}`,
    );
    // First request happens on navigating to tab, second is after we searched.
    cy.wait(['@products', '@products']);

    cy.findByTestId(testIds.rowId(ctx.product.id)).click();
    cy.findByTestId(testIds.quickAdd.addAssetsBtn).click();

    cy.wait('@postAssetsManualMatched').then($intercept => {
      const { request, response } = $intercept;
      const { product, user } = ctx;

      // Req
      const { amountProducts, user: userSent } =
        request.body as IPostCreateAsset;
      const [productSent] = amountProducts;
      expect(productSent).to.contain({
        productId: product.id,
        manufacturerId: product.manufacturerId,
        amount: 1,
      });

      expect(userSent).to.contain(
        bodyHelper<IPostTriggeredBy>({
          triggeredBy: user.name,
          triggeredByAvatar: `${user.avatar}`,
          triggeredById: user.id,
          triggeredByEmail: user.email,
        }),
      );
      // Res
      checkResponseForFileId(response, ctx);
    });
    onboardingUtils.waitAndVerifyFileId(ctx);
  });

  it('Adds a custom product from manufacturers section as internal', () => {
    const productToSend: IProductDetails = {
      name: faker.string.uuid(),
      mfr: faker.string.uuid(),
      mpn: '',
      evidenceUrl: '',
      amount: 1,
    };
    selectCustomProductFromMfr(productToSend);

    cy.findByTestId(testIds.quickAddNewProduct.addAsInternal).click();
    sendAndVerifyProductFromMfr(productToSend, ctx);
  });
  it('Adds a custom product from manufacturers section with matching', () => {
    const productToSend: IProductDetails = {
      name: faker.string.uuid(),
      mfr: faker.string.uuid(),
      evidenceUrl: '',
      mpn: '',
      amount: 1,
    };
    selectCustomProductFromMfr(productToSend);

    cy.findByTestId(testIds.quickAddNewProduct.processMatchBtn).click();
    sendAndVerifyProductFromMfr(productToSend, ctx);
  });

  it('Adds 2 custom products from products section as internal', () => {
    const productToSend: IProductDetails = {
      name: faker.string.uuid(),
      mfr: faker.string.uuid(),
      mpn: faker.string.uuid(),
      evidenceUrl: 'https://example.com',
      amount: 2,
    };
    cy.findByTestId(testIds.quickAdd.skipManufacturer).click();
    cy.findByTestId(testIds.quickAdd.skippedText).should('exist');

    cy.findByTestId(testIds.quickAdd.productSearch).type(
      `${productToSend.name}{enter}`,
    );
    cy.wait(['@products', '@products']);
    cy.findByTestId(testIds.quickAdd.continueWith)
      .should($el => {
        expect($el).to.not.have.attr('[data-disabled]');
      })
      .click();
    cy.findByTestId(testIds.quickAdd.addAssetsBtn).click();

    cy.findByTestId(testIds.quickAddNewProduct.mfrSelect).type(
      productToSend.mfr,
    );
    cy.findByTestId(testIds.inputDropdown.customValue).should(
      'contain',
      productToSend.mfr,
    );
    cy.findByTestId(testIds.inputDropdown.customValue).click();
    cy.findByTestId(testIds.quickAddNewProduct.productNameInput).should(
      'have.value',
      productToSend.name,
    );
    cy.findByTestId(testIds.quickAddNewProduct.mpnInput).type(
      productToSend.mpn,
    );
    cy.findByTestId(testIds.quickAddNewProduct.evidenceUrl).type(
      productToSend.evidenceUrl,
    );
    cy.findByTestId(testIds.quickAddNewProduct.modal).within(() => {
      selectProductAmount(productToSend.amount);
    });
    cy.findByTestId(testIds.quickAddNewProduct.addAsInternal).click();

    sendAndVerifyProductFromMfr(productToSend, ctx);
  });
  it('Adds a custom product from products section with matching', () => {
    const { manufacturer } = ctx;
    const productToSend: IProductDetails = {
      name: faker.string.uuid(),
      mpn: faker.string.uuid(),
      mfr: manufacturer.name,
      evidenceUrl: 'https://example.com',
      searchMfr: faker.string.uuid(),
      amount: 1,
    };
    cy.findByTestId(testIds.quickAdd.mfrSearch).type(
      `${productToSend.searchMfr}{enter}`,
    );
    cy.wait('@manufacturersIndex');

    cy.findByTestId(testIds.quickAdd.skipManufacturer).click();

    cy.findByTestId(testIds.quickAdd.productSearch).type(
      `${productToSend.name}{enter}`,
    );
    cy.wait(['@products', '@products']);

    cy.findByTestId(testIds.quickAdd.continueWith)
      .should($el => {
        expect($el).to.not.have.attr('[data-disabled]');
      })
      .click();
    cy.findByTestId(testIds.quickAdd.addAssetsBtn).click();

    cy.findByTestId(testIds.quickAddNewProduct.mfrSelect).clear();
    cy.findByTestId(testIds.quickAddNewProduct.mfrSelect).type(
      `${productToSend.mfr}`,
    );
    cy.findByTestId(testIds.customPicker.option(manufacturer.id)).click();
    cy.findByTestId(testIds.quickAddNewProduct.mfrSelectImage).should('exist');
    cy.findByTestId(testIds.quickAddNewProduct.productNameInput).should(
      'have.value',
      productToSend.name,
    );
    cy.findByTestId(testIds.quickAddNewProduct.mpnInput).type(
      productToSend.mpn,
    );
    cy.findByTestId(testIds.quickAddNewProduct.evidenceUrl).type(
      productToSend.evidenceUrl,
    );

    cy.findByTestId(testIds.quickAddNewProduct.processMatchBtn).click();
    sendAndVerifyProductFromMfr(productToSend, ctx);
  });

  it('Prefills new products dialog with selected manufacturer', () => {
    const { manufacturer } = ctx;
    const productToSend = {
      mfr: manufacturer.name,
      name: faker.string.uuid(),
    };
    cy.findByTestId(testIds.quickAdd.mfrSearch).type(
      `${productToSend.mfr}{enter}`,
    );
    cy.wait('@manufacturersIndex');
    cy.findByTestId(testIds.rowId(manufacturer.id)).click();
    cy.findByTestId(testIds.quickAdd.mfrContinueBtn).click();

    cy.findByTestId(testIds.quickAdd.productSearch).type(
      `${productToSend.name}{enter}`,
    );
    cy.wait(['@products', '@products']);
    cy.findByTestId(testIds.quickAdd.continueWith).click();
    cy.findByTestId(testIds.quickAdd.addAssetsBtn).click();

    cy.findByTestId(testIds.quickAddNewProduct.mfrSelect).should(
      'have.value',
      productToSend.mfr,
    );
    cy.findByTestId(testIds.quickAddNewProduct.mfrSelectImage).should('exist');
  });
  it('Prefills new products dialog with selected amount', () => {
    cy.findByTestId(testIds.quickAdd.skipManufacturer).click();

    const productToSend = {
      name: faker.string.uuid(),
      amount: 2,
    };
    cy.findByTestId(testIds.quickAdd.productSearch).type(
      `${productToSend.name}{enter}`,
    );
    selectProductAmount(productToSend.amount);
    cy.findByTestId(testIds.quickAdd.continueWith).click();
    cy.findByTestId(testIds.quickAdd.addAssetsBtn).click();
    cy.findByTestId(testIds.quickAddNewProduct.modal)
      .findByTestId(testIds.quantityCounter.value)
      .should('contain', productToSend.amount);
  });
});
