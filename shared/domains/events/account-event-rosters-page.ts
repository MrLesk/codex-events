import { z } from 'zod'

const publishedStaffTrackSchema = z.object({
  id: z.string(),
  name: z.string(),
  shortDescription: z.string(),
  displayOrder: z.number().int()
})

const publishedMemberSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  company: z.string().nullable(),
  bio: z.string().nullable(),
  xProfileUrl: z.string().nullable(),
  linkedinProfileUrl: z.string().nullable(),
  githubProfileUrl: z.string().nullable(),
  profileIconUpdatedAt: z.string().nullable().optional(),
  profileIconRevision: z.number().int().nullable(),
  staffTrack: publishedStaffTrackSchema.nullable().optional()
})

const roleAssignmentSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  userId: z.string(),
  role: z.enum(['event_admin', 'judge', 'staff']),
  isInJudgePool: z.boolean(),
  isStaff: z.boolean(),
  staffTrackId: z.string().nullable(),
  createdAt: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    displayName: z.string(),
    isPlatformAdmin: z.boolean(),
    isEventOrganizer: z.boolean().optional()
  }).optional()
})

export const accountEventRostersPageSchema = z.object({
  publishedJudges: z.array(publishedMemberSchema),
  publishedStaff: z.array(publishedMemberSchema),
  roleAssignments: z.array(roleAssignmentSchema),
  canManageRoles: z.boolean()
})

export type AccountEventPublishedStaffTrack = z.infer<typeof publishedStaffTrackSchema>
export type AccountEventPublishedRosterMember = z.infer<typeof publishedMemberSchema>
export type AccountEventRoleAssignment = z.infer<typeof roleAssignmentSchema>
export type AccountEventRostersPage = z.infer<typeof accountEventRostersPageSchema>
