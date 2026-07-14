import HelpHint from '../components/atendimento/config/HelpHint'

export default function HelpHintPreview() {
  return (
    <div style={{ padding: 60, display: 'flex', gap: 60, fontFamily: 'sans-serif' }}>
      <span id="hint-url" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        URL do servidor
        <HelpHint
          title="Onde encontrar a URL do servidor"
          href="https://docs.uazapi.com"
          hrefLabel="Abrir docs da UazAPI"
          steps={['Passo 1', 'Passo 2', 'Passo 3']}
        />
      </span>
      <span id="hint-token" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        Token da instância
        <HelpHint
          title="Como pegar o token"
          href="https://docs.uazapi.com"
          hrefLabel="Abrir docs"
          steps={['Passo 1', 'Passo 2']}
        />
      </span>
      <span id="hint-chave" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        Chave de API
        <HelpHint
          title="Como pegar a chave da Anthropic"
          href="https://console.anthropic.com/settings/keys"
          hrefLabel="Abrir console"
          steps={['Passo 1', 'Passo 2', 'Passo 3']}
        />
      </span>
    </div>
  )
}
