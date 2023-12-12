import type { RouteMatcherOptions } from 'cypress/types/net-stubbing';

export type MatchTuple = readonly [matcher: RouteMatcherOptions, alias: string];
export function interceptMatchTuples(queries: MatchTuple[]) {
  queries.forEach(query => {
    const [matcher, alias] = query;
    cy.intercept(matcher).as(alias);
  });
}
export function waitForMatchTuples(matchTuples: MatchTuple[]) {
  const queries = matchTuples.map(each => `@${each[1]}`);
  return cy.wait(queries).then($intercepts => {
    Array.from($intercepts).forEach(req => {
      expect(req.response).to.have.property('statusCode').equals(200);
    });
  });
}
