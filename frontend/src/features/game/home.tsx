import { useState, type FormEvent } from 'react'
import { motion } from 'motion/react'
import { ArrowRight, Plus, SignIn, UsersThree, DeviceMobile, Check } from '@phosphor-icons/react'
import { AVATARS, profileSchema, roomCodeSchema, type Avatar as AvatarId } from '@whoami/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, avatarLabels } from '@/components/avatar'
import { gameClient, useGame } from '@/lib/game-client'
import { cn } from '@/lib/utils'

export function Home() {
  const invite = new URLSearchParams(window.location.search).get('sala')?.toUpperCase() || ''
  const [mode, setMode] = useState<'create' | 'join'>(invite ? 'join' : 'create')
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem('whoami.name') || ''
    } catch {
      return ''
    }
  })
  const [avatar, setAvatar] = useState<AvatarId>('planet')
  const [code, setCode] = useState(invite)
  const [validation, setValidation] = useState<{ name?: string; code?: string }>({})
  const { pending, connection } = useGame()
  const disabled = pending || connection !== 'connected'
  async function submit(event: FormEvent) {
    event.preventDefault()
    const profile = profileSchema.safeParse({ name, avatar })
    const parsedCode = roomCodeSchema.safeParse(code)
    const errors = {
      name: profile.success ? undefined : profile.error.issues[0]?.message,
      code:
        mode === 'join' && !parsedCode.success ? parsedCode.error.issues[0]?.message : undefined,
    }
    setValidation(errors)
    if (!profile.success || errors.code) return
    try {
      localStorage.setItem('whoami.name', profile.data.name)
    } catch {
      /* optional preference */
    }
    const ok = await gameClient.command(
      mode === 'create'
        ? {
            type: 'room:create',
            profile: profile.data,
            settings: { category: 'Tudo vale', turnSeconds: 90 },
          }
        : { type: 'room:join', profile: profile.data, code: parsedCode.data! },
    )
    if (ok) window.history.replaceState({}, '', '/')
  }
  return (
    <main id="main-content" className="home-main">
      <section className="hero-layout" aria-labelledby="home-title">
        <div className="hero-copy">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <div className="home-eyebrow">
              <span className="eyebrow-line" /> JOGUE COM OS AMIGOS
            </div>
            <h1 id="home-title">
              Quem sou <span>eu?</span>
            </h1>
            <p className="hero-description">
              Todo mundo sabe.
              <br />
              Menos você.
            </p>
          </motion.div>
          <motion.div
            className="launcher"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
          >
            <div className="launcher-tabs" role="group" aria-label="Como você quer jogar?">
              <button
                type="button"
                aria-pressed={mode === 'create'}
                className={cn(mode === 'create' && 'selected')}
                onClick={() => {
                  setMode('create')
                  setValidation({})
                  gameClient.clearError()
                }}
              >
                <Plus size={18} aria-hidden="true" /> Criar uma sala
              </button>
              <button
                type="button"
                aria-pressed={mode === 'join'}
                className={cn(mode === 'join' && 'selected')}
                onClick={() => {
                  setMode('join')
                  setValidation({})
                  gameClient.clearError()
                }}
              >
                <SignIn size={18} aria-hidden="true" /> Entrar com código
              </button>
            </div>
            <form onSubmit={submit} className="launcher-form" noValidate>
              <div className="space-y-2">
                <Label htmlFor="player-name">Seu nome</Label>
                <Input
                  id="player-name"
                  name="name"
                  autoComplete="nickname"
                  placeholder="Seu nome ou apelido"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={24}
                  aria-invalid={!!validation.name}
                  aria-describedby={validation.name ? 'name-error' : undefined}
                />
                {validation.name && (
                  <p id="name-error" className="field-error">
                    {validation.name}
                  </p>
                )}
              </div>
              <fieldset>
                <legend className="avatar-legend">Escolha seu avatar</legend>
                <div className="avatar-picker">
                  {AVATARS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      aria-label={`Avatar ${avatarLabels[option]}`}
                      aria-pressed={avatar === option}
                      className={cn('avatar-option', avatar === option && 'avatar-selected')}
                      onClick={() => setAvatar(option)}
                    >
                      <Avatar avatar={option} />
                      {avatar === option && (
                        <Check
                          className="avatar-check"
                          weight="bold"
                          aria-hidden="true"
                          size={12}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </fieldset>
              {mode === 'join' && (
                <div className="space-y-2">
                  <Label htmlFor="room-code">Código da sala</Label>
                  <Input
                    id="room-code"
                    name="roomCode"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\s/g, '').toUpperCase())}
                    placeholder="ABC234"
                    maxLength={6}
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    className="code-input"
                    aria-invalid={!!validation.code}
                    aria-describedby={validation.code ? 'code-error' : undefined}
                  />
                  {validation.code && (
                    <p id="code-error" className="field-error">
                      {validation.code}
                    </p>
                  )}
                </div>
              )}
              <Button type="submit" size="lg" className="launcher-submit" disabled={disabled}>
                {pending
                  ? 'Entrando na sala…'
                  : mode === 'create'
                    ? 'Bora jogar'
                    : 'Entrar na sala'}
                <ArrowRight size={20} aria-hidden="true" />
              </Button>
            </form>
          </motion.div>
          <div className="game-facts">
            <span>
              <UsersThree aria-hidden="true" size={18} /> 2 a 12 pessoas
            </span>
            <span>
              <DeviceMobile aria-hidden="true" size={18} /> Cada um no seu celular
            </span>
          </div>
        </div>
        <motion.div
          className="hero-art"
          initial={{ opacity: 0, scale: 0.94, rotate: -2 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          <img
            src="/identity-cards.webp"
            width="1100"
            height="1100"
            alt="Cartas de identidades com um astronauta, um ponto de interrogação e um alienígena azul."
            fetchPriority="high"
          />
        </motion.div>
      </section>
      <section className="home-bottom" aria-label="A regra é simples">
        <span className="bottom-number">?</span>
        <p>
          Seus amigos escolhem quem você é.
          <br />
          <strong>Descubra fazendo perguntas.</strong>
        </p>
        <div className="bottom-rule">
          Só vale responder
          <br />
          sim ou não.
        </div>
      </section>
    </main>
  )
}
