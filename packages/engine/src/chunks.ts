/** Load deferred feature scripts (D72) with bundle-shared modules so stateful modules stay singletons. */

/** What a chunk's script sets on its own element: its body, still to be run against the shared modules. */
type ChunkFactory = NonNullable<HTMLScriptElement['__dshChunk']>

/** Where a loader's chunks come from. */
export interface ChunkSource {
  /** The package's own name, as its refusals spell it. */
  packageName: string
  /** The modules the bundle carries, by id, as the chunk's `require` answers them. */
  modules: Record<string, unknown>
}

/** How long one chunk's script may take: a route that accepts and then says nothing is not worth the wait. */
const CHUNK_TIMEOUT_MS = 15_000

/** Load as a classic script like the host loader; always remove the element and bound waiting by timeout. */
function fetchFactory(url: string, packageName: string) {
  return new Promise<ChunkFactory>((resolve, reject) => {
    const script = document.createElement('script')
    let settled = false
    const settle = (answer: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(deadline)
      script.remove()
      answer()
    }
    const deadline = setTimeout(() => {
      settle(() => reject(new Error(`${packageName}: the chunk ${url} did not arrive within ${CHUNK_TIMEOUT_MS} ms`)))
    }, CHUNK_TIMEOUT_MS)
    script.src = url
    script.async = true
    script.onload = () => {
      settle(() => {
        if (script.__dshChunk === undefined) reject(new Error(`${packageName}: the chunk ${url} ran without handing back a factory`))
        else resolve(script.__dshChunk)
      })
    }
    script.onerror = () => {
      settle(() => {
        // The route answers every chunk the build in lib/ wrote. A host still
        // serving the bundle it read at boot asks for the chunks of the build
        // before an update, which the update replaced.
        reject(new Error(`${packageName}: the chunk ${url} failed to load; restart the host if the plugin was updated while it ran`))
      })
    }
    document.head.appendChild(script)
  })
}

/** Cache successful loads; forget failures so re-enabling retries. */
export function createChunkLoader<Install>(source: ChunkSource) {
  const loads = new Map<string, Promise<Install>>()

  /** Resolve only bundle-shared modules; duplicate stateful copies would split state (D72). */
  function chunkRequire(id: string) {
    if (!Object.hasOwn(source.modules, id)) throw new Error(`${source.packageName}: a feature chunk asks for "${id}", which the bundle does not share`)
    return source.modules[id]
  }

  /** Return the chunk's `install`; failures reject with its URL. */
  function load(url: string): Promise<Install> {
    const known = loads.get(url)
    if (known !== undefined) return known
    const pending = fetchFactory(url, source.packageName).then((factory) => {
      const { install } = factory(chunkRequire)
      if (typeof install !== 'function') throw new Error(`${source.packageName}: the chunk ${url} exports no install`)
      return install as Install
    })
    loads.set(url, pending)
    // A failure is that call's own: forgetting it here lets a later enable ask
    // the route again, rather than carrying one network blip as a permanent
    // refusal for the rest of the page.
    pending.catch(() => {
      if (loads.get(url) === pending) loads.delete(url)
    })
    return pending
  }

  return { load }
}
