import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { UploadCloud, FileSpreadsheet, CheckCircle2, History, RotateCcw, AlertCircle } from 'lucide-react'
import { useAtendimentoIA } from '../../../contexts/AtendimentoIAContext'
import { formatDateTime } from '../statusConfig'

type ParsedSheet = {
  arquivoNome: string
  colunas: string[]
  linhas: Record<string, string>[]
}

export default function PersonaUpload() {
  const { personaVersions, addPersonaVersion, revertPersonaVersion } = useAtendimentoIA()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [parsed, setParsed] = useState<ParsedSheet | null>(null)
  const [erro, setErro] = useState('')
  const [confirmado, setConfirmado] = useState(false)
  const [salvando, setSalvando] = useState(false)

  function handleFile(file: File) {
    setErro('')
    setConfirmado(false)
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[firstSheetName]
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' })

        if (!rows.length) {
          setErro('A planilha está vazia ou não foi possível identificar as colunas.')
          setParsed(null)
          return
        }

        setParsed({
          arquivoNome: file.name,
          colunas: Object.keys(rows[0]),
          linhas: rows,
        })
      } catch {
        setErro('Não foi possível ler o arquivo. Verifique se é um .xlsx ou .csv válido.')
        setParsed(null)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  async function handleConfirmar() {
    if (!parsed) return
    setSalvando(true)
    await addPersonaVersion({
      arquivo_nome: parsed.arquivoNome,
      colunas: parsed.colunas,
      dados: parsed.linhas,
    })
    setSalvando(false)
    setConfirmado(true)
    setParsed(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-1">
        <FileSpreadsheet size={16} className="text-[#7A9B8E]" />
        <h3 className="text-sm font-semibold text-[#2C3E3A]">Persona do Agente</h3>
      </div>
      <p className="text-xs text-[#8B8B8B] mb-5">Envie a planilha (.xlsx ou .csv) com o nome do agente, tom de voz, instruções e regras de escalonamento.</p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full border-2 border-dashed border-[#F5F1EA] rounded-xl py-8 flex flex-col items-center gap-2 hover:border-[#7A9B8E] hover:bg-[#eef4f2]/30 transition-colors"
      >
        <UploadCloud size={24} className="text-[#7A9B8E]" />
        <p className="text-sm text-[#2C3E3A] font-medium">Clique para selecionar a planilha</p>
        <p className="text-xs text-[#8B8B8B]">.xlsx ou .csv</p>
      </button>

      {erro && (
        <div className="mt-4 flex items-center gap-2 bg-red-50 rounded-xl px-4 py-2.5 text-sm text-red-500">
          <AlertCircle size={15} />
          {erro}
        </div>
      )}

      {confirmado && (
        <div className="mt-4 flex items-center gap-2 bg-[#eef4f2] rounded-xl px-4 py-2.5 text-sm text-[#7A9B8E]">
          <CheckCircle2 size={15} />
          Persona atualizada com sucesso!
        </div>
      )}

      {parsed && (
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-[#2C3E3A]">
              Preview — {parsed.arquivoNome} ({parsed.linhas.length} linha{parsed.linhas.length !== 1 ? 's' : ''})
            </p>
          </div>
          <div className="border border-[#F5F1EA] rounded-xl overflow-hidden overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#F5F1EA] sticky top-0">
                <tr>
                  {parsed.colunas.map(col => (
                    <th key={col} className="text-left px-3 py-2 font-medium text-[#8B8B8B] whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F1EA]">
                {parsed.linhas.map((row, i) => (
                  <tr key={i}>
                    {parsed.colunas.map(col => (
                      <td key={col} className="px-3 py-2 text-[#2C3E3A] whitespace-nowrap">{row[col]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={handleConfirmar} disabled={salvando}
            className="mt-3 bg-[#7A9B8E] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#6a8a7e] transition-colors disabled:opacity-50">
            {salvando ? 'Salvando...' : 'Confirmar e aplicar persona'}
          </button>
        </div>
      )}

      {/* Histórico de versões */}
      <div className="mt-6 pt-5 border-t border-[#F5F1EA]">
        <p className="text-xs font-medium text-[#8B8B8B] flex items-center gap-1.5 mb-3">
          <History size={13} /> Histórico de versões
        </p>
        <div className="flex flex-col gap-2">
          {personaVersions.map(v => (
            <div key={v.id} className={`flex items-center justify-between rounded-xl px-4 py-3 ${v.ativa ? 'bg-[#eef4f2]' : 'bg-[#F5F1EA]'}`}>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#2C3E3A] flex items-center gap-2">
                  v{v.versao} — {v.arquivo_nome}
                  {v.ativa && (
                    <span className="flex items-center gap-1 text-[10px] bg-[#7A9B8E] text-white px-2 py-0.5 rounded-full font-medium">
                      <CheckCircle2 size={10} /> Ativa
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-[#8B8B8B]">
                  Enviado por {v.enviado_por} em {formatDateTime(v.enviado_em)} · {v.linhas} linhas
                </p>
              </div>
              {!v.ativa && (
                <button onClick={() => revertPersonaVersion(v.id)}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#7A9B8E] hover:underline shrink-0 ml-3">
                  <RotateCcw size={13} />
                  Reverter
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
