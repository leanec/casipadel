export default function CourtBadge({ court }: { court: 1 | 2 }) {
  const one = court === 1
  return (
    <span
      className={`tnum inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
        one ? 'border-court/40 text-court' : 'border-cyan/40 text-cyan'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${one ? 'bg-court' : 'bg-cyan'}`} />
      Cancha {court}
    </span>
  )
}
