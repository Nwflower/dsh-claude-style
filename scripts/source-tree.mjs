/**
 * source-tree.mjs — collect literal DOM, motion and stacking writes through
 * TypeScript's type-aware syntax tree for build checks (D9).
 */
import path from 'node:path'
import postcss from 'postcss'
import { SyntaxKind, skipTrivia } from 'typescript/unstable/ast'
import { API } from 'typescript/unstable/sync'

/** The property names a hand-over object literal carries an attribute name under. */
const HANDED_OVER = new Set(['quiet', 'readerHold', 'part', 'holds', 'account', 'hero'])
/** The engine's own accessors for the vocabulary the skin handed over. */
const SEAM_READERS = new Set(['skin', 'vocabulary'])

/** The DOM calls that write an attribute, by the method's name; the name is their first argument. */
const ATTRIBUTE_WRITERS = new Set(['setAttribute', 'toggleAttribute'])
/** shared/motion.ts's readers; each takes the token's name first. */
const MOTION_READERS = new Set(['motionValue', 'motionMs', 'motionEase'])
/** The property names an inline stacking level is written under. */
const STACKING_PROPERTIES = new Set(['zIndex', 'z-index'])

const slashes = (file) => file.replaceAll('\\', '/')

/** Always close the TypeScript API after collecting build inputs. */
export function readSourceTree(root, srcDirs) {
  const api = new API({ cwd: root })
  const dirs = (Array.isArray(srcDirs) ? srcDirs : [srcDirs]).map(slashes)
  try {
    const config = slashes(path.join(root, 'tsconfig.json'))
    const project = api.updateSnapshot({ openProjects: [config] }).getProjects().find((item) => slashes(item.configFileName) === config)
    if (project === undefined) throw new Error(`build: TypeScript opened no project for ${config}`)
    return collect(project, slashes(root), dirs)
  } finally {
    api.close()
  }
}

