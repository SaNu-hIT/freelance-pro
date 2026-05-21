interface MorphBlobProps {
  color?: string
  size?: number
  top?: string
  right?: string
  bottom?: string
  left?: string
  delay?: string
}

export function MorphBlob({
  color = '#8B0000',
  size = 400,
  top,
  right,
  bottom,
  left,
  delay = '0s',
}: MorphBlobProps) {
  return (
    <div
      className="blob"
      style={{
        width: size,
        height: size,
        background: color,
        top,
        right,
        bottom,
        left,
        animationDelay: delay,
      }}
    />
  )
}
