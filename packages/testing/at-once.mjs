/**
 * Run `each` over every item, at most `jobs` of them at once, and answer the
 * results in the items' own order. The smoke's page loads and the behaviour
 * layer's tests (D87) spend most of their time waiting on a page, so they wait
 * beside one another.
 */
async function mapAtOnce(items, jobs, each) {
  const results = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const at = next
      next += 1
      results[at] = await each(items[at])
    }
  }
  const workers = Math.max(1, Math.min(jobs, items.length))
  await Promise.all(Array.from({ length: workers }, () => worker()))
  return results
}

export { mapAtOnce }
