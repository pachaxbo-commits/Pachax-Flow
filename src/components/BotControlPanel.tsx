import { Bot, Power, PowerOff, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { UserRole } from '../types'

type BotHealth = {
  ok: boolean
  botEnabled: boolean
  whatsappConnected: boolean
}

type BotStatus = 'checking' | 'online' | 'offline' | 'error' | 'not_configured'

const botApiUrl = (import.meta.env.VITE_BOT_API_URL || 'http://localhost:3010').replace(/\/$/, '')
const botAdminToken = import.meta.env.VITE_BOT_ADMIN_TOKEN || 'burgerlab-bot-local-2026-cambia-esto-antes-de-produccion'

export function BotControlPanel({ collapsed, userRole }: { collapsed: boolean; userRole: UserRole | 'demo' }) {
  const canControlBot = userRole === 'admin' || userRole === 'caja' || userRole === 'pedidos' || userRole === 'demo'
  const [health, setHealth] = useState<BotHealth | null>(null)
  const [status, setStatus] = useState<BotStatus>('checking')
  const [isBusy, setIsBusy] = useState(false)

  const statusLabel = useMemo(() => {
    if (status === 'not_configured') return 'Configurar bot'
    if (status === 'checking') return 'Revisando bot'
    if (status === 'offline') return 'Bot sin conexion'
    if (status === 'error') return 'Bot no responde'
    if (!health?.whatsappConnected) return 'WhatsApp sin QR'
    return health.botEnabled ? 'Bot encendido' : 'Bot apagado'
  }, [health, status])

  const statusDetail = useMemo(() => {
    if (status === 'not_configured') return 'Falta URL o token del bot.'
    if (status === 'offline' || status === 'error') return 'Inicia el bot local o revisa el servidor.'
    if (!health) return 'Consultando estado...'
    if (!health.whatsappConnected) return 'Escanea el QR para conectar WhatsApp.'
    return health.botEnabled ? 'Responde pedidos automaticamente.' : 'No respondera mensajes nuevos.'
  }, [health, status])

  async function refreshHealth() {
    if (!botApiUrl || !botAdminToken) {
      setStatus('not_configured')
      return
    }

    try {
      setStatus('checking')
      const response = await fetch(`${botApiUrl}/health`)
      if (!response.ok) throw new Error('Bot health failed')
      const nextHealth = await response.json() as BotHealth
      setHealth(nextHealth)
      setStatus('online')
    } catch {
      setHealth(null)
      setStatus('offline')
    }
  }

  async function setBotEnabled(enabled: boolean) {
    try {
      setIsBusy(true)
      const response = await fetch(`${botApiUrl}/bot/${enabled ? 'on' : 'off'}`, {
        method: 'POST',
        headers: {
          'x-bot-token': botAdminToken,
        },
      })
      if (!response.ok) throw new Error('Bot command failed')
      await refreshHealth()
    } catch {
      setStatus('error')
    } finally {
      setIsBusy(false)
    }
  }

  useEffect(() => {
    if (!canControlBot) return
    void refreshHealth()
    const interval = window.setInterval(() => void refreshHealth(), 30000)
    return () => window.clearInterval(interval)
  }, [canControlBot])

  if (!canControlBot) return null

  if (collapsed) {
    return (
      <button
        type="button"
        className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition ${
          health?.botEnabled && health?.whatsappConnected
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-white/80 bg-white/70 text-muted'
        }`}
        onClick={() => void refreshHealth()}
        title={statusLabel}
      >
        <Bot size={18} />
      </button>
    )
  }

  return (
    <div className="rounded-[1.5rem] border border-white/80 bg-white/72 p-4 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Bot size={16} className="text-accent" />
          Bot WhatsApp
        </div>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-line bg-white text-muted transition hover:text-ink"
          onClick={() => void refreshHealth()}
          title="Actualizar estado"
        >
          <RefreshCw size={14} />
        </button>
      </div>
      <div className="mt-3 text-sm font-semibold text-ink">{statusLabel}</div>
      <div className="mt-1 text-xs leading-5 text-muted">{statusDetail}</div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-success px-3 text-xs font-bold text-white transition hover:bg-[#315941] disabled:opacity-50"
          disabled={isBusy}
          onClick={() => void setBotEnabled(true)}
        >
          <Power size={13} />
          Encender
        </button>
        <button
          type="button"
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-white px-3 text-xs font-bold text-ink ring-1 ring-line transition hover:bg-accentWash disabled:opacity-50"
          disabled={isBusy}
          onClick={() => void setBotEnabled(false)}
        >
          <PowerOff size={13} />
          Apagar
        </button>
      </div>
    </div>
  )
}
