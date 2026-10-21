import {
  Planet,
  Ghost,
  Rocket,
  Cat,
  Leaf,
  Lightning,
  Crown,
  Sun,
  type Icon,
} from '@phosphor-icons/react'
import { AVATARS, type Avatar as AvatarId } from '@whoami/shared'
import { cn } from '@/lib/utils'
const icons: Record<AvatarId, Icon> = {
  planet: Planet,
  ghost: Ghost,
  rocket: Rocket,
  cat: Cat,
  leaf: Leaf,
  lightning: Lightning,
  crown: Crown,
  sun: Sun,
}
export function Avatar({
  avatar,
  className,
  large = false,
}: {
  avatar: AvatarId
  className?: string
  large?: boolean
}) {
  const Icon = icons[avatar]
  return (
    <span
      className={cn(
        'player-avatar',
        `avatar-${AVATARS.indexOf(avatar) % 4}`,
        large && 'avatar-large',
        className,
      )}
      aria-hidden="true"
    >
      <Icon size={large ? 38 : 23} weight="duotone" />
    </span>
  )
}

export const avatarLabels: Record<AvatarId, string> = {
  planet: 'Planeta',
  ghost: 'Fantasma',
  rocket: 'Foguete',
  cat: 'Gato',
  leaf: 'Folha',
  lightning: 'Raio',
  crown: 'Coroa',
  sun: 'Sol',
}
