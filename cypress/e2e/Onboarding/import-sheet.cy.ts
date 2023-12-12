import {
  IImportCSVFixture,
  IImportFileDescription,
  IOnboardingFixture,
} from '@beam-app/mocks/seedUtils/fixtureUtils.types';
import { faker } from '@faker-js/faker';

import { IOnboardingFileApi } from '@models/Onboarding.model';
import { IStudioApiModel } from '@models/Studio.model';
import { IUserInvitedApiModel } from '@models/UserInvited.model';

import { IPostFileUpload } from '@services/queries/onboarding/fileUpload';

import { MB } from '@utils/fsConstants';
import * as testIds from '@utils/testIds';

import { pathToRouteMatcher } from '../../support/utils/intercept';
import {
  interceptSettingsAndProfile,
  waitForSettingsAndProfile,
} from '../../support/utils/interceptSettingsAndProfile';
import { bodyHelper, setUserAndStudio } from '../../support/utils/misc';
import * as onboardingUtils from '../../support/utils/Onboarding';

const { _ } = Cypress;

interface ICtx {
  csvFixture: IImportCSVFixture;
  excelFixture: IImportCSVFixture;
  fileId: string;
  studio: IStudioApiModel;
  user: IUserInvitedApiModel;
  fileFixture: IOnboardingFixture;
}
const sheetKeys = [
  ['csvFixture', 'csv'],
  ['excelFixture', 'excel'],
] as const;

function constructFileName(fileName: string, extension: string) {
  return `${fileName}-${faker.string.uuid()}.${extension}`;
}
function uploadFile(file: IImportFileDescription, extension: string) {
  const fileUpload: Cypress.FileReference = {
    contents: '@fileContents',
    fileName: constructFileName(file.fileName, extension),
  };
  cy.fixture(file.path, null).as('fileContents');
  cy.findByTestId(testIds.importSheet.modal).selectFile(fileUpload, {
    action: 'drag-drop',
  });
  cy.findByTestId(testIds.importSheet.importBtn).click();
}
function openImportSheet() {
  cy.visit('/onboarding', { failOnStatusCode: false });
  waitForSettingsAndProfile();
  cy.findByTestId(testIds.onboarding.pageMenu).click();
  cy.findByText(/spreadsheet/i).click();
}

