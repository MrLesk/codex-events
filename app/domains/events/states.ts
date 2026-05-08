export const eventStateOrder = [
  'draft',
  'registration_open',
  'submission_open',
  'judging_preparation',
  'blind_review',
  'shortlist',
  'pitch',
  'pitch_review',
  'final_deliberation',
  'winners_announced',
  'completed'
] as const

export type EventState = typeof eventStateOrder[number]

export type EventOperationsPhase = 'registration_open' | 'submission_open' | 'judging' | 'completed'

function startCase(value: string) {
  return value
    .split('_')
    .map(part => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ')
}

export function formatEventState(state: EventState) {
  return startCase(state)
}

export function getEventStateColor(state: EventState) {
  switch (state) {
    case 'draft':
      return 'neutral'
    case 'registration_open':
      return 'info'
    case 'submission_open':
      return 'primary'
    case 'judging_preparation':
    case 'blind_review':
    case 'pitch':
    case 'pitch_review':
      return 'warning'
    case 'shortlist':
    case 'final_deliberation':
      return 'secondary'
    case 'winners_announced':
      return 'success'
    case 'completed':
      return 'neutral'
  }
}

export function getEventOperationsPhase(state: EventState): EventOperationsPhase | null {
  switch (state) {
    case 'registration_open':
      return 'registration_open'
    case 'submission_open':
      return 'submission_open'
    case 'judging_preparation':
    case 'blind_review':
    case 'shortlist':
    case 'pitch':
    case 'pitch_review':
    case 'final_deliberation':
    case 'winners_announced':
      return 'judging'
    case 'completed':
      return 'completed'
    case 'draft':
      return null
  }
}

export function getEventStateProgress(state: EventState) {
  return eventStateOrder.indexOf(state)
}

export function isEventStateReached(currentState: EventState, targetState: EventState) {
  return getEventStateProgress(currentState) >= getEventStateProgress(targetState)
}
