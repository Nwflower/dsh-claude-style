/** Keep both panel fitters' page lengths in the same CSS declaration precision (D81). */
export function panelLength(value: number) {
  return `${Math.round(value * 100) / 100}px`
}
