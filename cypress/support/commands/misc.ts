import { QueryKey } from 'react-query';

Cypress.Commands.add('getBySelLike', (selector, ...args) => {
  return cy.get(`[data-testid*=${selector}]`, ...args);
});

Cypress.Commands.add('getQueryData', (queryKey: QueryKey, filters) => {
  return cy.window().then($win => {
    const queryData = $win.__rqClient__.getQueryData(queryKey, {
      exact: false,
      ...filters,
    });

    expect(queryData).to.not.be.undefined;
    return cy.wrap(queryData);
  });
});

Cypress.Commands.add("getByData", (selector) => {
  return cy.get(`[data-test=${selector}]`)
})
