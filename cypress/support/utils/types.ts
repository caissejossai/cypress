import { IdToken, User as Auth0User } from '@auth0/auth0-react';
import type { CyHttpMessages } from 'cypress/types/net-stubbing';

export type DropFirst<T extends unknown[]> = T extends [any, ...infer U]
  ? U
  : never;
export interface ILoginCommandOpts {
  email?: string;
  password?: string;
  withSession?: boolean;
}
interface Auth0DecodedToken {
  claims: IdToken;
  user: Auth0User;
}
export interface Auth0CacheEntry {
  id_token: string;
  access_token: string;
  expires_in: number;
  decodedToken: Auth0DecodedToken;
  audience: string;
  scope: string;
  client_id: string;
  refresh_token?: string;
  oauthTokenScope?: string;
}
export interface Auth0WrappedCacheEntry {
  body: Auth0CacheEntry;
  expiresAt: number;
}

export interface IStoredAccessToken {
  access_token: string;
  headers: CyHttpMessages.BaseMessage['headers'];
}
