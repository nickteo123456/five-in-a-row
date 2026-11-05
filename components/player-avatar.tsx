import { Avatar, AvatarFallback } from '@/components/ui/avatar'

// Picks a stable colour from the name, so no image service is needed
function hueForName(name: string): number {
  return Array.from(name).reduce((hash, letter) => (hash * 31 + letter.codePointAt(0)!) % 360, 7)
}

export function PlayerAvatar({ name, className }: { name: string; className?: string }) {
  const hue = hueForName(name)

  return (
    <Avatar className={className}>
      <AvatarFallback
        className="font-mono font-bold text-white"
        style={{ backgroundColor: `hsl(${hue} 55% 35%)` }}
      >
        {Array.from(name.trim())[0]?.toUpperCase() || '?'}
      </AvatarFallback>
    </Avatar>
  )
}
