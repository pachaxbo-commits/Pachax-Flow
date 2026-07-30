import { useState } from 'react'
import { Printer, X, Check, FileText, Zap, DollarSign, Copy, ShieldCheck } from 'lucide-react'
import { getPrinterSettings, savePrinterSettings, type PrinterSettings } from '../lib/printerSettings'
import { enviarARawBt, ticketPruebaBase64 } from '../lib/escpos'

export function PrinterSettingsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const [settings, setSettings] = useState<PrinterSettings>(getPrinterSettings)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [testSuccess, setTestSuccess] = useState(false)

  if (!isOpen) return null

  const handleSave = () => {
    savePrinterSettings(settings)
    setSavedSuccess(true)
    setTimeout(() => {
      setSavedSuccess(false)
      onClose()
    }, 1000)
  }

  const handleTestPrint = () => {
    const base64 = ticketPruebaBase64()
    enviarARawBt(base64)
    setTestSuccess(true)
    setTimeout(() => setTestSuccess(false), 2500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
              <Printer size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">Ajustes de Impresora Térmica</h2>
              <p className="text-xs text-slate-400">Configuración ESC/POS estilo Loyverse POS</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Options */}
        <div className="mt-6 space-y-5">
          {/* Formato de Papel */}
          <div>
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              <FileText size={14} className="text-indigo-400" /> Formato / Ancho del Papel Térmico
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSettings((s) => ({ ...s, paperWidth: '58mm' }))}
                className={`py-3 px-4 rounded-2xl border text-sm font-bold flex items-center justify-between transition ${
                  settings.paperWidth === '58mm'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <span>58 mm (2 pulgadas)</span>
                {settings.paperWidth === '58mm' && <Check size={16} className="text-indigo-400" />}
              </button>
              <button
                type="button"
                onClick={() => setSettings((s) => ({ ...s, paperWidth: '80mm' }))}
                className={`py-3 px-4 rounded-2xl border text-sm font-bold flex items-center justify-between transition ${
                  settings.paperWidth === '80mm'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <span>80 mm (3 pulgadas)</span>
                {settings.paperWidth === '80mm' && <Check size={16} className="text-indigo-400" />}
              </button>
            </div>
          </div>

          {/* Impresión Automática */}
          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Zap size={14} className="text-amber-400" /> Disparadores Automáticos (Auto-Print)
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/50 border border-slate-800 cursor-pointer hover:bg-slate-800 transition">
              <div>
                <span className="text-sm font-semibold text-white block">Auto-imprimir Ticket de Cliente</span>
                <span className="text-xs text-slate-400">Imprime el recibo automáticamente al confirmar cobro en Caja</span>
              </div>
              <input
                type="checkbox"
                checked={settings.autoPrintCustomerReceipt}
                onChange={(e) => setSettings((s) => ({ ...s, autoPrintCustomerReceipt: e.target.checked }))}
                className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/50 border border-slate-800 cursor-pointer hover:bg-slate-800 transition">
              <div>
                <span className="text-sm font-semibold text-white block">Auto-imprimir Comanda de Cocina</span>
                <span className="text-xs text-slate-400">Envía la comanda a la impresora de cocina al solicitar pedido</span>
              </div>
              <input
                type="checkbox"
                checked={settings.autoPrintKitchenTicket}
                onChange={(e) => setSettings((s) => ({ ...s, autoPrintKitchenTicket: e.target.checked }))}
                className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/50 border border-slate-800 cursor-pointer hover:bg-slate-800 transition">
              <div>
                <span className="text-sm font-semibold text-white block flex items-center gap-1.5">
                  <DollarSign size={14} className="text-emerald-400" /> Apertura Automática de Gaveta de Dinero
                </span>
                <span className="text-xs text-slate-400">Envía pulso ESC/POS para abrir el cajón metálico en cobro efectivo</span>
              </div>
              <input
                type="checkbox"
                checked={settings.kickCashDrawer}
                onChange={(e) => setSettings((s) => ({ ...s, kickCashDrawer: e.target.checked }))}
                className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
              />
            </label>
          </div>

          {/* Copias */}
          <div>
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              <Copy size={14} className="text-sky-400" /> Número de Copias por Ticket
            </label>
            <div className="flex items-center gap-3">
              {[1, 2, 3].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setSettings((s) => ({ ...s, copies: num }))}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition ${
                    settings.copies === num
                      ? 'bg-sky-600/20 border-sky-500 text-white'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {num} {num === 1 ? 'Copia' : 'Copias'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-8 pt-5 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleTestPrint}
            className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 transition"
          >
            <Printer size={16} />
            {testSuccess ? '¡Comando Enviado!' : 'Probar Impresión'}
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="py-3 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition"
          >
            {savedSuccess ? <Check size={16} /> : <ShieldCheck size={16} />}
            {savedSuccess ? '¡Guardado!' : 'Guardar Ajustes'}
          </button>
        </div>
      </div>
    </div>
  )
}
