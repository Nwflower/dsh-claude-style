import { CHUNK_MODULES } from 'virtual:dsh-claude-style/chunk-modules'
import type { FeatureInstall } from './feature'

/** What a chunk's script sets on its own element: its body, still to be run against the shared modules. */
type ChunkFactory = NonNullable<HTMLScriptElement['__dshChunk']>

/** This generation's chunk loads by address: a feature switched off and on again reuses its first load. */
const loads = new Map<string, Promise<FeatureInstall>>()

/**
 * The `require` a chunk's factory receives (D39): the modules the build left
 * out of the chunk because the bundle carries them, as this generation's own
 * instances. A chunk holding a second copy of a module with state would split
 * that state in two, so the build shares every such module through this table.
 */
function chunkRequire(id: string) {
  if (!Object.hasOwn(CHUNK_MODULES, id)) throw new Error(`dsh-claude-style: a feature chunk asks for "${id}", which the bundle does not share`)
  return CHUNK_MODULES[id]
}

/**
 * Fetch one chunk's script and take the factory it sets on its own element.
 *
 * The chunk is a classic script served by the host half's asset route: a
 * script element is what the host page's own loader uses, so it runs wherever
 * the bundle does. The element leaves the page once it has run.
 */
function fetchFactory(url: string) {
  return new Promise<ChunkFactory>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = url
    script.async = true
    script.onload = () => {
      script.remove()
      if (script.__dshChunk === undefined) reject(new Error(`dsh-claude-style: the chunk ${url} ran without handing back a factory`))
      else resolve(script.__dshChunk)
    }
    script.onerror = () => {
      script.remove()
      // The route answers every chunk the build in lib/ wrote. A host still
      // serving the bundle it read at boot asks for the chunks of the build
      // before an update, which the update replaced.
      reject(new Error(`dsh-claude-style: the chunk ${url} failed to load; restart the host if the plugin was updated while it ran`))
    }
    document.head.appendChild(script)
  })
}

/**
 * Load one feature chunk and hand back its feature's `install` (D39).
 *
 * @param url - the chunk's address (the asset route, content-hashed).
 * @returns `install`, or a rejection naming the address when the script fails
 *     to load, carries no factory or throws while it runs.
 */
export function loadFeatureChunk(url: string): Promise<FeatureInstall> {
  const known = loads.get(url)
  if (known !== undefined) return known
  const load = fetchFactory(url).then((factory) => {
    const { install } = factory(chunkRequire)
    if (typeof install !== 'function') throw new Error(`dsh-claude-style: the chunk ${url} exports no install`)
    return install as FeatureInstall
  })
  loads.set(url, load)
  return load
}
