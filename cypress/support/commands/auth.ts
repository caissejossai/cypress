import { Cacheable, IdToken, LocalStorageCache } from '@auth0/auth0-react';
import * as jose from 'jose';

import { pathToRouteMatcher } from '../utils/intercept';
import { checkExp, serialiseExp } from '../utils/misc';
import { Auth0WrappedCacheEntry, ILoginCommandOpts } from '../utils/types';

const { _ } = Cypress;

interface IOauthToken {
  access_token: string;
  id_token: string;
  scope: string;
  expires_in: number;
  token_type: string;
  user: Record<string, unknown>;
}

interface IAuth0KeyParts {
  client_id: string;
  audience: string;
  scope: string;
}

function auth0Key(args: IAuth0KeyParts) {
  const { client_id, audience, scope } = args;
  return `@@auth0spajs@@::${client_id}::${audience}::${scope}`;
}
function mergeLoginOpts(opts: ILoginCommandOpts | undefined) {
  const defaultLoginCommandOpts = {
    email: `${Cypress.env('userEmail')}`,
    password: `${Cypress.env('userPassword')}`,
  } satisfies ILoginCommandOpts;
  const finalOpts = { ...defaultLoginCommandOpts, ...opts };
  return finalOpts;
}

/**
 *
 * @function loginWithApi
 * @description Programmatic login, requires `validateToken` as validate argument to session to work.
 */
// loginWithApi is missing org_id, and refresh token
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function loginWithApi(email: string, password: string) {
  const log = Cypress.log({
    displayName: 'AUTH0 LOGIN WITH API',
    message: [`🔐 Authenticating | ${email}`],
    autoEnd: false,
  });
  log.snapshot('before');

  const client_id = `${Cypress.env('auth0_client_id')}`;
  const audience = `${Cypress.env('auth0_audience')}`;
  const cache = new LocalStorageCache();

  // Reference: https://github.com/adamjmcgrath/cypress-spa-example/blob/master/cypress/integration/example.spec.js

  cy.intercept(
    pathToRouteMatcher('/users/userHasAccess', { method: 'GET', times: 1 }),
    'OK',
  ).as('userHasAccess');
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/auth0/token`,
    body: {
      email,
      password,
    },
  }).then(res => {
    const body = _.omit(res.body as IOauthToken, ['user']);
    expect(body).not.to.be.undefined;
    const { id_token, scope, expires_in } = body;

    const [, idPayload] = id_token.split('.');
    const claims = jose.decodeJwt(id_token) as IdToken;
    const user = Cypress.Buffer.from(idPayload, 'base64').toString('ascii');

    const tokenStorage: Auth0WrappedCacheEntry = {
      body: {
        ...body,
        client_id,
        decodedToken: {
          user: JSON.parse(user),
          claims,
        },
        audience,
      },
      expiresAt: serialiseExp(expires_in),
    };
    cache.set(auth0Key({ client_id, audience, scope }), tokenStorage);
  });

  cy.visit('/').then(() => {
    log.snapshot('after');
    log.end();
  });
}
function loginWithAuth0Ui(email: string, password: string) {
  const log = Cypress.log({
    displayName: 'AUTH0 LOGIN WITH UI',
    message: [`🔐 Authenticating | ${email}`],
    autoEnd: false,
  });
  log.snapshot('before');

  cy.visit('/', { failOnStatusCode: false });

  cy.intercept(
    pathToRouteMatcher(`/auth0/organizations/:name`, { method: 'GET' }),
  ).as('getName');
  cy.intercept('POST', `https://${Cypress.env('auth0_domain')}/oauth/token`).as(
    'oauthToken',
  );

  cy.findByRole('textbox', { name: /email address/i }).type(`${email}{enter}`);
  cy.wait('@getName');

  cy.origin(
    `https://${Cypress.env('auth0_domain')}/`,
    { args: { email, password } },
    args => {
      cy.get('input[name="username"]').should('have.value', args.email);
      cy.get('input[type="password"]').type(args.password);
      cy.get('button[type="submit"]:visible').click();
    },
  );

  // References https://community.auth0.com/t/reading-access-token-from-localstorage-in-auth0/96558
  // https://github.com/cypress-io/cypress/issues/25551
  // back to app
  cy.url().should('match', new RegExp(`^${Cypress.config('baseUrl')}`));
  // token fetched
  cy.wait('@oauthToken');
  // token saved
  cy.wrap(new LocalStorageCache())
    .invoke('allKeys')
    .should('not.be.empty')
    .then(() => {
      log.snapshot('after');
      log.end();
    });
}
function isEntryWithToken(value: Cacheable): value is Auth0WrappedCacheEntry {
  return Boolean(
    value &&
      typeof (value as Auth0WrappedCacheEntry).body === 'object' &&
      typeof (value as Auth0WrappedCacheEntry).body.access_token === 'string',
  );
}
Cypress.Commands.add('loginWithAuth0Ui', opts => {
  const { email, password, withSession } = mergeLoginOpts(opts);
  if (withSession) {
    cy.session({ email, password }, () => loginWithAuth0Ui(email, password));
  } else {
    loginWithAuth0Ui(email, password);
  }
});
// Only needed for loginWithApi
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function validateToken() {
  const cache = new LocalStorageCache();
  const first = cache.allKeys().at(0);
  expect(first).to.be.a('string');

  const value = cache.get(first as string);

  expect(isEntryWithToken(value), 'isEntryWithToken(value) must be true').true;
  const assertedValue = value as Auth0WrappedCacheEntry;
  expect(checkExp(assertedValue.expiresAt), 'Access token expired').true;
}

Cypress.Commands.add('loginWithApi', opts => {
  const { email, password, withSession } = mergeLoginOpts(opts);
  if (withSession) {
    cy.session({ email, password }, () => loginWithApi(email, password), {
      validate: validateToken,
    });
  } else {
    loginWithApi(email, password);
  }
});
