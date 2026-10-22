import { Avatar } from '@/components/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { gameClient } from '@/lib/game-client'
import { cn } from '@/lib/utils'
import { createIdentitySuggester } from '@/lib/identity-suggestions'
import { ArrowRight, Check, CheckCircle, LockSimple, Shuffle } from '@phosphor-icons/react'
import { IDENTITY_SUGGESTIONS, type RoomView } from '@whoami/shared'
import { useState, type FormEvent } from 'react'

export function Assigning({ room, disabled }: { room: RoomView; disabled: boolean }) {
  const target = room.players.find((p) => p.id === room.assignmentTargetId)!
  const [identity, setIdentity] = useState(room.submittedIdentity || '')
  const [editing, setEditing] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [suggestIdentity] = useState(() =>
    createIdentitySuggester(IDENTITY_SUGGESTIONS[room.settings.category]),
  )
  const assigned = room.players.filter((p) => p.hasAssigned).length
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (identity.trim().length < 2) {
      setLocalError('Escreva pelo menos 2 caracteres.')
      return
    }
    if (
      await gameClient.command({
        type: 'identity:set',
        identity: identity.trim(),
        round: room.round,
      })
    )
      setEditing(false)
  }
  const submitted = !!room.submittedIdentity && !editing
  return (
    <div className="assigning-content">
      <div className="assignment-heading">
        <span className="small-tag">{room.settings.category}</span>
        <h2>Quem vai ser quem?</h2>
        <p>
          Escolha uma identidade que {target.name} consiga descobrir. Pode ser uma pessoa,
          personagem ou coisa.
        </p>
      </div>
      <div className={cn('assignment-card', submitted && 'assignment-sent')}>
        <div className="assignment-card-top">
          <span>ESSA CARTA É PARA</span>
          <LockSimple size={20} aria-hidden="true" />
        </div>
        <div className="assignment-person">
          <Avatar avatar={target.avatar} large />
          <h3>{target.name}</h3>
        </div>
        {submitted ? (
          <div className="assignment-confirmed">
            <CheckCircle size={42} weight="duotone" aria-hidden="true" />
            <h4>Identidade enviada.</h4>
            <p>{room.submittedIdentity}</p>
            <span>{target.name} só vai descobrir jogando.</span>
            <Button variant="ghost" disabled={disabled} onClick={() => setEditing(true)}>
              Trocar identidade
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="assignment-form">
            <Label htmlFor="secret-identity">Quem essa pessoa vai ser?</Label>
            <Input
              id="secret-identity"
              value={identity}
              onChange={(e) => {
                setIdentity(e.target.value)
                setLocalError(null)
              }}
              maxLength={50}
              placeholder="Ex.: Sherlock Holmes"
              autoComplete="off"
              aria-invalid={!!localError}
              aria-describedby="identity-hint"
            />
            <p
              id="identity-hint"
              className={cn(localError ? 'field-error' : 'text-muted-foreground')}
            >
              {localError || `${identity.length}/50 caracteres. Evite algo que só você conhece.`}
            </p>
            <Button type="submit" disabled={disabled}>
              Enviar identidade
              <ArrowRight size={18} aria-hidden="true" />
            </Button>
          </form>
        )}
      </div>
      {!submitted && (
        <div className="suggestion-area">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const suggestion = suggestIdentity(identity)
              if (suggestion) {
                setIdentity(suggestion)
                setLocalError(null)
              }
            }}
          >
            <Shuffle size={17} aria-hidden="true" />
            Sugerir uma identidade
          </Button>
        </div>
      )}
      <div className="assignment-progress" role="status">
        <div className="mini-player-row">
          {room.players.map((p) => (
            <span
              key={p.id}
              className={cn('mini-player', p.hasAssigned && 'mini-player-done')}
              title={`${p.name}: ${p.hasAssigned ? 'escolheu' : 'escolhendo'}`}
            >
              <Avatar avatar={p.avatar} />
              {p.hasAssigned && <Check size={13} weight="bold" aria-hidden="true" />}
            </span>
          ))}
        </div>
        <p>
          <strong>
            {assigned} de {room.players.length}
          </strong>{' '}
          identidades escolhidas
        </p>
        <span>A rodada começa quando todos escolherem.</span>
      </div>
    </div>
  )
}
