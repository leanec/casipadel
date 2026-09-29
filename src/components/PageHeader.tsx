import { useNavigate } from 'react-router-dom'

export default function PageHeader({
  title,
  sub,
  back = true,
}: {
  title: string
  sub?: string
  back?: boolean
}) {
  const navigate = useNavigate()
  return (
    <div className="flex items-center gap-3">
      {back && (
        <button
          onClick={() => navigate(-1)}
          className="glass flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
          aria-label="Volver"
        >
          ←
        </button>
      )}
      <div className="min-w-0">
        <h1 className="font-display truncate text-2xl uppercase leading-none">{title}</h1>
        {sub !== undefined && <p className="mt-1 text-xs text-mute">{sub}</p>}
      </div>
    </div>
  )
}
