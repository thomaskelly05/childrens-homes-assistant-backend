import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const appDir = join(process.cwd(), 'app')
const ignorePrefixes = ['/api/', '/auth/', '/assistant/', '/orb/', '/os/', '/mfa', '/js/', '/css/', '/assets/', '/components/']
const literalHref = /href=(?:\{)?["'`]([^"'`{}]+)["'`](?:\})?/g

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    if (['.next', 'node_modules', '.git'].includes(entry)) return []
    const path = join(dir, entry)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

function routeFromPage(path) {
  const route = relative(appDir, path)
    .replace(/\/page\.tsx$/, '')
    .replace(/\/page\.ts$/, '')
    .replace(/^page\.(tsx|ts)$/, '')
    .replace(/\\/g, '/')
  return route === '' ? '/' : `/${route}`
}

function normaliseRoute(route) {
  return route
    .replace(/\[[^\]]+\]/g, ':param')
    .replace(/\/+$/, '') || '/'
}

function hrefToRoute(href) {
  const clean = href.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/'
  return clean.replace(/\/[^/]+(?=\/|$)/g, (segment) => {
    if (/^\d+$/.test(segment.slice(1))) return '/:param'
    if (/^(yp-|staff-|inc-|log-|safe-|risk-|med-|key-|apt-|doc-|rep-|act-|ev-|reg)/.test(segment.slice(1))) return '/:param'
    return segment
  })
}

const pageFiles = walk(appDir).filter((path) => /\/page\.(tsx|ts)$/.test(path))
const routes = new Set(pageFiles.map((path) => normaliseRoute(routeFromPage(path))))
const sourceFiles = walk(process.cwd()).filter((path) => /\.(tsx|ts)$/.test(path) && !path.includes('/.next/') && !path.includes('/node_modules/'))
const problems = []

for (const file of sourceFiles) {
  const text = readFileSync(file, 'utf8')
  for (const match of text.matchAll(literalHref)) {
    const href = match[1]
    if (!href.startsWith('/') || ignorePrefixes.some((prefix) => href.startsWith(prefix))) continue
    const clean = href.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/'
    if (routes.has(clean)) continue
    const route = hrefToRoute(href)
    const routeParts = route.split('/').filter(Boolean)
    const known = routes.has(route) || routes.has(normaliseRoute(route)) || [...routes].some((candidate) => {
      const parts = candidate.split('/').filter(Boolean)
      return parts.length === routeParts.length && parts.every((part, index) => part === ':param' || part === routeParts[index])
    })
    if (!known) {
      problems.push(`${relative(process.cwd(), file)} -> ${href}`)
    }
  }
}

if (problems.length) {
  console.error('Route audit found unresolved literal links:')
  problems.forEach((problem) => console.error(`- ${problem}`))
  process.exit(1)
}

console.log(`Route audit passed: ${routes.size} app routes and literal internal links checked.`)
