/// <reference types="cypress" />
import type { ReduxStore } from '@beam-app/types';
import type { QueryClient, QueryKey } from 'react-query';
import type { QueryFilters } from 'react-query/types/core/utils';

import type {
  DropFirst,
  ILoginCommandOpts,
  IStoredAccessToken,
} from './support/utils/types';

export {};

declare global {
  namespace Cypress {
    interface Chainable {
      getBySelLike(
        dataTestPrefixAttribute: string,
        ...args: DropFirst<Parameters<Chainable['get']>>
      ): Chainable<JQuery<HTMLElement>>;

      getQueryData(queryKey: QueryKey, QueryFilters?: QueryFilters): Chainable;
      /**
       * UI Login
       */
      loginWithAuth0Ui(opts?: ILoginCommandOpts): Chainable;
      /**
       * Programmatic login
       */
      loginWithApi(opts?: ILoginCommandOpts): Chainable;

      /**
       * Get access token from the current window
       */
      getStoredAccessToken(): Chainable<IStoredAccessToken>;
    }
    interface ApplicationWindow {
      __rqClient__: QueryClient;
      __store__: ReduxStore;
    }
  }
}
