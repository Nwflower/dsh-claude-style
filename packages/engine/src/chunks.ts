/**
 * Load deferred feature chunks (D76) through the host's client module system,
 * then run each chunk's body against the modules the bundle shares, so stateful
 * modules stay singletons.
 *
 * The host fetches a package-local chunk at the owner's current revision and
 * materializes it with its own module-table `require`, which knows only the host's
 * packages. The chunk's exports are therefore its body: a function that takes the
 * shared-module `require` and returns the feature's `install`.
 */

/** What a chunk's exports are: its body, still to be run against the shared modules. */
type ChunkBody = (require: (id: string) => unknown) => { install?: unknown }

/** Where a loader's chunks come from. */
export interface ChunkSource {
  /** The package's own name, as its refusals spell it. */
  packageName: string
  /** The modules the bundle carries, by id, as the chunk's `require` answers them. */
  modules: Record<string, unknown>
  /** The host's fetch of one chunk file beside client.js, resolving to that chunk's exports. */
  importChunk(fileName: string): Promise<unknown>
}

/** Cache successful loads; forget failures so re-enabling retries. */
export function createChunkLoader<Install>(source: ChunkSource) {
  const loads = new Map<string, Promise<Install>>()

  /** Resolve only bundle-shared modules; duplicate stateful copies would split state (D76). */
  function chunkRequire(id: string) {
    if (!Object.hasOwn(source.modules, id)) throw new Error(`${source.packageName}: a feature chunk asks for "${id}", which the bundle does not share`)
    return source.modules[id]
  }

  /** Return the chunk's `install`; failures reject with its file name. */
  function load(fileName: string): Promise<Install> {
    const known = loads.get(fileName)
    if (known !== undefined) return known
    const arrived = source.importChunk(fileName).catch((error: unknown) => {
      // The host's transport error names a URL of its own; the report names the chunk.
      throw new Error(`${source.packageName}: the chunk ${fileName} failed to load: ${error instanceof Error ? error.message : String(error)}`, { cause: error })
    })
    const pending = arrived.then((body) => {
      if (typeof body !== 'function') throw new Error(`${source.packageName}: the chunk ${fileName} hands back no body`)
      const { install } = (body as ChunkBody)(chunkRequire)
      if (typeof install !== 'function') throw new Error(`${source.packageName}: the chunk ${fileName} exports no install`)
      return install as Install
    })
    loads.set(fileName, pending)
    // A failure is that call's own: forgetting it here lets a later enable ask
    // the host again, rather than carrying one network blip as a permanent
    // refusal for the rest of the page.
    pending.catch(() => {
      if (loads.get(fileName) === pending) loads.delete(fileName)
    })
    return pending
  }

  return { load }
}