describe('Onboarding - Import Sheet', () => {
  const ctx = {} as ICtx;
  beforeEach(() => {
    cy.loginWithApi({ withSession: true });
    interceptSettingsAndProfile();
    onboardingUtils.interceptFileStatusId(ctx);
    cy.fixture('generated/import-csvs').then((fixture: IImportCSVFixture) => {
      ctx.csvFixture = fixture;
    });
    cy.fixture('generated/import-excels').then((fixture: IImportCSVFixture) => {
      ctx.excelFixture = fixture;
    });
    cy.fixture('generated/onboarding').then((fixture: IOnboardingFixture) => {
      ctx.fileFixture = fixture;
    });
    cy.task('db:seed:filled');
    setUserAndStudio(ctx);

    cy.intercept(
      pathToRouteMatcher(
        '/api/v1/file/upload',
        {
          method: 'POST',
        },
        { api: 'onboarding' },
      ),
    ).as('postFileUpload');
    cy.intercept(
      pathToRouteMatcher(
        '/api/v1/import/direct',
        {
          method: 'GET',
        },
        { api: 'onboarding' },
      ),
    ).as('getRunImporter');

    cy.intercept(
      pathToRouteMatcher(
        '/api/v1/file/template',
        { method: 'GET' },
        { api: 'onboarding' },
      ),
    ).as('fileTemplate');
    cy.intercept(
      pathToRouteMatcher(
        '/api/v1/file/template/xlsx',
        { method: 'GET' },
        { api: 'onboarding' },
      ),
    ).as('fileTemplateXlsx');
  });
  context('Works for all sheets', () => {
    sheetKeys.forEach(entry => {
      const [sheetkey, label] = entry;
      it(`Uploads a valid ${label} sheet`, () => {
        openImportSheet();
        const importFixture = ctx[sheetkey];
        const { data } = importFixture;
        const { validImport, extension } = importFixture.specialCases;
        const fileUpload: Cypress.FileReference = {
          contents: '@fileContents',
          fileName: constructFileName(validImport.fileName, extension),
        };

        cy.findByText(/import spreadsheet/i).should('exist');
        cy.fixture(validImport.path, null).as('fileContents');

        cy.findByTestId(testIds.importSheet.fileInput).selectFile(fileUpload, {
          force: true,
        });
        cy.findByTestId(testIds.importSheet.fileName).should(
          'contain',
          fileUpload.fileName,
        );
        cy.findByTestId(testIds.importSheet.assetCount).should(
          'contain',
          data.length,
        );
        cy.findByTestId(testIds.importSheet.importBtn).click();

        cy.wait('@postFileUpload')
          .interceptFormData(formData => {
            const { user } = ctx;
            // Req
            const requestBody: IPostFileUpload = formData as IPostFileUpload;
            expect(requestBody).to.contain(
              bodyHelper<Partial<IPostFileUpload>>({
                triggeredBy: user.name,
                triggeredByAvatar: `${user.avatar}`,
                triggeredById: user.id,
                triggeredByEmail: user.email,
              }),
            );
          })
          .then($intercept => {
            const { response, request } = $intercept;
            const { studio } = ctx;
            // Req
            expect(request.query).to.contain(
              bodyHelper<Partial<IPostFileUpload>>({
                studioId: studio.id,
                studioName: studio.name,
              }),
            );
            // Res.
            const resBody = response?.body as IOnboardingFileApi | undefined;
            expect(response?.statusCode).to.equal(200);
            expect(resBody?.fileId).to.be.a('string');
            ctx.fileId = resBody?.fileId as string;
          });

        cy.wait('@getRunImporter')
          .its('response.statusCode')
          .should('equal', 200);

        onboardingUtils.waitAndVerifyFileId(ctx);
        cy.findByTestId(testIds.importSheet.modal).should('not.exist');
      });
    });
  });

  it('Fails to upload a csv with an extra column', () => {
    openImportSheet();

    const importFixture = ctx.csvFixture;
    const { extraColumn, extension } = importFixture.specialCases;
    uploadFile(extraColumn, extension);
    cy.wait('@postFileUpload').its('response.statusCode').should('equal', 200);
    cy.wait('@getRunImporter').its('response.statusCode').should('equal', 400);
    cy.findByTestId(testIds.importSheet.description).should(
      'have.text',
      `Error: "${extraColumn.columnName}" Field/Tag category not found in studio configuration`,
    );
  });
  it('Fails to upload a csv with invalid unique fields', () => {
    openImportSheet();

    const importFixture = ctx.csvFixture;
    const { invalidUniqueField, extension } = importFixture.specialCases;
    uploadFile(invalidUniqueField, extension);
    cy.wait('@postFileUpload').its('response.statusCode').should('equal', 200);
    cy.wait('@getRunImporter').its('response.statusCode').should('equal', 400);

    cy.findByTestId(testIds.importSheet.description).should(
      'have.text',
      `Error: "${invalidUniqueField.columnName}" fields should have unique values in your Beam Studio`,
    );
  });
  it('Fails to upload a csv with invalid asset statuses', () => {
    openImportSheet();

    const importFixture = ctx.csvFixture;
    const { invalidAssetStatusField, extension } = importFixture.specialCases;
    uploadFile(invalidAssetStatusField, extension);
    cy.wait('@postFileUpload').its('response.statusCode').should('equal', 200);
    cy.wait('@getRunImporter').its('response.statusCode').should('equal', 400);

    cy.findByTestId(testIds.importSheet.description).should(
      'contain',
      `Error: Asset Statuses "${invalidAssetStatusField.value}" Not Found`,
    );
  });
  it('Fails to upload a csv with invalid boolean fields', () => {
    openImportSheet();

    const importFixture = ctx.csvFixture;
    const { invalidBooleanField, extension } = importFixture.specialCases;
    uploadFile(invalidBooleanField, extension);
    cy.wait('@postFileUpload').its('response.statusCode').should('equal', 200);
    cy.wait('@getRunImporter').its('response.statusCode').should('equal', 400);

    cy.findByTestId(testIds.importSheet.description).should(
      'contain',
      `invalid input syntax for type boolean: "${invalidBooleanField.value}"`,
    );
  });

  it('Downloads all sheets', () => {
    openImportSheet();

    const data = [
      [testIds.importSheet.csvFormat, 'csv', '@fileTemplate'],
      [testIds.importSheet.excelFormat, 'xlsx', '@fileTemplateXlsx'],
    ] as const;

    data.forEach(each => {
      const [btn, extension, alias] = each;
      cy.log(`Testing a ${extension} file`);
      cy.findByTestId(testIds.importSheet.downloadTemplate).click();
      cy.findByText(/download template/i).should('exist');

      cy.findByTestId(btn).click();
      cy.wait(alias).its('response.statusCode').should('equal', 200);
      cy.readFile(`${Cypress.config('downloadsFolder')}/example.${extension}`);
    });
  });
  it('Closes', () => {
    openImportSheet();

    cy.findByTestId(testIds.importSheet.modal)
      .findByTestId(testIds.misc.modalCloseBtn)
      .click();
    cy.findByTestId(testIds.importSheet.modal).should('not.exist');
  });
  it('Does not allow files above a certain size', () => {
    openImportSheet();

    // Ref: https://stackoverflow.com/a/77132021
    const size = 6 * MB;
    const file = Buffer.alloc(size);
    const fileUpload: Cypress.FileReference = {
      contents: file,
      mimeType: 'text/csv',
    };

    cy.findByTestId(testIds.importSheet.fileInput).selectFile(fileUpload, {
      force: true,
    });
    cy.findByTestId(testIds.importSheet.fileErrorText).contains(
      /Please select a file under 5MB/i,
    );
  });
  it('Does not allow files of invalid mime type', () => {
    openImportSheet();

    const fileUpload: Cypress.FileReference = {
      contents: Cypress.Buffer.from('Test content'),
      mimeType: 'Test mime',
    };

    cy.findByTestId(testIds.importSheet.fileInput).selectFile(fileUpload, {
      force: true,
    });
    cy.findByTestId(testIds.importSheet.fileErrorText).contains(
      /Please select a .csv or .xlsx file/i,
    );
  });
  it('Does not allow duplicate files', () => {
    const { fileFixture } = ctx;
    const openOrValidFile = _.find(fileFixture.data.files, {
      _id: fileFixture.specialCases.openOrValidatedFile,
    });
    expect(openOrValidFile).to.be.an('object');

    cy.intercept(
      pathToRouteMatcher(
        '/api/v1/file/status',
        { method: 'GET' },
        { api: 'onboarding' },
      ),
      // Stubbing here ensures the file is visible to dialog
      ctx.fileFixture.data,
    ).as('onboardingFileStatus');
    openImportSheet();
    cy.wait('@onboardingFileStatus');

    const fileUpload: Cypress.FileReference = {
      contents: Cypress.Buffer.from('Test content'),
      mimeType: 'text/csv',
      fileName: `${openOrValidFile?.originalname}`,
    };
    cy.findByTestId(testIds.importSheet.fileInput).selectFile(fileUpload, {
      force: true,
    });
    cy.findByTestId(testIds.importSheet.importBtn).click();

    cy.findByTestId(testIds.importSheet.description).contains(
      /File already exists/i,
    );
  });
});
