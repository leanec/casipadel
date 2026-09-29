export default function CourtBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-night" />
      {/* brillo lima sutil desde arriba */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 70% at 50% -10%, rgba(198,244,50,0.07), transparent 55%)',
        }}
      />
      {/* cancha estilizada: perímetro, red y líneas de servicio */}
      <div className="absolute left-1/2 top-20 h-[64%] w-[88%] -translate-x-1/2 rounded-2xl border border-white/[0.09]">
        <div className="absolute left-0 right-0 top-1/2 h-px bg-white/[0.14]" />
        <div className="absolute bottom-1/4 left-1/2 top-1/4 w-px bg-white/[0.09]" />
        <div className="absolute left-0 right-0 top-1/4 h-px bg-white/[0.07]" />
        <div className="absolute bottom-1/4 left-0 right-0 h-px bg-white/[0.07]" />
      </div>
      {/* viñeta inferior */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(140% 100% at 50% 115%, rgba(3,6,15,0.9), transparent 55%)',
        }}
      />
    </div>
  )
}
