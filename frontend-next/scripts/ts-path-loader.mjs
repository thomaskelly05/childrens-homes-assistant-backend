import { existsSync } from 'node:fs'
import { dirname, resolve as resolvePath } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolvePath(dirname(fileURLToPath(import.meta.url)), '..')

function resolveAlias(specifier) {
  if (!specifier.startsWith('@/')) return null
  const relative = specifier.slice(2)
  const candidates = [
    resolvePath(root, relative),
    resolvePath(root, `${relative}.ts`),
    resolvePath(root, `${relative}.tsx`),
    resolvePath(root, relative, 'index.ts')
  ]
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  return resolvePath(root, relative)
}

export async function resolve(specifier, context, nextResolve) {
  const mapped = resolveAlias(specifier)
  if (mapped) {
    return nextResolve(pathToFileURL(mapped).href, context)
  }
  return nextResolve(specifier, context)
}
