const { test } = require('node:test')
const assert = require('node:assert/strict')
const { spawn } = require('node:child_process')
const { once } = require('node:events')
const path = require('node:path')
const { io } = require('socket.io-client')

function event(socket, name) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(name, receive)
      reject(new Error(`Timed out waiting for ${name}`))
    }, 5000)
    function receive(value) {
      clearTimeout(timer)
      resolve(value)
    }
    socket.once(name, receive)
  })
}

test('two players join, assign hidden identities, start, restart and disconnect', { timeout: 20000 }, async (t) => {
  const server = spawn(process.execPath, [path.join(__dirname, '../src/index.js')], {
    env: { ...process.env, PORT: '0', CORS_ORIGIN: 'http://localhost:3000' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const sockets = []
  t.after(async () => {
    sockets.forEach(socket => socket.disconnect())
    if (server.exitCode === null) {
      const exited = once(server, 'exit')
      server.kill()
      await exited
    }
  })
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Backend did not start')), 5000)
    server.once('error', reject)
    server.stdout.on('data', chunk => {
      const match = String(chunk).match(/RUNNING ON PORT (\d+)/)
      if (match) { clearTimeout(timer); resolve(match[1]) }
    })
  })
  const url = `http://localhost:${port}`
  const response = await fetch(`${url}/socket.io/?EIO=4&transport=polling`, {
    headers: { Origin: 'http://localhost:3000' },
  })
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:3000')

  async function connect() {
    const socket = io(url, { autoConnect: false, reconnection: false })
    sockets.push(socket)
    const me = event(socket, 'me')
    socket.connect()
    assert.equal(await me, socket.id)
    return socket
  }
  const a = await connect()
  let update = event(a, 'users')
  a.emit('enter', 'Alice')
  assert.equal((await update)[0].name, 'Alice')
  let error = event(a, 'error')
  a.emit('start')
  assert.equal(await error, 'Cannot start with only one person')

  const b = await connect()
  update = event(a, 'users')
  b.emit('enter', 'Bob')
  assert.equal((await update).length, 2)
  error = event(a, 'error')
  a.emit('start')
  assert.equal(await error, 'Waiting for the label creation')

  // A connection that never joins must not remove a real player on disconnect.
  const visitor = await connect()
  visitor.disconnect()
  let updates = [event(a, 'users'), event(b, 'users')]
  a.emit('setLabel', 'Batman')
  let [aUsers, bUsers] = await Promise.all(updates)
  assert.equal(aUsers.length, 2)
  assert.equal(aUsers[1].label, 'Batman')
  assert.equal(bUsers[1].label, 'hidden')
  updates = [event(a, 'users'), event(b, 'users')]
  b.emit('setLabel', 'Superman')
  ;[aUsers, bUsers] = await Promise.all(updates)
  assert.equal(aUsers[0].label, 'hidden')
  assert.equal(bUsers[0].label, 'Superman')

  let started = [event(a, 'started'), event(b, 'started')]
  a.emit('start')
  await Promise.all(started)
  error = event(a, 'error')
  a.emit('setLabel', 'Changed')
  assert.equal(await error, 'Game already started')
  const newcomer = await connect()
  error = event(newcomer, 'error')
  newcomer.emit('enter', 'Charlie')
  assert.equal(await error, 'Game already started')
  newcomer.disconnect()

  const restarted = [event(a, 'restarted'), event(b, 'restarted')]
  update = event(a, 'users')
  a.emit('restart')
  assert.ok((await update).every(user => user.label === ''))
  await Promise.all(restarted)
  update = event(a, 'users')
  b.disconnect()
  assert.deepEqual((await update).map(user => user.name), ['Alice'])
})
