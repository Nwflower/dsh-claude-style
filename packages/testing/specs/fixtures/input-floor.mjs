/**
 * The semantic font sizes of the editable elements the page draws, beside the
 * width mark the resize pass writes (#376).
 */
export function readInputFloor(t) {
  return t.page.evaluate(() => {
    const under = document.body.hasAttribute('data-dsh-claude-page-under-768')
    const sizes = [...document.querySelectorAll('textarea, input, select, [contenteditable="true"], [contenteditable=""]')]
      .filter((element) => element.getBoundingClientRect().width > 0)
      .map((element) => parseFloat(getComputedStyle(element).fontSize))
    return { under, sizes, width: innerWidth }
  })
}
