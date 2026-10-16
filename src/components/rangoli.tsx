/** A rangoli drawn in rings of petals: the hero's decoration. */
export function Rangoli({ className }: { className?: string }) {
  const ring = (count: number, distance: number, rx: number, ry: number, fill: string) =>
    Array.from({ length: count }, (_, i) => (
      <ellipse key={i} cx="0" cy={-distance} rx={rx} ry={ry} fill={fill} transform={`rotate(${(360 / count) * i})`} />
    ));
  const dots = (count: number, distance: number, r: number, fill: string) =>
    Array.from({ length: count }, (_, i) => (
      <circle key={i} cx="0" cy={-distance} r={r} fill={fill} transform={`rotate(${(360 / count) * i + 180 / count})`} />
    ));
  return (
    <svg viewBox="-100 -100 200 200" className={className} aria-hidden="true">
      {dots(36, 94, 2.6, "#2e7d32")}
      {ring(16, 72, 11, 20, "#e91e63")}
      {dots(16, 72, 3, "#fff8f0")}
      {ring(12, 50, 12, 19, "#ff9933")}
      {ring(8, 30, 10, 16, "#ffc233")}
      {dots(8, 46, 3.4, "#7a1022")}
      <circle r="16" fill="#2e7d32" />
      <circle r="9" fill="#fff8f0" />
      <circle r="4" fill="#e91e63" />
    </svg>
  );
}
