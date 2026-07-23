export const botApiUrl = (import.meta.env.VITE_BOT_API_URL || 'http://localhost:3010').replace(/\/$/, '')
export const botAdminToken = import.meta.env.VITE_BOT_ADMIN_TOKEN || 'burgerlab-bot-local-2026-cambia-esto-antes-de-produccion'

export type BotHealth = {
  ok: boolean
  botEnabled: boolean
  acceptingOrders?: boolean
  autoRepliesEnabled?: boolean
  whatsappConnected: boolean
}

export type BotSettings = {
  acceptingOrders: boolean
  autoRepliesEnabled: boolean
  deliveryGroupName: string
  deliveryGroupId: string
  ownerAlertGroupName: string
  ownerAlertChatId: string
  closedMessage: string
  pausedOrdersMessage: string
  qrPaymentMessage: string
  deliveryPricingMessage: string
  humanHelpMessage: string
  personality: string
}

export type WhatsappGroup = {
  id: string
  name: string
  participants: number
}

export async function fetchBotHealth(): Promise<BotHealth> {
  const response = await fetch(`${botApiUrl}/health`)
  if (!response.ok) throw new Error('Bot health failed')
  return response.json()
}

export async function setBotAcceptingOrders(accepting: boolean) {
  const response = await fetch(`${botApiUrl}/orders/accepting/${accepting ? 'on' : 'off'}`, {
    method: 'POST',
    headers: {
      'x-bot-token': botAdminToken,
    },
  })

  if (!response.ok) {
    throw new Error('No se pudo actualizar recepcion de pedidos.')
  }

  return response.json()
}

export async function setBotEnabled(enabled: boolean) {
  const response = await fetch(`${botApiUrl}/bot/${enabled ? 'on' : 'off'}`, {
    method: 'POST',
    headers: {
      'x-bot-token': botAdminToken,
    },
  })

  if (!response.ok) throw new Error('No se pudo cambiar el estado del bot.')
  return response.json()
}

export async function fetchBotSettings(): Promise<BotSettings> {
  const response = await fetch(`${botApiUrl}/settings`, {
    headers: {
      'x-bot-token': botAdminToken,
    },
  })
  if (!response.ok) throw new Error('No se pudo leer la configuracion del bot.')
  const payload = await response.json()
  return payload.settings as BotSettings
}

export async function saveBotSettings(settings: Partial<BotSettings>): Promise<BotSettings> {
  const response = await fetch(`${botApiUrl}/settings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-bot-token': botAdminToken,
    },
    body: JSON.stringify(settings),
  })
  if (!response.ok) throw new Error('No se pudo guardar la configuracion del bot.')
  const payload = await response.json()
  return payload.settings as BotSettings
}

export async function fetchWhatsappGroups(): Promise<WhatsappGroup[]> {
  const response = await fetch(`${botApiUrl}/whatsapp/groups`, {
    headers: {
      'x-bot-token': botAdminToken,
    },
  })
  if (!response.ok) throw new Error('No se pudieron leer los grupos de WhatsApp.')
  const payload = await response.json()
  return payload.groups as WhatsappGroup[]
}

export async function fetchWhatsappQr(): Promise<{ connected: boolean; qrDataUrl?: string }> {
  const response = await fetch(`${botApiUrl}/whatsapp/qr`, {
    headers: {
      'x-bot-token': botAdminToken,
    },
  })
  if (!response.ok) throw new Error('No hay QR disponible todavia.')
  return response.json()
}

export async function logoutWhatsappSession() {
  const response = await fetch(`${botApiUrl}/whatsapp/logout`, {
    method: 'POST',
    headers: {
      'x-bot-token': botAdminToken,
    },
  })
  if (!response.ok) throw new Error('No se pudo cerrar la sesion de WhatsApp.')
  return response.json()
}

export async function notifyBotOrderConfirmed(orderId: string, delayMinutes: number) {
  if (!botApiUrl || !botAdminToken) {
    throw new Error('Bot no configurado.')
  }

  const response = await fetch(`${botApiUrl}/orders/${orderId}/confirmed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-bot-token': botAdminToken,
    },
    body: JSON.stringify({ delayMinutes }),
  })

  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw new Error(message || 'El bot no pudo avisar al cliente.')
  }
}
