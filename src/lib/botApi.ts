export const botApiUrl = (import.meta.env.VITE_BOT_API_URL || 'http://localhost:3010').replace(/\/$/, '')
export const botAdminToken = import.meta.env.VITE_BOT_ADMIN_TOKEN || 'burgerlab-bot-local-2026-cambia-esto-antes-de-produccion'

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
