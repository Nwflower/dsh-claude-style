/**
 * A real file-tool turn rewinds through the confirmation dialog. The fork keeps
 * the prompt prefix while the plugin restores both edited and newly added files.
 *
 * @capability message-actions
 * @features message-actions
 * @risk The conversation rewinds while the Agent's file changes survive, leaving the next turn against the wrong workspace.
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { CONVERSATION_SESSION_ATTRIBUTE, CONVERSATION_SESSION_SELECTOR } from '@dsh-claude-style/contracts/dom'

const PROMPT = 'Change app.js and add notes.md.'

function messageRewindFilesScenario({ check }) {
  return {
    script: {
      conversation: [
        { thinking: ['Change the existing file through the real write tool.'], tool: { name: 'write', input: { file_path: '{{workspace}}/app.js', content: 'const value = 2\n' } } },
        { thinking: ['Create a second file.'], tool: { name: 'write', input: { file_path: '{{workspace}}/notes.md', content: '# Added by the turn\n' } } },
        { thinking: ['The files changed.'], text: ['Changed app.js and added notes.md.\n'] },
      ],
      auxiliary: { text: ['Scripted rewind file edits'] },
    },
    prompt: PROMPT,
    beforeSend({ home, notes }) {
      const workspace = path.join(home, 'workspace')
      notes.workspace = workspace
      fs.mkdirSync(workspace, { recursive: true })
      execFileSync('git', ['init'], { cwd: workspace })
      fs.writeFileSync(path.join(workspace, 'app.js'), 'const value = 1\n')
      fs.rmSync(path.join(workspace, 'notes.md'), { force: true })
    },
    async assert({ page, session, notes }) {
      const source = await page.locator(CONVERSATION_SESSION_SELECTOR).getAttribute(CONVERSATION_SESSION_ATTRIBUTE)
      const row = page.locator('[data-chat-flow-kind="user"]').first()
      await row.hover()
      await page.getByRole('button', { name: /^(撤回这条消息|Retract this message)$/ }).click()
      const dialog = page.getByRole('dialog', { name: /^(撤回这条消息？|Retract this message\?)$/ })
      await dialog.waitFor({ timeout: 20000 })
      const dialogText = (await dialog.textContent()) ?? ''
      const showsFiles = /2 个文件|2 files/.test(dialogText) && dialogText.includes('app.js') && dialogText.includes('notes.md')
      await page.getByRole('button', { name: /^(确认回退|Confirm rewind)$/ }).click()
      await page.waitForFunction(({ selector, attribute, previous }) => {
        const current = document.querySelector(selector)?.getAttribute(attribute)
        return current !== null && current !== undefined && current !== previous
      }, { selector: CONVERSATION_SESSION_SELECTOR, attribute: CONVERSATION_SESSION_ATTRIBUTE, previous: source }, { timeout: 30000 })
      await page.waitForFunction(prompt => (document.querySelector('[data-composer-input]')?.textContent ?? '').trim() === prompt, PROMPT, { timeout: 20000 })
      const app = fs.readFileSync(path.join(notes.workspace, 'app.js'), 'utf8')
      const added = fs.existsSync(path.join(notes.workspace, 'notes.md'))
      return [
        check('确认窗口列出本轮修改和新增的文件', showsFiles, dialogText.slice(0, 500)),
        check('真实文件工具修改在回退后恢复原字节', app === 'const value = 1\n', JSON.stringify(app)),
        check('本轮新增的文件在回退后移除', added === false, 'exists=' + String(added)),
        check('撤回后的原文回到同一逻辑对话输入框', (await page.locator('[data-composer-input]').textContent())?.trim() === PROMPT, PROMPT),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

export { messageRewindFilesScenario }
