import { test, expect } from '@playwright/test'
import { io, type Socket } from 'socket.io-client'
import { randomBytes, randomUUID } from 'node:crypto'
import type { ClientEvents, Command, CommandInput, RoomView, ServerEvents } from '@whoami/shared'

type Client = Socket<ServerEvents, ClientEvents>
async function command(socket: Client, input: CommandInput): Promise<RoomView> {
  const ack = await socket
    .timeout(5000)
    .emitWithAck('command', { ...input, requestId: randomUUID() } as Command)
  if (!ack.ok || !ack.room) throw new Error(JSON.stringify(ack))
  return ack.room
}
async function connect(url: string, token: string): Promise<Client> {
  const socket: Client = io(url, { transports: ['websocket'], auth: { token }, autoConnect: false })
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', () => resolve())
    socket.once('connect_error', reject)
    socket.connect()
  })
  return socket
}

test('twelve physical seats, author confirmation, adjustable order and confirmed host ending', async ({
  page,
  baseURL,
}) => {
  const sockets: Client[] = []
  const token = randomBytes(32).toString('hex')
  try {
    sockets.push(await connect(baseURL!, token))
    const created = await command(sockets[0]!, {
      type: 'room:create',
      profile: { name: 'Pessoa 1', avatar: 'planet' },
      settings: { category: 'Tudo vale' },
    })
    for (let i = 2; i <= 12; i++) {
      const socket = await connect(baseURL!, randomBytes(32).toString('hex'))
      sockets.push(socket)
      await command(socket, {
        type: 'room:join',
        code: created.code,
        profile: { name: `Pessoa ${i}`, avatar: 'ghost' },
      })
    }
    await page.addInitScript((value) => localStorage.setItem('whoami.session.v2', value), token)
    await page.goto('/')
    await expect(page.locator('.player-roster li')).toHaveCount(12)
    await page.getByRole('button', { name: 'Organizar roda' }).click()
    await page.getByRole('button', { name: 'Mover Pessoa 3 para antes', exact: true }).click()
    await expect(page.locator('.seat-order-list strong').nth(1)).toHaveText('Pessoa 3')
    await page.getByRole('button', { name: 'Salvar ordem da roda' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await Promise.all(
      sockets.slice(1).map((socket) => command(socket, { type: 'room:ready', ready: true })),
    )
    await page.getByRole('button', { name: 'Estou pronto', exact: true }).click()
    await page.getByRole('button', { name: 'Começar rodada' }).click()
    await expect(page.locator('.assignment-person')).toContainText('Pessoa 3')
    const round = 1
    await Promise.all(
      sockets
        .slice(1)
        .map((socket, index) =>
          command(socket, { type: 'identity:set', round, identity: `Identidade ${index + 2}` }),
        ),
    )
    await page.getByLabel('Quem essa pessoa vai ser?').fill('Identidade 1')
    await page.getByRole('button', { name: 'Enviar identidade' }).click()
    await expect(page.locator('.circle-seat')).toHaveCount(12)
    await expect(page.locator('.circle-own')).not.toContainText('Identidade 12')
    await expect(page.getByRole('button', { name: /^Confirmar acerto de/ })).toHaveCount(1)
    await expect(
      page.getByRole('button', { name: 'Confirmar acerto de Pessoa 3', exact: true }),
    ).toBeVisible()
    for (const viewport of [
      { width: 1440, height: 1000 },
      { width: 1024, height: 768 },
      { width: 375, height: 812 },
      { width: 320, height: 700 },
    ]) {
      await page.setViewportSize(viewport)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
      const seats = await page.locator('.circle-seat').all()
      const boxes = await Promise.all(seats.map((seat) => seat.boundingBox()))
      for (let i = 0; i < boxes.length; i++) {
        const a = boxes[i]!
        expect(a.x).toBeGreaterThanOrEqual(0)
        expect(a.x + a.width).toBeLessThanOrEqual(viewport.width)
        for (let j = i + 1; j < boxes.length; j++) {
          const b = boxes[j]!
          const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
          const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
          expect(
            overlapX <= 0 || overlapY <= 0,
            `Seats ${i + 1} and ${j + 1} overlap at ${viewport.width}px`,
          ).toBe(true)
        }
      }
      await page.screenshot({
        path: `test-results/circle-twelve-${viewport.width}.png`,
        fullPage: true,
      })
    }
    await page
      .getByRole('button', { name: 'Carta de Pessoa 1, você, perguntando agora', exact: true })
      .click()
    await expect(page.getByRole('dialog')).not.toContainText('Identidade 12')
    await page.getByRole('button', { name: 'Fechar', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.getByRole('button', { name: 'Confirmar acerto de Pessoa 3', exact: true }).click()
    await page.getByRole('button', { name: 'Sim, acertou!' }).click()
    await expect(page.getByRole('heading', { name: 'Sua vez de descobrir.' })).toBeVisible()
    await expect(page.locator('.circle-seat').filter({ hasText: 'Pessoa 3' })).toHaveClass(
      /circle-solved/,
    )
    await expect(page.locator('.next-turns li').first()).toContainText('Pessoa 2')
    await page.getByRole('button', { name: 'Encerrar partida', exact: true }).click()
    await page.getByRole('button', { name: 'Continuar jogando', exact: true }).click()
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
    await expect(page.locator('.circle-seat')).toHaveCount(12)
    await page.getByRole('button', { name: 'Encerrar partida', exact: true }).click()
    await page.getByRole('button', { name: 'Sim, encerrar partida', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Fim da rodada!' })).toBeVisible()
    await expect(page.locator('.result-list')).toContainText('Identidade 12')
    await expect(page.locator('.result-list li')).toHaveCount(12)
  } finally {
    sockets.forEach((socket) => socket.disconnect())
  }
})
