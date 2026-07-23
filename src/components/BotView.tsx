import {
  Bot,
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  MessageSquareText,
  PauseCircle,
  PlayCircle,
  Power,
  PowerOff,
  QrCode,
  RefreshCw,
  Save,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  botApiUrl,
  botAdminToken,
  fetchBotHealth,
  fetchBotSettings,
  fetchWhatsappGroups,
  fetchWhatsappQr,
  logoutWhatsappSession,
  saveBotSettings,
  setBotAcceptingOrders,
  setBotEnabled,
  type BotHealth,
  type BotSettings,
  type WhatsappGroup,
} from '../lib/botApi'
import { Button } from './ui/Button'
import { Panel } from './ui/Panel'

const emptySettings: BotSettings = {
  acceptingOrders: true,
  autoRepliesEnabled: true,
  deliveryGroupName: '',
  deliveryGroupId: '',
  ownerAlertGroupName: '',
  ownerAlertChatId: '',
  closedMessage: '',
  pausedOrdersMessage: '',
  qrPaymentMessage: '',
  deliveryPricingMessage: '',
  humanHelpMessage: '',
  personality: '',
}

export function BotView() {
  const [health, setHealth] = useState<BotHealth | null>(null)
  const [settings, setSettings] = useState<BotSettings>(emptySettings)
  const [groups, setGroups] = useState<WhatsappGroup[]>([])
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const isConfigured = Boolean(botApiUrl && botAdminToken)
  const statusLabel = useMemo(() => {
    if (!health) return 'Consultando'
    if (!health.whatsappConnected) return 'WhatsApp sin conectar'
    if (!health.botEnabled) return 'Bot apagado'
    if (health.acceptingOrders === false) return 'Pedidos pausados'
    if (health.autoRepliesEnabled === false) return 'Respuestas pausadas'
    return 'Bot operativo'
  }, [health])

  async function refreshAll() {
    if (!isConfigured) return
    try {
      setError('')
      const [nextHealth, nextSettings] = await Promise.all([
        fetchBotHealth(),
        fetchBotSettings(),
      ])
      setHealth(nextHealth)
      setSettings(nextSettings)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo consultar el bot.')
    }
  }

  async function runAction(action: () => Promise<void>, successMessage: string) {
    try {
      setBusy(true)
      setError('')
      await action()
      setNotice(successMessage)
      await refreshAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la accion.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void refreshAll()
  }, [])

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] border border-white/80 bg-white/75 p-5 shadow-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.24em] text-accent">Bot WhatsApp</div>
            <h1 className="mt-2 text-2xl font-black text-ink">Control y configuracion</h1>
            <p className="mt-1 text-sm text-muted">Estado actual: <span className="font-bold text-ink">{statusLabel}</span></p>
          </div>
          <Button tone="secondary" onClick={() => void refreshAll()} disabled={busy}>
            <RefreshCw size={16} />
            Actualizar
          </Button>
        </div>
        {notice ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</div> : null}
        {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</div> : null}
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.1fr]">
        <Panel className="p-5">
          <SectionTitle icon={Power} title="Operacion" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ActionButton label="Encender bot" icon={Power} disabled={busy} onClick={() => runAction(() => setBotEnabled(true).then(() => undefined), 'Bot encendido.')} />
            <ActionButton label="Apagar bot" icon={PowerOff} disabled={busy} onClick={() => runAction(() => setBotEnabled(false).then(() => undefined), 'Bot apagado.')} />
            <ActionButton
              label={settings.acceptingOrders ? 'Pausar pedidos' : 'Reanudar pedidos'}
              icon={settings.acceptingOrders ? PauseCircle : PlayCircle}
              disabled={busy}
              onClick={() => runAction(() => setBotAcceptingOrders(!settings.acceptingOrders).then(() => undefined), 'Recepcion de pedidos actualizada.')}
            />
            <ActionButton
              label={settings.autoRepliesEnabled ? 'Pausar respuestas' : 'Reanudar respuestas'}
              icon={settings.autoRepliesEnabled ? PauseCircle : PlayCircle}
              disabled={busy}
              onClick={() => runAction(() => saveBotSettings({ autoRepliesEnabled: !settings.autoRepliesEnabled }).then(() => undefined), 'Respuestas automaticas actualizadas.')}
            />
          </div>
        </Panel>

        <Panel className="p-5">
          <SectionTitle icon={QrCode} title="Sesion de WhatsApp" />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <ActionButton
              label="Ver QR"
              icon={QrCode}
              disabled={busy}
              onClick={() => runAction(async () => {
                const qr = await fetchWhatsappQr()
                setQrDataUrl(qr.qrDataUrl || '')
              }, 'QR consultado.')}
            />
            <ActionButton
              label="Cerrar sesion"
              icon={KeyRound}
              disabled={busy}
              onClick={() => {
                if (!window.confirm('Esto cerrara la sesion actual de WhatsApp y pedira un QR nuevo. Continuar?')) return
                void runAction(() => logoutWhatsappSession().then(() => undefined), 'Sesion cerrada. Espera unos segundos y consulta el QR.')
              }}
            />
            <ActionButton
              label="Leer grupos"
              icon={Users}
              disabled={busy}
              onClick={() => runAction(async () => {
                setGroups(await fetchWhatsappGroups())
              }, 'Grupos actualizados.')}
            />
          </div>
          {qrDataUrl ? (
            <div className="mt-4 rounded-2xl border border-line bg-white p-4">
              <img alt="QR WhatsApp" className="mx-auto max-h-72 rounded-xl" src={qrDataUrl} />
            </div>
          ) : null}
        </Panel>
      </div>

      <Panel className="p-5">
        <SectionTitle icon={Users} title="Grupos y derivaciones" />
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Field label="Grupo de delivery" value={settings.deliveryGroupName} onChange={(value) => setSettings({ ...settings, deliveryGroupName: value, deliveryGroupId: '' })} />
          <GroupSelect
            label="Seleccionar grupo delivery"
            groups={groups}
            value={settings.deliveryGroupId}
            onChange={(group) => setSettings({ ...settings, deliveryGroupId: group.id, deliveryGroupName: group.name })}
          />
          <Field label="Grupo soporte/intervencion" value={settings.ownerAlertGroupName} onChange={(value) => setSettings({ ...settings, ownerAlertGroupName: value, ownerAlertChatId: '' })} />
          <GroupSelect
            label="Seleccionar grupo soporte"
            groups={groups}
            value={settings.ownerAlertChatId}
            onChange={(group) => setSettings({ ...settings, ownerAlertChatId: group.id, ownerAlertGroupName: group.name })}
          />
        </div>
      </Panel>

      <Panel className="p-5">
        <SectionTitle icon={MessageSquareText} title="Mensajes del bot" />
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <TextArea label="Mensaje fuera de horario" value={settings.closedMessage} onChange={(value) => setSettings({ ...settings, closedMessage: value })} />
          <TextArea label="Mensaje pedidos pausados" value={settings.pausedOrdersMessage} onChange={(value) => setSettings({ ...settings, pausedOrdersMessage: value })} />
          <TextArea label="Mensaje pago QR" value={settings.qrPaymentMessage} onChange={(value) => setSettings({ ...settings, qrPaymentMessage: value })} />
          <TextArea label="Mensaje delivery/tarifario" value={settings.deliveryPricingMessage} onChange={(value) => setSettings({ ...settings, deliveryPricingMessage: value })} />
          <TextArea label="Mensaje intervencion humana" value={settings.humanHelpMessage} onChange={(value) => setSettings({ ...settings, humanHelpMessage: value })} />
          <TextArea label="Personalidad del bot" value={settings.personality} onChange={(value) => setSettings({ ...settings, personality: value })} />
        </div>
        <div className="mt-5 flex justify-end">
          <Button disabled={busy} onClick={() => void runAction(() => saveBotSettings(settings).then(() => undefined), 'Configuracion guardada.')}>
            {busy ? <LoaderCircle className="animate-spin" size={16} /> : <Save size={16} />}
            Guardar configuracion
          </Button>
        </div>
      </Panel>
    </div>
  )
}

function SectionTitle({ icon: Icon, title }: { icon: typeof Bot; title: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-muted">
      <Icon size={16} className="text-accent" />
      {title}
    </div>
  )
}

function ActionButton({ icon: Icon, label, disabled, onClick }: { icon: typeof Bot; label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-bold text-ink transition hover:bg-accentWash disabled:opacity-50">
      <Icon size={16} />
      {label}
    </button>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-wider text-muted">{label}</span>
      <input className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-wider text-muted">{label}</span>
      <textarea className="mt-1 min-h-24 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function GroupSelect({ label, groups, value, onChange }: { label: string; groups: WhatsappGroup[]; value: string; onChange: (group: WhatsappGroup) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-wider text-muted">{label}</span>
      <select className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent" value={value} onChange={(event) => {
        const group = groups.find((item) => item.id === event.target.value)
        if (group) onChange(group)
      }}>
        <option value="">Elegir grupo...</option>
        {groups.map((group) => (
          <option key={group.id} value={group.id}>{group.name} ({group.participants})</option>
        ))}
      </select>
      {value ? <span className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-700"><CheckCircle2 size={12} /> Grupo seleccionado</span> : null}
    </label>
  )
}
