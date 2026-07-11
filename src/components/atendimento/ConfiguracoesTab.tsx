import IntegracaoIA from './config/IntegracaoIA'
import IntegracaoUazapi from './config/IntegracaoUazapi'
import PersonaUpload from './config/PersonaUpload'

export default function ConfiguracoesTab() {
  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <IntegracaoIA />
      <IntegracaoUazapi />
      <PersonaUpload />
    </div>
  )
}
