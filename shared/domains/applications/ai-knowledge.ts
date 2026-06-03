export const aiKnowledgeLevelValues = ['beginner', 'intermediate', 'advanced'] as const

export type AiKnowledgeLevel = typeof aiKnowledgeLevelValues[number]
export type AiKnowledgeLevelInput = '' | AiKnowledgeLevel

export const aiKnowledgeLevelLabels = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced'
} satisfies Record<AiKnowledgeLevel, string>

export const aiKnowledgeLevelOptionLabels = {
  beginner: 'Beginner - 0 to very little experience with Coding Agents',
  intermediate: 'Intermediate - Basic usage of AI Agents and understanding of Agents.md and Skills',
  advanced: 'Advanced - Multi-agent orchestration'
} satisfies Record<AiKnowledgeLevel, string>

export function isAiKnowledgeLevel(value: unknown): value is AiKnowledgeLevel {
  return typeof value === 'string' && aiKnowledgeLevelValues.includes(value as AiKnowledgeLevel)
}

export function normalizeAiKnowledgeLevel(value: unknown): AiKnowledgeLevelInput {
  return isAiKnowledgeLevel(value) ? value : ''
}

export function formatAiKnowledgeLevel(value: AiKnowledgeLevelInput | null | undefined) {
  return value ? aiKnowledgeLevelLabels[value] : 'Not selected'
}
