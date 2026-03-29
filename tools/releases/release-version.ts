import { readFileSync, writeFileSync } from 'node:fs'

export function resolveReleaseVersion(tagName: string) {
  const normalizedTagName = tagName.trim()
  const match = /^v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)$/.exec(normalizedTagName)

  if (!match) {
    throw new Error(`Release tag "${tagName}" must be a semantic version like v1.2.3 or 1.2.3.`)
  }

  return match[1]
}

export function updatePackageVersion(packageJsonContents: string, version: string) {
  const packageJson = JSON.parse(packageJsonContents) as Record<string, unknown>
  packageJson.version = version

  return `${JSON.stringify(packageJson, null, 2)}\n`
}

interface ReleaseVersionCliArgs {
  tagName: string
  write: boolean
  packageJsonPath: string
}

export function parseReleaseVersionCliArgs(args: string[]): ReleaseVersionCliArgs {
  const remaining = [...args]
  const tagName = remaining.shift()?.trim() ?? ''

  if (!tagName) {
    throw new Error('Provide the GitHub release tag as the first argument.')
  }

  let write = false
  let packageJsonPath = 'package.json'

  while (remaining.length > 0) {
    const argument = remaining.shift()

    if (argument === '--write') {
      write = true
      continue
    }

    if (argument === '--path') {
      const nextPath = remaining.shift()?.trim()

      if (!nextPath) {
        throw new Error('Provide a package.json path after --path.')
      }

      packageJsonPath = nextPath
      continue
    }

    throw new Error(`Unknown argument: ${argument}`)
  }

  return {
    tagName,
    write,
    packageJsonPath
  }
}

if (import.meta.main) {
  try {
    const { tagName, write, packageJsonPath } = parseReleaseVersionCliArgs(process.argv.slice(2))
    const version = resolveReleaseVersion(tagName)

    if (write) {
      const packageJsonContents = readFileSync(packageJsonPath, 'utf8')
      writeFileSync(packageJsonPath, updatePackageVersion(packageJsonContents, version), 'utf8')
    }

    process.stdout.write(`${version}\n`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown release version error.'
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
  }
}
