import { useRef, useState } from 'react'
import { HelpCircle, ExternalLink } from 'lucide-react'

type HelpHintProps = {
  title: string
  steps: string[]
  href: string
  hrefLabel?: string
  /** Print de tela do passo a passo — opcional; ainda não temos imagens reais, então por
   * enquanto os chamadores não passam essa prop. Basta preencher aqui quando tiver o arquivo. */
  imageSrc?: string
  imageAlt?: string
}

export default function HelpHint({ title, steps, href, hrefLabel, imageSrc, imageAlt }: HelpHintProps) {
  const [aberto, setAberto] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function abrirAgora() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setAberto(true)
  }

  function fecharComAtraso() {
    closeTimer.current = setTimeout(() => setAberto(false), 150)
  }

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={abrirAgora}
      onMouseLeave={fecharComAtraso}
    >
      <button
        type="button"
        aria-expanded={aberto}
        aria-label={`Como preencher: ${title}`}
        onClick={() => setAberto(v => !v)}
        onFocus={abrirAgora}
        onBlur={fecharComAtraso}
        className="text-[#8B8B8B] hover:text-[#7A9B8E] transition-colors"
      >
        <HelpCircle size={14} />
      </button>

      {aberto && (
        <div
          role="tooltip"
          className="absolute z-20 top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-white border border-[#F5F1EA] rounded-xl shadow-lg p-4 text-left"
          onMouseEnter={abrirAgora}
          onMouseLeave={fecharComAtraso}
        >
          <p className="text-xs font-semibold text-[#2C3E3A] mb-2">{title}</p>

          {imageSrc && (
            <img src={imageSrc} alt={imageAlt ?? title} className="w-full rounded-lg border border-[#F5F1EA] mb-2" />
          )}

          <ol className="list-decimal list-inside space-y-1 text-[11px] text-[#8B8B8B]">
            {steps.map((step, i) => <li key={i}>{step}</li>)}
          </ol>

          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center gap-1 text-[11px] font-medium text-[#7A9B8E] hover:underline"
          >
            <ExternalLink size={11} />
            {hrefLabel ?? 'Abrir painel'}
          </a>
        </div>
      )}
    </span>
  )
}
