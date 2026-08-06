import { useState, useEffect } from 'react'
import {
  Printer,
  Play,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileText,
  RotateCcw,
  Zap,
  ShieldAlert,
  Sliders,
  Database,
} from 'lucide-react'
import { PrintEngineService } from '../services/printing/printEngineService'
import { DiagnosticPrinterAdapter, type DiagnosticMockBehavior } from '../services/printing/diagnosticPrinterAdapter'
import { runPrintEngineTestSuite } from '../services/printing/__tests__/printEngine.test'
import type { PrintJob, PrintJobPayload } from '../types/printing'

export function PrinterDiagnosticView() {
  const [mockBehavior, setMockBehavior] = useState<DiagnosticMockBehavior>('success_transmitted')
  const [testSuiteOutput, setTestSuiteOutput] = useState<{ passed: number; failed: number; results: string[] } | null>(null)
  const [recentJobs, setRecentJobs] = useState<PrintJob[]>([])
  const [selectedJob, setSelectedJob] = useState<PrintJob | null>(null)
  const [isTestRunning, setIsTestRunning] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const engine = PrintEngineService.getInstance()

  useEffect(() => {
    // Update adapter behavior when user changes select
    const adapter = new DiagnosticPrinterAdapter(mockBehavior)
    engine.registerAdapter(adapter)
  }, [mockBehavior])

  const handleRunTests = async () => {
    setIsTestRunning(true)
    setStatusMessage('Ejecutando suite de 15 pruebas automatizadas...')
    try {
      const res = await runPrintEngineTestSuite()
      setTestSuiteOutput(res)
      setStatusMessage(`Suite completada: ${res.passed} PASARON / ${res.failed} FALLARON`)
    } catch (err: any) {
      setStatusMessage(`Error ejecutando suite: ${err.message}`)
    } finally {
      setIsTestRunning(false)
    }
  }

  const samplePayload: PrintJobPayload = {
    payloadSchemaVersion: 1,
    templateVersion: 'v1.0-80mm',
    restaurantName: 'PACHAX Flow Restaurant',
    branchName: 'Sucursal Central - Bolivia',
    branchAddress: 'Av. Principal #450, Santa Cruz',
    branchPhone: '77123456',
    orderId: 'ord-demo-88',
    sequenceNumber: 24,
    displayNumber: '#024',
    fulfillmentType: 'table',
    tableInfo: 'Mesa 5',
    customerName: 'Juan Pérez',
    items: [
      { name: 'Hamburguesa Doble Carne y Queso', basePrice: 42, quantity: 2, lineTotal: 84, modifiersText: ['Sin Cebolla', 'Extra Salsa'] },
      { name: 'Papas Fritas Medianas', basePrice: 15, quantity: 1, lineTotal: 15 },
    ],
    subtotal: 99,
    discountTotal: 0,
    taxTotal: 0,
    deliveryFee: 0,
    grandTotal: 99,
    paymentMethod: 'cash',
    cashReceived: 100,
    changeAmount: 1,
    isCopy: false,
    copies: 1,
    createdIso: new Date().toISOString(),
  }

  const handleCreateTestReceipt = async () => {
    try {
      setStatusMessage('Enviando recibo de prueba...')
      const job = await engine.submitPrintRequest({
        targetType: 'receipt',
        payload: samplePayload,
        idempotencyKey: `test-receipt-${Date.now()}`,
      })
      setRecentJobs((prev) => [job, ...prev])
      setSelectedJob(job)
      setStatusMessage(`Recibo encolado en estado: ${job.status.toUpperCase()}`)
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`)
    }
  }

  const handleCreateKitchenTicket = async () => {
    try {
      setStatusMessage('Enviando comanda de cocina...')
      const job = await engine.submitPrintRequest({
        targetType: 'kitchen_ticket',
        payload: samplePayload,
        idempotencyKey: `test-kitchen-${Date.now()}`,
      })
      setRecentJobs((prev) => [job, ...prev])
      setSelectedJob(job)
      setStatusMessage(`Comanda encolada en estado: ${job.status.toUpperCase()}`)
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`)
    }
  }

  const handleDrawerKick = async () => {
    try {
      setStatusMessage('Enviando pulso de apertura de gaveta...')
      const job = await engine.kickCashDrawer({
        userUid: 'cajero-test-uid',
        terminalId: engine.queueManager.terminalId,
        reason: 'Prueba de diagnóstico de gaveta',
      })
      setRecentJobs((prev) => [job, ...prev])
      setSelectedJob(job)
      setStatusMessage(`Apertura de gaveta ejecutada: ${job.status.toUpperCase()}`)
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`)
    }
  }

  const handleResolveUnknown = async (type: 'printed' | 'not_printed' | 'reprint_requested') => {
    if (!selectedJob) return
    try {
      const resolved = await engine.resolveUnknownJob(selectedJob.id, {
        type,
        resolvedByUid: 'operador-test-uid',
        resolvedAtIso: new Date().toISOString(),
        reason: 'Resolución manual desde panel de diagnóstico',
      })
      setSelectedJob(resolved)
      setRecentJobs((prev) => prev.map((j) => (j.id === resolved.id ? resolved : j)))
      setStatusMessage(`Trabajo resuelto como: ${type.toUpperCase()}`)
    } catch (err: any) {
      setStatusMessage(`Error al resolver: ${err.message}`)
    }
  }

  const handleRequestReprint = async () => {
    if (!selectedJob) return
    try {
      const copyJob = await engine.requestReprint(
        {
          originalJobId: selectedJob.id,
          requestedByUid: 'supervisor-uid',
          reason: 'Papel atascado en prueba',
          terminalId: engine.queueManager.terminalId,
        },
        selectedJob
      )
      setRecentJobs((prev) => [copyJob, ...prev])
      setSelectedJob(copyJob)
      setStatusMessage(`Reimpresión generada como trabajo copia: ${copyJob.id}`)
    } catch (err: any) {
      setStatusMessage(`Error al reimprimir: ${err.message}`)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Printer size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Panel de Diagnóstico — Motor de Impresión</h1>
            <p className="text-xs text-slate-500 font-medium">Etapa 4B.1 — Verificación aislada del núcleo y colas duraderas</p>
          </div>
        </div>

        <button
          onClick={handleRunTests}
          disabled={isTestRunning}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition disabled:opacity-50"
        >
          {isTestRunning ? <RefreshCw className="animate-spin" size={18} /> : <Play size={18} />}
          Ejecutar Suite (15 Pruebas)
        </button>
      </div>

      {statusMessage && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <Zap size={16} className="text-blue-600" />
          {statusMessage}
        </div>
      )}

      {/* Simulator Control Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <Sliders size={18} className="text-blue-600" />
            Comportamiento Simulado
          </div>
          <p className="text-xs text-slate-500">Selecciona el tipo de respuesta del hardware para probar el comportamiento de la cola:</p>
          <select
            value={mockBehavior}
            onChange={(e) => setMockBehavior(e.target.value as DiagnosticMockBehavior)}
            className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-slate-50 text-slate-800 focus:outline-none focus:border-blue-500"
          >
            <option value="success_transmitted">Transmisión Exitosa (Transmitted)</option>
            <option value="success_confirmed">Confirmación Hardware Real (Confirmed)</option>
            <option value="error_pre_transmit">Error Pre-Transmisión (Safe to Retry)</option>
            <option value="error_during_transmit">Error Durante Transmisión (Unsafe &rarr; Unknown)</option>
            <option value="timeout">Timeout de Escritura (Unsafe &rarr; Unknown)</option>
            <option value="ambiguous_unknown">Estado Ambiguo de Salida (Unknown)</option>
            <option value="printer_unavailable">Impresora No Disponible (Failed)</option>
          </select>
        </div>

        {/* Action Triggers */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3 md:col-span-2 flex flex-col justify-center">
          <div className="text-slate-800 font-bold text-sm mb-1 flex items-center gap-2">
            <FileText size={18} className="text-blue-600" />
            Disparadores de Impresión Abstracta (Sin UI Acoplada)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={handleCreateTestReceipt}
              className="px-4 py-3 rounded-2xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              <FileText size={16} /> Emitir Recibo (80mm)
            </button>
            <button
              onClick={handleCreateKitchenTicket}
              className="px-4 py-3 rounded-2xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              <Printer size={16} /> Comanda Cocina
            </button>
            <button
              onClick={handleDrawerKick}
              className="px-4 py-3 rounded-2xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              <Zap size={16} /> Abrir Gaveta
            </button>
          </div>
        </div>
      </div>

      {/* Automated Test Suite Results */}
      {testSuiteOutput && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-600" />
              Resultados de la Suite de Verificación de Arquitectura
            </h2>
            <span className="text-xs font-extrabold px-3 py-1 bg-slate-100 rounded-full text-slate-700">
              {testSuiteOutput.passed} Aprobadas / {testSuiteOutput.failed} Fallidas
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto p-1 text-xs">
            {testSuiteOutput.results.map((res, i) => (
              <div
                key={i}
                className={`p-2.5 rounded-xl font-mono text-[11px] border ${
                  res.startsWith('✅') ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                {res}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Queue & Job Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Queue List */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <Database size={18} className="text-blue-600" />
              Trabajos Recientes en Cola ({recentJobs.length})
            </h3>
          </div>

          {recentJobs.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center italic">No hay trabajos procesados en esta sesión.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {recentJobs.map((job) => (
                <div
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                  className={`p-3.5 rounded-2xl border text-xs cursor-pointer transition flex items-center justify-between ${
                    selectedJob?.id === job.id ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="font-bold text-slate-800 flex items-center gap-2">
                      <span>{job.targetType.toUpperCase()}</span>
                      <span className="text-[10px] text-slate-400 font-normal">{job.id.slice(0, 18)}...</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Terminal: {job.terminalId} | Intentos: {job.attempts}/{job.maxAttempts}
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                      job.status === 'transmitted' || job.status === 'confirmed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : job.status === 'unknown'
                        ? 'bg-amber-100 text-amber-800'
                        : job.status === 'failed'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {job.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Job Inspector */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
            <ShieldAlert size={18} className="text-blue-600" />
            Inspector de Trabajo e Inmutabilidad
          </h3>

          {!selectedJob ? (
            <p className="text-xs text-slate-400 py-8 text-center italic">Selecciona un trabajo de la lista para inspeccionar.</p>
          ) : (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1 font-mono text-[11px]">
                <div><strong className="text-slate-700">ID:</strong> {selectedJob.id}</div>
                <div><strong className="text-slate-700">IdempotencyKey:</strong> {selectedJob.idempotencyKey}</div>
                <div><strong className="text-slate-700">Estado:</strong> <span className="font-bold uppercase text-blue-600">{selectedJob.status}</span></div>
                <div><strong className="text-slate-700">Es Copia:</strong> {selectedJob.payload.isCopy ? 'SÍ (COPIA)' : 'NO'}</div>
                {selectedJob.lastError && <div className="text-rose-600"><strong className="text-rose-800">Error:</strong> {selectedJob.lastError}</div>}
              </div>

              {/* Actions for Unknown Jobs */}
              {selectedJob.status === 'unknown' && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
                  <div className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                    <AlertTriangle size={16} /> Resolución Manual de Estado Ambiguo
                  </div>
                  <p className="text-[11px] text-amber-800">
                    El trabajo terminó en estado ambiguo (desconexión o timeout). Confirma la resolución física:
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={() => handleResolveUnknown('printed')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]"
                    >
                      Sí se imprimió
                    </button>
                    <button
                      onClick={() => handleResolveUnknown('not_printed')}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px]"
                    >
                      No se imprimió
                    </button>
                  </div>
                </div>
              )}

              {/* Authorized Reprint Button */}
              {['transmitted', 'confirmed', 'resolved'].includes(selectedJob.status) && (
                <button
                  onClick={handleRequestReprint}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm"
                >
                  <RotateCcw size={14} /> Solicitar Reimpresión Autorizada (Copia)
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
