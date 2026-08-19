import type { H3Event } from 'h3'
import type { z } from 'zod'

import { assertRegularPlatformAccess, getRequestActor, type PlatformActor } from '#server/auth/actor'
import { getDatabase, type AppDatabase } from '#server/database/client'
import { apiData } from '#server/http/api-response'
import {
  accountPageNames,
  accountPagePaths,
  type AccountPageName
} from '#shared/domains/account/account-page-registry'

export { accountPageNames, accountPagePaths, type AccountPageName }

export interface AccountPageContext {
  actor: PlatformActor
  database: AppDatabase
}

export type AccountPageAuthorizer<TAuthorization = void> = (
  context: AccountPageContext
) => TAuthorization | Promise<TAuthorization>

export type AccountPageLoader<
  TSchema extends z.ZodTypeAny,
  TAuthorization = void
> = (
  context: AccountPageContext,
  authorization: TAuthorization
) => z.input<TSchema> | Promise<z.input<TSchema>>

export interface AccountPageRouteDefinition<
  TPageName extends AccountPageName,
  TSchema extends z.ZodTypeAny,
  TAuthorization = void
> {
  page: TPageName
  schema: TSchema
  authorize: AccountPageAuthorizer<TAuthorization>
  load: AccountPageLoader<TSchema, TAuthorization>
}

export function defineAccountPageRoute<
  TPageName extends AccountPageName,
  TSchema extends z.ZodTypeAny,
  TAuthorization = void
>(definition: AccountPageRouteDefinition<TPageName, TSchema, TAuthorization>) {
  return definition
}

export async function resolveAccountPageContext(
  h3Event: H3Event
): Promise<AccountPageContext> {
  const actor = await getRequestActor(h3Event)
  assertRegularPlatformAccess(actor)

  return {
    actor,
    database: getDatabase(h3Event)
  }
}

export function assertAccountPageAccess(_context: AccountPageContext) {
  // Platform identity and current consent are established by the context
  // before a named page authorizer or loader can run.
}

export async function executeAccountPageRoute<
  TPageName extends AccountPageName,
  TSchema extends z.ZodTypeAny,
  TAuthorization
>(
  h3Event: H3Event,
  definition: AccountPageRouteDefinition<TPageName, TSchema, TAuthorization>
) {
  const context = await resolveAccountPageContext(h3Event)
  const authorization = await definition.authorize(context)
  const page = definition.schema.parse(await definition.load(context, authorization))

  return apiData<z.output<TSchema>>(page)
}
