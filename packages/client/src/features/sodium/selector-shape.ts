import type { SelectorRewrite } from '@dsh-claude-style/engine/sheet-rewrite'

/**
 * A whole selector the sodium table recognizes, and the one it writes in its
 * place (D109).
 *
 * The template is the selector as the browser serializes it, with `{role}`
 * standing for one of the owner's hashed class names: the first occurrence of
 * a role captures the class, and every later one has to be that same class. A
 * selector that differs anywhere else is left alone, so a host that changes the
 * rule keeps its own rule. The replacement names the same roles.
 */
export function selectorShape(template: string, replacement: string): SelectorRewrite {
  const roles = new Set<string>()
  const pattern = template.split(/(\{\w+\})/).map((piece) => {
    const role = /^\{(\w+)\}$/.exec(piece)?.[1]
    if (role === undefined) return piece.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (roles.has(role)) return `\\k<${role}>`
    roles.add(role)
    return `(?<${role}>[\\w-]+)`
  }).join('')
  const whole = new RegExp(`^${pattern}$`)
  return {
    rewrite(selector) {
      const groups = whole.exec(selector)?.groups
      if (groups === undefined) return null
      return {
        selector: replacement.replace(/\{(\w+)\}/g, (_match, role: string) => {
          if (!roles.has(role)) throw new Error(`sodium: the replacement names {${role}}, which its template does not capture`)
          return groups[role]
        }),
        captured: { ...groups },
      }
    },
  }
}

/** The first of these shapes that recognizes a selector rewrites it. */
export function firstShape(shapes: readonly SelectorRewrite[]): SelectorRewrite['rewrite'] {
  return (selector) => {
    for (const shape of shapes) {
      const answer = shape.rewrite(selector)
      if (answer !== null) return answer
    }
    return null
  }
}
