import { useState } from 'react'
import { Check, PencilSimple } from '@phosphor-icons/react'
import { AVATARS, type Avatar as AvatarId } from '@whoami/shared'
import { Avatar, avatarLabels } from '@/components/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export function AvatarPicker({
  value,
  onChange,
}: {
  value: AvatarId
  onChange: (value: AvatarId) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="profile-avatar">
      <span className="profile-avatar-label">Avatar</span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            className="profile-avatar-trigger"
            aria-label={`Escolher avatar, atual: ${avatarLabels[value]}`}
          >
            <Avatar avatar={value} />
            <PencilSimple size={13} aria-hidden="true" className="avatar-edit" />
          </button>
        </DialogTrigger>
        <DialogContent className="avatar-dialog rounded-3xl">
          <DialogHeader>
            <DialogTitle>Escolha seu avatar</DialogTitle>
            <DialogDescription>Como você quer aparecer na sala?</DialogDescription>
          </DialogHeader>
          <div className="avatar-picker" role="group" aria-label="Avatares disponíveis">
            {AVATARS.map((option) => (
              <button
                key={option}
                type="button"
                aria-label={`Avatar ${avatarLabels[option]}`}
                aria-pressed={value === option}
                className={cn('avatar-option', value === option && 'avatar-selected')}
                onClick={() => {
                  onChange(option)
                  setOpen(false)
                }}
              >
                <Avatar avatar={option} />
                <span>{avatarLabels[option]}</span>
                {value === option && (
                  <Check className="avatar-check" weight="bold" aria-hidden="true" size={12} />
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
