import { IOnboardingFileApi } from '@models/Onboarding.model';
import { IPaginationResultFiles } from '@models/types';

import { pathToRouteMatcher } from './intercept';

const { _ } = Cypress;
interface IFileIdCtx {
  fileId: string;
}

/**
 * @function interceptFileStatusId
 * @description Allows waiting independent of number of requests to onboardingFileStatus alias by adding an id to the alias
 */
export function interceptFileStatusId(ctx: IFileIdCtx) {
  cy.intercept(
    pathToRouteMatcher(
      '/api/v1/file/status',
      { method: 'GET' },
      { api: 'onboarding' },
    ),
    req => {
      if (!ctx.fileId) return;
      req.alias = `onboardingFileStatus-${ctx.fileId}`;
    },
  );
}
/**
 * @function waitAndVerifyFileId
 * @description Waits for alias set by `interceptFileStatusId` and verifies that the file exists
 */
export function waitAndVerifyFileId(ctx: IFileIdCtx) {
  // Wrap is needed to wait for a particular req.
  return cy.wrap(ctx).then(() => {
    cy.wait(`@onboardingFileStatus-${ctx.fileId}`)
      .its('response.body')
      .then(($body: IPaginationResultFiles<IOnboardingFileApi>) => {
        expect($body).to.be.an('object');
        const fileInRes = _.find($body.files, {
          fileId: ctx.fileId,
        });
        expect(fileInRes).to.not.be.undefined;
      });
  });
}
