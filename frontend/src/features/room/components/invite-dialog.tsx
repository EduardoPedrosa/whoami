import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Check, Copy, LinkSimple, ShareNetwork } from '@phosphor-icons/react'
import { type RoomView } from '@whoami/shared'
import { useState } from 'react'

export function Invite({ room }: { room: RoomView }) {
  const [copied, setCopied] = useState(false)
  const [failure, setFailure] = useState(false)
  const link = `${window.location.origin}/?sala=${room.code}`
  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setFailure(false)
    } catch {
      setFailure(true)
    }
  }
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="invite-trigger">
          <LinkSimple aria-hidden="true" size={18} />
          <span>Convidar amigos</span>
          <span className="invite-code">{room.code}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Convite da sala</DialogTitle>
          <DialogDescription>Compartilhe o link ou o código da sala.</DialogDescription>
        </DialogHeader>
        <div className="invite-code-big" aria-label={`Código da sala: ${room.code}`}>
          {room.code}
        </div>
        <Label htmlFor="invite-link">Link do convite</Label>
        <Input id="invite-link" readOnly value={link} onFocus={(e) => e.target.select()} />
        <Button onClick={copy}>
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {copied ? 'Convite copiado' : 'Copiar convite'}
        </Button>
        <p role="status" className="text-sm text-muted-foreground">
          {failure
            ? 'Não foi possível copiar. Selecione o link acima e copie manualmente.'
            : copied
              ? 'Link copiado.'
              : ''}
        </p>
        {typeof navigator.share === 'function' && (
          <Button
            variant="outline"
            onClick={() => {
              void navigator
                .share({
                  title: 'Quem sou eu?',
                  text: `Entre na minha sala ${room.code}`,
                  url: link,
                })
                .catch(() => {})
            }}
          >
            <ShareNetwork aria-hidden="true" />
            Compartilhar
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}
