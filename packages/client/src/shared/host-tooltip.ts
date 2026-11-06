import * as React from 'react'
import * as reactDom from 'react-dom/client'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'

/**
 * 一个不归 React 管的控件挂上宿主自己的提示气泡。
 *
 * 宿主的 Tooltip 只接受一个 React 元素作锚点，并把气泡摆在那个元素的矩形旁边；
 * 所以控件外面套两层：调用方插进页面的那一层是 `display: contents`（不占排布），
 * React 画的那一层是控件真正的盒子 —— 尺寸跟着控件，气泡因此落在控件旁边。
 * 控件由 React 的 ref 交进内层，指针与焦点事件照样冒上来。
 *
 * 用它的地方是那些由皮肤直接拼出来的控件：浏览器原生的 `title` 与宿主自己的
 * 提示同屏时会露出两种样式。
 */

export interface HostTooltipOptions {
  side?: 'right' | 'bottom' | 'top'
  /** 气泡出现前等多久；宿主的行内动作按钮都在指针停稳后才出来。 */
  delayMs?: number
  /**
   * 内层盒子自己的类名，用来让它参与父级的排布（被省略号截断的标题要一个
   * 撑满的 flex 项）。不交时内层是 `inline-flex`，尺寸由控件决定。
   */
  className?: string
  /** 气泡挂到 body 下（默认），因此不被列表、侧栏这类会滚动或裁切的外层剪掉。 */
  portal?: boolean
}

export interface HostTooltip {
  /** 插到控件原来位置的那层外壳。 */
  readonly node: HTMLElement
  /** 换一句提示。 */
  setLabel(label: string): void
  /** 拆掉提示：控件退回外壳原来的位置，控件本身留着。 */
  release(): void
}

/**
 * 一个 React 元素当宿主 Tooltip 的锚点。宿主往锚点上注入自己的属性
 * （`aria-describedby` 与几个事件），类型因此要求元素声明其中之一；元素本身
 * 本来就要接受这些属性，这里只是把那个要求写明白。
 */
export function tooltipAnchor(element: React.ReactElement): React.ReactElement<{ 'aria-describedby'?: string }> {
  return element as React.ReactElement<{ 'aria-describedby'?: string }>
}

export function hostTooltip(control: HTMLElement, label: string, options: HostTooltipOptions = {}): HostTooltip {
  const mount = document.createElement('span')
  mount.style.display = 'contents'
  let text = label
  const root = reactDom.createRoot(mount)
  /** 控件自己留在内层盒子里：React 只管锚点这一层，不重画控件的内容。 */
  function adopt(node: HTMLElement | null) {
    if (node === null || control.parentNode === node) return
    node.appendChild(control)
  }
  function render() {
    root.render(React.createElement(primitives.Tooltip, {
      label: text,
      side: options.side ?? 'bottom',
      portal: options.portal ?? true,
      ...options.delayMs === undefined ? {} : { delayMs: options.delayMs },
      children: React.createElement('span', {
        className: options.className,
        style: options.className === undefined ? { display: 'inline-flex' } : undefined,
        ref: adopt,
      }),
    }))
  }
  render()
  return {
    node: mount,
    setLabel(next: string) {
      if (next === text) return
      text = next
      render()
    },
    release() {
      root.unmount()
      if (!mount.isConnected) return
      control.remove()
      mount.replaceWith(control)
    },
  }
}
