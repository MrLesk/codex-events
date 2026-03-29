const regionCodeExclusions = new Set([
  'EU',
  'EZ',
  'UN',
  'XA',
  'XB',
  'ZZ'
])

const uppercaseLatinAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export interface CountryOption {
  label: string
  value: string
}

function buildCountryOptions(): CountryOption[] {
  const displayNames = new Intl.DisplayNames(['en'], {
    type: 'region'
  })
  const options: CountryOption[] = []

  for (const firstLetter of uppercaseLatinAlphabet) {
    for (const secondLetter of uppercaseLatinAlphabet) {
      const code = `${firstLetter}${secondLetter}`

      if (regionCodeExclusions.has(code)) {
        continue
      }

      const countryName = displayNames.of(code)

      if (!countryName || countryName === code) {
        continue
      }

      options.push({
        label: countryName,
        value: countryName
      })
    }
  }

  return options.sort((left, right) => left.label.localeCompare(right.label, 'en'))
}

const baseCountryOptions = buildCountryOptions()

export function getCountryOptions(currentCountry: string = '') {
  const normalizedCountry = currentCountry.trim()

  if (!normalizedCountry || baseCountryOptions.some(option => option.value === normalizedCountry)) {
    return baseCountryOptions
  }

  return [
    {
      label: normalizedCountry,
      value: normalizedCountry
    },
    ...baseCountryOptions
  ]
}
