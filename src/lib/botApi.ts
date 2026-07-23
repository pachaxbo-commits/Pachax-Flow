export const botApiUrl = (import.meta.env.VITE_BOT_API_URL || 'http://localhost:3010').replace(/\/$/, '')
export const botAdminToken = import.meta.env.VITE_BOT_ADMIN_TOKEN || 'burgerlab-bot-local-2026-cambia-esto-antes-de-produccion'

export type BotHealth = {
  ok: boolean
  botEnabled: boolean
  acceptingOrders?: boolean
  whatsappConnected: boolean
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
