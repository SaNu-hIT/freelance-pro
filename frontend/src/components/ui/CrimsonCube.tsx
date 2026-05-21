export function CrimsonCube({ size = 100 }: { size?: number }) {
  const half = size / 2

  return (
    <div
      className="cube-container"
      style={{ width: size, height: size, perspective: size * 4 }}
    >
      <div className="cube" style={{ width: size, height: size }}>
        <div
          className="cube-face cube-front"
          style={{ width: size, height: size, transform: `translateZ(${half}px)` }}
        />
        <div
          className="cube-face cube-back"
          style={{ width: size, height: size, transform: `rotateY(180deg) translateZ(${half}px)` }}
        />
        <div
          className="cube-face cube-right"
          style={{ width: size, height: size, transform: `rotateY(90deg) translateZ(${half}px)` }}
        />
        <div
          className="cube-face cube-left"
          style={{ width: size, height: size, transform: `rotateY(-90deg) translateZ(${half}px)` }}
        />
        <div
          className="cube-face cube-top"
          style={{ width: size, height: size, transform: `rotateX(90deg) translateZ(${half}px)` }}
        />
        <div
          className="cube-face cube-bottom"
          style={{ width: size, height: size, transform: `rotateX(-90deg) translateZ(${half}px)` }}
        />
      </div>
    </div>
  )
}
