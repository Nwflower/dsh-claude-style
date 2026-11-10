/** dsh-im's generated title at the external-plugin boundary (issue #307). */
export const CHANNEL_ATTRIBUTE = 'data-dsh-im-session-channel'
export const CHANNEL_TEXT_ATTRIBUTE = 'data-dsh-im-session-text'

export function installChannelTitleSheet() {
  const sheet = document.createElement('style')
  const marked = `[${CHANNEL_ATTRIBUTE}][${CHANNEL_TEXT_ATTRIBUTE}]`
  sheet.textContent = `
    ${marked} {
      position: relative;
      -webkit-text-fill-color: transparent;
      text-overflow: clip !important;
      overflow: hidden;
    }
    ${marked}::before {
      content: "";
      position: absolute;
      inset-inline-start: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 16px;
      height: 16px;
      background: var(--dsh-im-session-logo) center / contain no-repeat;
      text-indent: 0;
      pointer-events: none;
    }
    ${marked}::after {
      content: attr(${CHANNEL_TEXT_ATTRIBUTE}) / "";
      position: absolute;
      inset: 0;
      inset-inline-start: 22px;
      -webkit-text-fill-color: currentColor;
      text-indent: 0;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      pointer-events: none;
    }
  `
  document.head.append(sheet)
  return () => sheet.remove()
}
