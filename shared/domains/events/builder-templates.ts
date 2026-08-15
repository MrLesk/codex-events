import type { EventBuilderBlockType, EventBuilderEventType } from './builder-blocks'

export interface EventBuilderTemplateBlock {
  builderBlockType: EventBuilderBlockType
  title: string
  durationMinutes: number
}

export const eventBuilderApplicationFieldKeys = [
  'xProfile',
  'linkedinProfile',
  'githubProfile',
  'chatgptEmail',
  'openaiOrgId',
  'lumaEmail',
  'whyThisEvent',
  'proofOfExecution',
  'teamIntent',
  'aiKnowledge'
] as const

export type EventBuilderApplicationFieldKey = (typeof eventBuilderApplicationFieldKeys)[number]

/** Application-form preset applied with the template; required implies visible. */
export interface EventBuilderTemplateApplicationFields {
  visible: readonly EventBuilderApplicationFieldKey[]
  required: readonly EventBuilderApplicationFieldKey[]
}

export interface EventBuilderTemplate {
  id: string
  eventType: EventBuilderEventType
  name: string
  description: string
  blocks: readonly EventBuilderTemplateBlock[]
  applicationFields: EventBuilderTemplateApplicationFields
}

export const eventBuilderTemplates: readonly EventBuilderTemplate[] = [
  {
    id: 'meetup-community-evening',
    eventType: 'meetup',
    name: 'Community Evening',
    description: 'A relaxed evening mixing short talks with plenty of time to connect.',
    blocks: [
      { builderBlockType: 'welcome', title: 'Welcome & Check-in', durationMinutes: 15 },
      { builderBlockType: 'lightning_talk', title: 'Lightning Talk', durationMinutes: 15 },
      { builderBlockType: 'talk', title: 'Featured Talk', durationMinutes: 30 },
      { builderBlockType: 'break', title: 'Break', durationMinutes: 15 },
      { builderBlockType: 'panel', title: 'Community Panel', durationMinutes: 45 },
      { builderBlockType: 'networking', title: 'Networking', durationMinutes: 45 }
    ],
    applicationFields: { visible: ['xProfile'], required: [] }
  },
  {
    id: 'meetup-talks-night',
    eventType: 'meetup',
    name: 'Talks Night',
    description: 'Two full talks and a lightning round, closed out with networking.',
    blocks: [
      { builderBlockType: 'welcome', title: 'Doors Open', durationMinutes: 15 },
      { builderBlockType: 'talk', title: 'Opening Talk', durationMinutes: 30 },
      { builderBlockType: 'lightning_talk', title: 'Lightning Round', durationMinutes: 15 },
      { builderBlockType: 'break', title: 'Break', durationMinutes: 15 },
      { builderBlockType: 'talk', title: 'Closing Talk', durationMinutes: 30 },
      { builderBlockType: 'networking', title: 'Networking', durationMinutes: 45 }
    ],
    applicationFields: { visible: ['xProfile'], required: [] }
  },
  {
    id: 'meetup-deep-dive-night',
    eventType: 'meetup',
    name: 'Deep Dive Night',
    description: 'Two full-length talks with room to actually go deep.',
    blocks: [
      { builderBlockType: 'welcome', title: 'Welcome & Check-in', durationMinutes: 15 },
      { builderBlockType: 'talk', title: 'Deep Dive Talk I', durationMinutes: 40 },
      { builderBlockType: 'break', title: 'Break', durationMinutes: 15 },
      { builderBlockType: 'talk', title: 'Deep Dive Talk II', durationMinutes: 40 },
      { builderBlockType: 'networking', title: 'Networking', durationMinutes: 45 }
    ],
    applicationFields: { visible: ['xProfile', 'whyThisEvent'], required: [] }
  },
  {
    id: 'build-full-day',
    eventType: 'build',
    name: 'Build Day',
    description: 'A guided kickoff, two long build blocks, and a social finish.',
    blocks: [
      { builderBlockType: 'welcome', title: 'Welcome & Setup', durationMinutes: 15 },
      { builderBlockType: 'workshop', title: 'Kickoff Workshop', durationMinutes: 60 },
      { builderBlockType: 'break', title: 'Break', durationMinutes: 15 },
      { builderBlockType: 'build', title: 'Build Block', durationMinutes: 180 },
      { builderBlockType: 'food', title: 'Lunch', durationMinutes: 45 },
      { builderBlockType: 'build', title: 'Build Block', durationMinutes: 120 },
      { builderBlockType: 'networking', title: 'Demos & Networking', durationMinutes: 45 }
    ],
    applicationFields: { visible: ['githubProfile', 'whyThisEvent'], required: ['githubProfile'] }
  },
  {
    id: 'build-workshop-sprint',
    eventType: 'build',
    name: 'Workshop Sprint',
    description: 'A hands-on workshop rolling straight into focused building time.',
    blocks: [
      { builderBlockType: 'welcome', title: 'Welcome & Setup', durationMinutes: 15 },
      { builderBlockType: 'workshop', title: 'Deep-dive Workshop', durationMinutes: 90 },
      { builderBlockType: 'break', title: 'Break', durationMinutes: 15 },
      { builderBlockType: 'build', title: 'Build Block', durationMinutes: 150 },
      { builderBlockType: 'networking', title: 'Wrap-up & Networking', durationMinutes: 30 }
    ],
    applicationFields: { visible: ['githubProfile', 'aiKnowledge'], required: [] }
  },
  {
    id: 'hackathon-classic-day',
    eventType: 'hackathon',
    name: 'Classic Hack Day',
    description: 'The full arc: kickoff, team formation, two hacking blocks, demos, awards.',
    blocks: [
      { builderBlockType: 'welcome', title: 'Check-in & Welcome', durationMinutes: 20 },
      { builderBlockType: 'keynote', title: 'Opening Keynote', durationMinutes: 30 },
      { builderBlockType: 'team_formation', title: 'Team Formation', durationMinutes: 30 },
      { builderBlockType: 'hacking', title: 'Hacking Block', durationMinutes: 150 },
      { builderBlockType: 'food', title: 'Lunch', durationMinutes: 45 },
      { builderBlockType: 'hacking', title: 'Hacking Block', durationMinutes: 150 },
      { builderBlockType: 'break', title: 'Submission Break', durationMinutes: 15 },
      { builderBlockType: 'demos_judging', title: 'Demos & Judging', durationMinutes: 60 },
      { builderBlockType: 'awards_closing', title: 'Awards & Closing', durationMinutes: 30 },
      { builderBlockType: 'networking', title: 'Celebration & Networking', durationMinutes: 45 }
    ],
    applicationFields: { visible: ['githubProfile', 'whyThisEvent', 'teamIntent', 'proofOfExecution'], required: ['githubProfile', 'teamIntent'] }
  },
  {
    id: 'hackathon-hack-night',
    eventType: 'hackathon',
    name: 'Hack Night',
    description: 'A compact evening hackathon with one deep hacking block.',
    blocks: [
      { builderBlockType: 'welcome', title: 'Check-in', durationMinutes: 15 },
      { builderBlockType: 'lightning_talk', title: 'Kickoff Lightning Talk', durationMinutes: 15 },
      { builderBlockType: 'team_formation', title: 'Team Formation', durationMinutes: 20 },
      { builderBlockType: 'hacking', title: 'Hacking Block', durationMinutes: 150 },
      { builderBlockType: 'food', title: 'Dinner', durationMinutes: 30 },
      { builderBlockType: 'demos_judging', title: 'Demos & Judging', durationMinutes: 45 },
      { builderBlockType: 'awards_closing', title: 'Awards', durationMinutes: 20 },
      { builderBlockType: 'networking', title: 'Networking', durationMinutes: 30 }
    ],
    applicationFields: { visible: ['githubProfile', 'teamIntent'], required: ['githubProfile'] }
  }
]

export function getEventBuilderTemplates(eventType: EventBuilderEventType): EventBuilderTemplate[] {
  return eventBuilderTemplates.filter(template => template.eventType === eventType)
}
