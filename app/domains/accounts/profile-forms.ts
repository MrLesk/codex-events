import { z } from 'zod'

import type { AccountSocialProfileUrlKey } from '~/domains/accounts/profile'

import {
  isAccountProfileUrlValid,
  isAccountSocialProfileUrlValid
} from '~/domains/accounts/profile'

const optionalEmailSchema = z.string().trim().refine(
  value => value.length === 0 || z.string().email().safeParse(value).success,
  'Enter a valid email address.'
)

function createOptionalSocialProfileUrlSchema(
  key: AccountSocialProfileUrlKey,
  formatMessage: string,
  domainMessage: string
) {
  return z.string().trim()
    .refine(value => value.length === 0 || isAccountProfileUrlValid(value), formatMessage)
    .refine(value => value.length === 0 || isAccountSocialProfileUrlValid(key, value), domainMessage)
}

export const accountProfileFormSchema = z.object({
  firstName: z.string().trim().min(1).max(120),
  familyName: z.string().trim().min(1).max(120),
  xProfileUrl: createOptionalSocialProfileUrlSchema(
    'xProfileUrl',
    'Enter a valid X profile URL.',
    'Use an x.com or twitter.com profile URL.'
  ),
  linkedinProfileUrl: createOptionalSocialProfileUrlSchema(
    'linkedinProfileUrl',
    'Enter a valid LinkedIn profile URL.',
    'Use a linkedin.com profile URL.'
  ),
  githubProfileUrl: createOptionalSocialProfileUrlSchema(
    'githubProfileUrl',
    'Enter a valid GitHub profile URL.',
    'Use a github.com profile URL.'
  ),
  chatgptEmail: optionalEmailSchema,
  openaiOrgId: z.string().trim().max(120),
  lumaEmail: optionalEmailSchema
})

export const accountSettingsProfileFormSchema = accountProfileFormSchema.extend({
  company: z.string().trim().max(120),
  bio: z.string().trim().max(4000)
})