function collect(project, root, srcDirs) {
  const { program, checker } = project
  const files = program.getSourceFileNames()
    .filter((name) => srcDirs.some((dir) => slashes(name).startsWith(`${dir}/`)) && !/\.(test|d)\.ts$/.test(name))
    .map((name) => program.getSourceFile(name))
  const where = (node) => {
    const file = node.getSourceFile()
    const line = file.getLineAndCharacterOfPosition(skipTrivia(file.text, node.pos)).line + 1
    return `${path.posix.relative(root, slashes(file.fileName))}:${line}`
  }

  const calls = []
  const easings = []
  const stacking = []
  const strings = new Set()
  for (const file of files) {
    const visit = (node) => {
      switch (node.kind) {
        case SyntaxKind.CallExpression:
          calls.push(node)
          break
        case SyntaxKind.PropertyAssignment:
          if (propertyName(node.name) === 'easing') easings.push(node.initializer)
          if (STACKING_PROPERTIES.has(propertyName(node.name))) stacking.push(node.initializer)
          break
        case SyntaxKind.ShorthandPropertyAssignment:
          if (node.name.text === 'easing') easings.push(node.name)
          if (STACKING_PROPERTIES.has(node.name.text)) stacking.push(node.name)
          break
        case SyntaxKind.BinaryExpression:
          if (node.operatorToken.kind === SyntaxKind.EqualsToken && node.left.kind === SyntaxKind.PropertyAccessExpression && STACKING_PROPERTIES.has(node.left.name.text)) stacking.push(node.right)
          break
        case SyntaxKind.StringLiteral:
        case SyntaxKind.NoSubstitutionTemplateLiteral:
        case SyntaxKind.TemplateHead:
        case SyntaxKind.TemplateMiddle:
        case SyntaxKind.TemplateTail:
          strings.add(node.text)
          break
      }
      node.forEachChild(visit)
    }
    file.forEachChild(visit)
  }

  const calleeName = (call) => {
    const callee = call.expression
    if (callee.kind === SyntaxKind.Identifier) return callee.text
    if (callee.kind === SyntaxKind.PropertyAccessExpression) return callee.name.text
    return undefined
  }
  const declarationOf = (call) => checker.getResolvedSignature(call)?.declaration?.resolve()
  const nodeKey = (node) => `${node.getSourceFile().fileName}:${node.pos}`

  /** The arguments every call of a function hands to its parameter `index`, memoized per function. */
  const handedOn = new Map()
  const argumentsFor = (fn, index) => {
    const key = `${nodeKey(fn)}#${index}`
    const known = handedOn.get(key)
    if (known !== undefined) return known
    const name = fn.name?.text ?? (fn.parent.kind === SyntaxKind.VariableDeclaration ? fn.parent.name.text : undefined)
    const found = name === undefined ? [] : calls
      .filter((call) => calleeName(call) === name && call.arguments[index] !== undefined)
      .filter((call) => {
        const declaration = declarationOf(call)
        return declaration !== undefined && nodeKey(declaration) === nodeKey(fn)
      })
      .map((call) => call.arguments[index])
    handedOn.set(key, found)
    return found
  }

  /**
   * Every literal an expression can hold. Its type answers first; a parameter
   * with no literal type is followed to the arguments its function is called
   * with, a variable to the value it starts from. Anything else is a value the
   * build cannot read, and the check that asked fails rather than pass it over.
   *
   * @param record - called with each literal and the expression it was read at.
   * @param refuse - what the build says about an expression it cannot read.
   * @param settled - an expression the check accepts as it is, without a literal.
   */
  const follow = (start, record, refuse, settled = () => false) => {
    const seen = new Set()
    const queue = [start]
    while (queue.length > 0) {
      const expression = queue.shift()
      const key = nodeKey(expression)
      if (seen.has(key)) continue
      seen.add(key)
      if (settled(expression)) continue
      const values = literalsOf(checker.getTypeAtLocation(expression))
      if (values.length > 0) {
        for (const value of values) record(value, expression)
        continue
      }
      const declaration = expression.kind === SyntaxKind.Identifier ? checker.getSymbolAtLocation(expression)?.valueDeclaration?.resolve() : undefined
      if (declaration?.kind === SyntaxKind.Parameter) {
        queue.push(...argumentsFor(declaration.parent, declaration.parent.parameters.indexOf(declaration)))
        continue
      }
      if (declaration?.kind === SyntaxKind.VariableDeclaration && declaration.initializer !== undefined) {
        queue.push(declaration.initializer)
        continue
      }
      throw new Error(`build: ${where(expression)} ${refuse}`)
    }
  }
  const firstAt = (map) => (value, expression) => {
    if (!map.has(value)) map.set(value, where(expression))
  }

  /**
   * An attribute name read off the engine's own vocabulary (`skin().quiet`,
   * `vocabulary().part`): the engine writes whatever the skin handed over, and
   * that hand-over is read where it is made (the adoptSkin and installParts
   * calls), so this expression carries no literal of its own.
   */
  const isSeamRead = (expression) => expression.kind === SyntaxKind.PropertyAccessExpression
    && expression.expression.kind === SyntaxKind.CallExpression
    && SEAM_READERS.has(calleeName(expression.expression))

  /** The attribute names a hand-over object literal spells, the nested `regions` included. */
  const namesHandedOver = (seam, record) => {
    if (seam?.kind !== SyntaxKind.ObjectLiteralExpression) return
    for (const property of seam.properties) {
      if (property.kind !== SyntaxKind.PropertyAssignment) continue
      const spelt = propertyName(property.name)
      if (spelt === 'regions') {
        namesHandedOver(property.initializer, record)
        continue
      }
      if (!HANDED_OVER.has(spelt)) continue
      follow(property.initializer, record, 'hands the engine an attribute name that is no literal the build can read; give it a literal type')
    }
  }

  const attributes = new Map()
  const motion = new Map()
  for (const call of calls) {
    const name = calleeName(call)
    if (call.expression.kind === SyntaxKind.PropertyAccessExpression && ATTRIBUTE_WRITERS.has(name)) {
      follow(call.arguments[0], firstAt(attributes), 'writes an attribute whose name is no literal the build can read; give it a literal type', isSeamRead)
    }
    // The engine writes the skin's own attribute names through the vocabulary it
    // is handed (packages/engine/src/skin.ts, parts.ts, D73), so the hand-over
    // names them here.
    if (name === 'adoptSkin' || name === 'installParts') {
      namesHandedOver(call.arguments[0], firstAt(attributes))
    }
    if (MOTION_READERS.has(name) && call.arguments[0] !== undefined) {
      follow(call.arguments[0], firstAt(motion), 'asks shared/motion.ts for a token whose name is no literal the build can read (D9)')
    }
    const props = call.arguments[1]
    if (props?.kind === SyntaxKind.ObjectLiteralExpression && declarationOf(call)?.name?.text === 'createElement') {
      for (const property of props.properties) {
        if (property.kind !== SyntaxKind.PropertyAssignment) continue
        const spelt = propertyName(property.name)
        if (spelt !== undefined) firstAt(attributes)(spelt, property)
        else follow(property.name.expression, firstAt(attributes), 'creates a React element with a prop whose name is no literal the build can read; give it a literal type')
      }
    }
    if (name === 'setProperty' && call.arguments[1] !== undefined && literalsOf(checker.getTypeAtLocation(call.arguments[0])).includes('z-index')) {
      stacking.push(call.arguments[1])
    }
  }

  const easingCurves = new Map()
  for (const expression of easings) {
    follow(expression, firstAt(easingCurves), 'names an easing curve that is no literal and no motion token; read it through shared/motion.ts (D9)',
      (node) => node.kind === SyntaxKind.CallExpression && calleeName(node) === 'motionEase')
  }
  const stackingLevels = new Map()
  for (const expression of stacking) {
    follow(expression, firstAt(stackingLevels), 'writes a stacking level the build cannot read; mark the element and place it on a layer in its stylesheet (D9)')
  }
  // A whole inline declaration list carries its stacking level inside the text.
  for (const text of strings) {
    if (!/z-index/i.test(text)) continue
    postcss.parse(text).walkDecls(/^z-index$/i, (declaration) => {
      if (!stackingLevels.has(declaration.value)) stackingLevels.set(declaration.value, `a style string "${text}"`)
    })
  }
  return { attributes, easings: easingCurves, stacking: stackingLevels, motion, strings }
}

/** The text a property's name spells, when it is spelt out. */
function propertyName(name) {
  if (name.kind === SyntaxKind.Identifier || name.kind === SyntaxKind.StringLiteral) return name.text
  return undefined
}

/**
 * The literals a type stands for: a string or number literal, or every literal
 * of a union made only of them. A wider type stands for no literal, and
 * `motionEase(…)` returning `string` is exactly that.
 */
function literalsOf(type) {
  if (type === undefined) return []
  if (type.isStringLiteralType() || type.isNumberLiteralType()) return [type.value]
  if (type.isUnionType()) {
    const parts = type.getTypes().map(literalsOf)
    return parts.every((part) => part.length > 0) ? parts.flat() : []
  }
  return []
}
