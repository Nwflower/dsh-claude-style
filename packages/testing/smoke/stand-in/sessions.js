/**
 * The session list and binding each case's page carries: the mascot's own
 * session, the turn navigator's, the statistics case's key-addressed faces, the
 * turn fixture's bound session, the auto mode cases' command target, and the
 * list that throws for the sync-fault case.
 */
(function () {
  var host = window.__dshSmokeHost
  var CASE = host.CASE
  var deepy = host.deepy
  var turnNav = host.turnNav
  var statsCase = host.statsCase
  var statsFixtureCase = host.statsFixtureCase
  var waitFixtureCase = host.waitFixtureCase
  var permissionFixture = host.permissionFixture
  var permissionCommands = host.permissionCommands

  var sessions = host.agentTeam !== undefined ? host.agentTeam.sessions : deepy !== undefined ? deepy.sessions : turnNav !== undefined ? turnNav.sessions : statsFixtureCase ? statsCase.sessions : waitFixtureCase ? host.emptySessions(function (id) { return id === 'smoke-session' ? {} : undefined }) : CASE === 'sync-fault'
    ? { list: { getSnapshot: function () { throw new Error('session list unavailable') }, subscribe: function () { return function () {} } }, binding: function () { return null } }
    : (permissionFixture !== undefined && permissionFixture.current !== null ? {
        selected: 'smoke-session',
        list: {
          getSnapshot: function () { return { ids: [], byId: {}, projectionsBySession: {} } },
          subscribe: function () { return function () {} },
        },
        binding: function () {
          return {
            session: {
              projections: {
                faceOf: function () {
                  return { getSnapshot: function () { return { currentValue: permissionFixture.current } } }
                },
              },
              command: function (line) { permissionCommands.push(line); return undefined },
            },
          }
        },
      } : undefined)
  host.sessions = sessions
})()
