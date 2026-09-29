export default function Wordmark({ small = false }: { small?: boolean }) {
  return (
    <h1
      className={`font-display -skew-x-6 uppercase leading-none ${small ? 'text-xl' : 'text-5xl'}`}
    >
      <span className="text-ink">Casi</span>{' '}
      <span className="text-lime drop-shadow-[0_0_18px_rgba(198,244,50,0.3)]">Pádel</span>
    </h1>
  )
}
