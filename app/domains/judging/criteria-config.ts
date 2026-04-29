export interface EvaluationCriterion {
  id: string
  hackathonId: string
  name: string
  description: string
  weight: number
  displayOrder: number
  createdAt: string
}

export interface CriteriaConfigurationValidationIssue {
  criterionId: string
  field: 'name' | 'description' | 'weight'
  message: string
  summaryMessage: string
}

function formatCriteriaConfigurationLabel(name: string, index: number) {
  const trimmedName = name.trim()

  if (trimmedName.length > 0) {
    return `"${trimmedName}"`
  }

  return `Criterion ${index + 1}`
}

export function getCriteriaConfigurationValidationIssues(
  criteria: Array<Pick<EvaluationCriterion, 'id' | 'name' | 'description'> & { weight: unknown }>
) {
  const issues: CriteriaConfigurationValidationIssue[] = []

  criteria.forEach((criterion, index) => {
    const criterionLabel = formatCriteriaConfigurationLabel(criterion.name, index)

    if (criterion.name.trim().length === 0) {
      issues.push({
        criterionId: criterion.id,
        field: 'name',
        message: 'Enter a criterion name.',
        summaryMessage: `${criterionLabel} is missing a name. Enter a short criterion name before saving.`
      })
    }

    if (criterion.description.trim().length === 0) {
      issues.push({
        criterionId: criterion.id,
        field: 'description',
        message: 'Enter a description so judges know what to evaluate.',
        summaryMessage: `${criterionLabel} needs a description. Add a short description so judges know what to evaluate.`
      })
    }

    if (typeof criterion.weight !== 'number' || !Number.isInteger(criterion.weight) || criterion.weight < 0) {
      issues.push({
        criterionId: criterion.id,
        field: 'weight',
        message: 'Enter a whole-number weight of 0 or more.',
        summaryMessage: `${criterionLabel} has an invalid weight. Use a whole number of 0 or more.`
      })
    }
  })

  return issues
}
