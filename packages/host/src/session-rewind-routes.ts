/** Private routes for logical-conversation reads, rewind plans and fork commits (D75, D105). */
import {
  SESSION_REVISIONS_PATH,
  SESSION_REWIND_COMMIT_PATH,
  SESSION_REWIND_PLAN_PATH,
} from '@dsh-claude-style/contracts/routes'
import type { RewindAction, RewindCommitRequest } from '@dsh-claude-style/contracts/session-rewind'
import type { DshContext, DshPeerScope, DshRequest, DshResponse, DshRoute } from '@dsh-claude-style/engine/node/dsh'
import { fenceRefused, readRequestBody, sendJson } from '@dsh-claude-style/engine/node/http'
import type { SessionRewind } from './session-rewind.js'

const BODY_MAX = 8192
const SESSION_ID_RE = /^[A-Za-z0-9._\-:@]{1,200}$/
const ACTIONS = new Set<RewindAction>(['retract', 'edit', 'rerun', 'delete'])

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function body(req: DshRequest, res: DshResponse): Promise<Record<string, unknown> | null> {
  const bytes = await readRequestBody(req, BODY_MAX)
  if (bytes === null) {
    sendJson(res, 413, { ok: false, error: 'request body is unavailable or too large' })
    return null
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(bytes.toString('utf8'))
  } catch {
    // Malformed caller input is a 400, isolated from the host route fiber.
    sendJson(res, 400, { ok: false, error: 'request body is not JSON' })
    return null
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    sendJson(res, 400, { ok: false, error: 'request body is not an object' })
    return null
  }
  return parsed as Record<string, unknown>
}

function operation(res: DshResponse, run: () => Promise<unknown>): void {
  void run().then(value => {
    sendJson(res, 200, { ok: true, value })
  }, error => {
    // A request failure ends at this response; the host's other private routes remain alive.
    sendJson(res, 409, { ok: false, error: messageOf(error) })
  })
}

export function sessionRewindRoutes(ctx: DshContext, rewind: SessionRewind): { label: string, route: DshRoute }[] {
  const fence = (req: DshRequest, res: DshResponse, peer: DshPeerScope | undefined, method: string): boolean => {
    if (req.method !== method) {
      res.writeHead(405, { allow: method })
      res.end()
      return false
    }
    return !fenceRefused(ctx, req, res, peer)
  }
  return [
    {
      label: 'logical conversations',
      route: {
        kind: 'exact',
        path: SESSION_REVISIONS_PATH,
        handler: (req, res, peer) => {
          if (!fence(req, res, peer, 'GET')) return
          operation(res, () => rewind.conversations())
        },
      },
    },
    {
      label: 'session rewind plan',
      route: {
        kind: 'exact',
        path: SESSION_REWIND_PLAN_PATH,
        handler: (req, res, peer) => {
          if (!fence(req, res, peer, 'POST')) return
          void body(req, res).then(request => {
            if (request === null) return
            const sessionId = request.sessionId
            if (typeof sessionId !== 'string' || !SESSION_ID_RE.test(sessionId)) {
              sendJson(res, 400, { ok: false, error: 'invalid session id' })
              return
            }
            operation(res, () => rewind.plan(sessionId, Number(request.messageSeq), Number(request.turn)))
          })
        },
      },
    },
    {
      label: 'session rewind commit',
      route: {
        kind: 'exact',
        path: SESSION_REWIND_COMMIT_PATH,
        handler: (req, res, peer) => {
          if (!fence(req, res, peer, 'POST')) return
          void body(req, res).then(request => {
            if (request === null) return
            if (typeof request.planId !== 'string' || typeof request.childSessionId !== 'string'
              || typeof request.action !== 'string' || !ACTIONS.has(request.action as RewindAction)
              || typeof request.restore !== 'boolean') {
              sendJson(res, 400, { ok: false, error: 'invalid rewind commit' })
              return
            }
            const commit: RewindCommitRequest = {
              planId: request.planId,
              childSessionId: request.childSessionId,
              action: request.action as RewindAction,
              restore: request.restore,
            }
            operation(res, () => rewind.commit(commit))
          })
        },
      },
    },
  ]
}
