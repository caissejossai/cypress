import {
  IStudiosFixture,
  IUsersFixture,
} from '@beam-app/mocks/seedUtils/fixtureUtils.types';

import { IStudioApiModel } from '@models/Studio.model';
import { IUserInvitedApiModel } from '@models/UserInvited.model';

const { _ } = Cypress;
interface IUserAndStudioCtx {
  user: IUserInvitedApiModel;
  studio: IStudioApiModel;
}
interface IUserCtx {
  user: IUserInvitedApiModel;
}
interface IStudioCtx {
  studio: IStudioApiModel;
}

export function setUser(ctx: IUserCtx) {
  return cy.fixture('generated/users').then((users: IUsersFixture) => {
    const user = _.find(users.data, {
      email: `${Cypress.env('userEmail')}`,
    });

    expect(user).to.be.an('object');
    ctx.user = user as IUserInvitedApiModel;
  });
}
export function setStudio(ctx: IStudioCtx) {
  return cy.fixture('generated/studios').then((studios: IStudiosFixture) => {
    const studio = _.find(studios.data, {
      id: `${Cypress.env('studioId')}`,
    });
    expect(studio).to.be.an('object');
    ctx.studio = studio as IStudioApiModel;
  });
}

export function setUserAndStudio(ctx: IUserAndStudioCtx) {
  setUser(ctx);
  return setStudio(ctx);
}

export const bodyHelper = <T>(arg: T) => arg;
/**
 * @param expires_in Time in seconds left
 * @returns Time in seconds from now the token expires
 */
export function checkExp(expiresAt: number): boolean {
  const actualValue = expiresAt * 1000;
  const actualNow = Date.now();
  const delta = actualValue - actualNow;
  // this is in seconds.
  const leeway = 10;
  return delta > leeway;
} /**
 * @param expires_in Time in seconds left
 * @returns Time in seconds from now at which the token expires
 */
export function serialiseExp(expires_in: number): number {
  return Math.floor(Date.now() / 1000) + expires_in;
}
