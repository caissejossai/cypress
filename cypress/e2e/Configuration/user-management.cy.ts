import { IUsersFixture } from '@beam-app/mocks/seedUtils/fixtureUtils.types';

import { IUserInvitedApiModel } from '@models/UserInvited.model';

import * as testIds from '@utils/testIds';

import { pathToRouteMatcher } from '../../support/utils/intercept';
import {
  interceptSettingsAndProfile,
  waitForSettingsAndProfile,
} from '../../support/utils/interceptSettingsAndProfile';

interface ICtx {
  blockedUser: IUserInvitedApiModel;
}
describe('User management interactions', () => {
  const ctx: ICtx = {} as ICtx;

  beforeEach(() => {
    cy.loginWithApi({ withSession: true });

    cy.intercept(pathToRouteMatcher('/invites/sendAdm', { method: 'post' })).as(
      'inviteUser',
    );
    cy.intercept(
      pathToRouteMatcher('/studios/membersAuth0', { method: 'GET' }),
    ).as('membersAuth0');
    interceptSettingsAndProfile();
    cy.task('db:seed:filled');
    cy.fixture('generated/users').then((users: IUsersFixture) => {
      const user = users.data.find(_user => _user.blocked);
      expect(user).not.to.be.undefined;
      ctx.blockedUser = user as IUserInvitedApiModel;
    });
    cy.intercept(pathToRouteMatcher('/users/:id/edit', { method: 'PATCH' })).as(
      'editUser',
    );

    cy.visit('/configuration', { failOnStatusCode: false });
    waitForSettingsAndProfile();
  });

  it('Invites Users', () => {
    const roles = ['Admin', 'Editor', 'Viewer', 'Member'];
    roles.forEach(role => {
      cy.log(`Inviting a User with ${role} role`);
      cy.findByTestId(testIds.configuration.inviteUser).click();
      cy.findByRole('textbox', {
        name: /email/i,
      }).type(
        `${Cypress.env('username')}+test@${Cypress.env('userEmailDomain')}`,
      );
      cy.findByTestId('select-role-button').click();

      cy.findByTestId(`select-role-item-${role}`)
        .scrollIntoView()
        .should('be.visible')
        .click();
      cy.findByRole('button', {
        name: /add/i,
      }).click();
      cy.wait('@inviteUser').its('response.statusCode').should('equal', 200);
    });
  });

  it('Toggles a blocked user', () => {
    cy.wait('@membersAuth0');

    cy.log(`UnBlocking User ${ctx.blockedUser.name}`);
    cy.findByTestId(`current-user-row-${ctx.blockedUser.id}`).within(() => {
      const { blockedUser: user } = ctx;
      cy.findByTestId('current-user-image')
        .find('img')
        .first()
        .should($img => {
          expect($img).attr('src', `${user.picture || user.avatar}`);
        });
      cy.findByTestId('current-user-name').should('contain', user.name);
      cy.findByTestId('current-user-email').should('contain', user.email);
      cy.findByTestId('current-user-role').should('contain', user.role);
      cy.findByTestId('current-user-menu').click();
      cy.findByRole('menuitem', {
        name: /^activate/i,
      }).click();
    });

    cy.findByRole('button', {
      name: /^activate/i,
    }).click();
    cy.wait('@editUser').its('response.body.blocked').should('equal', false);
    cy.wait('@membersAuth0');

    cy.log(`Blocking User ${ctx.blockedUser.name}`);
    cy.findByTestId(`current-user-row-${ctx.blockedUser.id}`).within(() => {
      cy.findByTestId('current-user-menu').click();
      cy.findByRole('menuitem', {
        name: /^deactivate/i,
      }).click();
    });

    cy.findByRole('button', {
      name: /^deactivate/i,
    }).click();
    cy.wait('@editUser').its('response.body.blocked').should('equal', true);
    cy.wait('@membersAuth0');

    cy.findByTestId(`current-user-row-${ctx.blockedUser.id}`).should(
      'have.attr',
      'data-blocked',
    );
  });
});
