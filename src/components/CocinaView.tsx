import { BellRing, CheckCheck, ChefHat, Clock3, LoaderCircle } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { formatTime } from '../lib/format'
import { playKitchenNotification } from '../lib/sound'
import type { Order, OrderStatus } from '../types'
import { OrderTimer } from './OrderTimer'
import { Button } from './ui/Button'
import { Panel } from './ui/Panel'

function emphasizeText(input: string) {
  return input.toUpperCase()
}

export function CocinaView({
  orders,
  onAdvanceStatus,
}: {
  orders: Order[]
  onAdvanceStatus: (orderId: string, status: OrderStatus) => Promise<boolean>
}) {
  const [notice, setNotice] = useState<string | null>(null)
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null)
  const [audioUnlocked, setAudioUnlocked] = useState(false)
  const lastPendingSequence = useRef<number>(0)
  const hideNoticeTimeout = useRef<number | null>(null)

  // Cocina active orders: pending, preparing, or ready (legacy compatibility)
  const activeOrders = useMemo(() => {
    return orders
      .filter((order) => order.status === 'pending' || order.status === 'preparing' || order.status === 'ready')
      .sort((left, right) => {
        const leftTime = new Date(left.createdAt).getTime()
        const rightTime = new Date(right.createdAt).getTime()
        return leftTime - rightTime
      })
  }, [orders])

  useEffect(() => {
    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextCtor) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAudioUnlocked(true)
      return
    }
    const context = new AudioContextCtor()
    if (context.state === 'running') {
      setAudioUnlocked(true)
    }
    void context.close()
  }, [])

  const handleUnlockAudio = () => {
    playKitchenNotification()
    setAudioUnlocked(true)
  }

  useEffect(() => {
    const latestPending = orders
      .filter((order) => order.status === 'pending')
      .reduce((highest, order) => Math.max(highest, order.sequence), 0)

    if (latestPending > lastPendingSequence.current) {
      lastPendingSequence.current = latestPending

      if (latestPending !== 0) {
        const matchingOrder = orders.find((order) => order.sequence === latestPending)
        const message = `Nuevo pedido ${matchingOrder?.displayNumber ?? ''} recibido`
        const showNoticeTimeout = window.setTimeout(() => setNotice(message), 0)
        playKitchenNotification()

        if (hideNoticeTimeout.current) {
          window.clearTimeout(hideNoticeTimeout.current)
        }

        hideNoticeTimeout.current = window.setTimeout(() => {
          setNotice(null)
          hideNoticeTimeout.current = null
        }, 3200)

        return () => window.clearTimeout(showNoticeTimeout)
      }
    }

    if (latestPending === 0) {
      lastPendingSequence.current = 0
    }
  }, [orders])

  return (
    <section className="space-y-5">
      <Panel className="border-white/80 bg-white/68 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">Cocina</p>
            <h2 className="mt-2 font-serif text-4xl text-ink">Cola única de pedidos activos</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Visualización optimizada para tablets a distancia. Toca "ENTREGADO" para despachar.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {notice ? (
              <div className="rounded-[1.6rem] border border-accent/15 bg-white px-5 py-4 text-sm font-semibold text-accent shadow-card">
                {notice}
              </div>
            ) : null}
            {!audioUnlocked ? (
              <Button tone="primary" className="shadow-lg shadow-accent/15 flex items-center gap-2" onClick={handleUnlockAudio}>
                <BellRing size={16} className="animate-bounce" />
                Activar Sonido
              </Button>
            ) : (
              <div className="text-xs font-semibold text-success flex items-center gap-2 bg-successSoft border border-[#cfe2d6] px-4 py-3 rounded-[1.4rem]">
                <CheckCheck size={14} />
                Sonido activo
              </div>
            )}
          </div>
        </div>
      </Panel>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
        {activeOrders.map((order) => {
          const isLegacy = order.status === 'preparing' || order.status === 'ready'
          const bgBorderColor = isLegacy
            ? 'border-warning/30 bg-amber-50/20'
            : 'border-white/80 bg-white/70'

          return (
            <article
              key={order.id}
              className={`rounded-[2rem] border p-5 shadow-card transition-all duration-200 hover:shadow-lg ${bgBorderColor}`}
            >
              {/* Header: Nro Pedido y Reloj */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-5xl font-black tracking-tight text-ink">
                    {order.displayNumber}
                  </div>
                  <div className="mt-2 text-xs text-muted">
                    Ingreso: {formatTime(order.createdAt)}
                  </div>
                </div>

                <div className="shrink-0 rounded-[1.2rem] border border-line bg-white/90 px-4 py-2.5 text-right shadow-insetSoft">
                  <div className="flex items-center justify-end gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                    <Clock3 size={12} />
                    Tiempo
                  </div>
                  <div className="mt-0.5 text-2xl font-bold text-ink">
                    <OrderTimer createdAt={order.createdAt} stoppedAt={order.readyAt} />
                  </div>
                </div>
              </div>

              {/* Modalidad y Pago */}
              <div className="mt-4 flex flex-wrap gap-2">
                {/* Source Badge */}
                {order.orderSource === 'whatsapp' ? (
                  <span className="inline-flex items-center rounded-xl bg-green-100 border border-green-200 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-green-800">
                    WHATSAPP
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-xl bg-gray-100 border border-gray-200 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-gray-800">
                    LOCAL
                  </span>
                )}

                {/* Modalidad Badge */}
                {order.fulfillmentType === 'delivery' ? (
                  <span className="inline-flex items-center rounded-xl bg-orange-100 border border-orange-200 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-orange-800">
                    DELIVERY
                  </span>
                ) : order.fulfillmentType === 'pickup' ? (
                  <span className="inline-flex items-center rounded-xl bg-amber-100 border border-amber-200 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-amber-800">
                    RETIRO
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-xl bg-indigo-100 border border-indigo-200 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-indigo-800">
                    MESA {order.tableInfo || 'N/D'}
                  </span>
                )}

                {/* Pago Badge */}
                {order.paymentStatus === 'paid' ? (
                  <span className="inline-flex items-center rounded-xl bg-emerald-100 border border-emerald-200 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-emerald-800">
                    PAGADO · {String(order.paymentMethod || order.payment.method).toUpperCase()}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-xl bg-red-100 border border-red-200 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-red-800">
                    PENDIENTE
                  </span>
                )}
              </div>

              {/* Customer info for delivery/whatsapp */}
              {(order.customerName || order.customerPhone || order.deliveryAddress) ? (
                <div className="mt-3 rounded-[1.2rem] border border-line bg-canvas/30 px-3 py-2 text-xs text-ink space-y-1">
                  {order.customerName ? <div><span className="font-bold text-muted">Cliente:</span> {order.customerName}</div> : null}
                  {order.customerPhone ? <div><span className="font-bold text-muted">Teléfono:</span> {order.customerPhone}</div> : null}
                  {order.deliveryAddress ? <div><span className="font-bold text-muted">Dirección:</span> {order.deliveryAddress}</div> : null}
                </div>
              ) : null}

              {/* Items List */}
              <div className="mt-5 space-y-3.5">
                {order.items.map((item) => (
                  <div key={item.id} className="rounded-[1.4rem] border border-line bg-white/90 p-3.5 shadow-sm">
                    <div className="text-xl font-bold leading-6 text-ink">
                      {item.quantity}x {item.name}
                    </div>

                    {item.modifiers.extras.length || item.modifiers.options.length ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {item.modifiers.extras.map((extra) => (
                          <span
                            key={extra.id}
                            className="rounded-lg border border-accent/10 bg-accentWash px-2.5 py-1 text-xs font-extrabold tracking-wide text-accent"
                          >
                            + {emphasizeText(extra.name)}
                          </span>
                        ))}
                        {item.modifiers.options.map((option) => (
                          <span
                            key={option}
                            className="rounded-lg border border-lineStrong bg-canvas px-2.5 py-1 text-xs font-extrabold tracking-wide text-ink"
                          >
                            {emphasizeText(option)}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {item.modifiers.note ? (
                      <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm font-black tracking-wide text-rose-800">
                        OBS: {emphasizeText(item.modifiers.note)}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              {/* Contextual Action Button */}
              <div className="mt-6">
                {(() => {
                  const buttonText =
                    order.fulfillmentType === 'table'
                      ? 'ENTREGADO'
                      : order.fulfillmentType === 'pickup'
                        ? 'LISTO PARA RETIRAR'
                        : 'LISTO PARA DESPACHAR'

                  const nextStatus: OrderStatus =
                    order.fulfillmentType === 'table'
                      ? 'delivered'
                      : order.fulfillmentType === 'pickup'
                        ? 'ready_for_pickup'
                        : 'ready_for_dispatch'

                  return (
                    <Button
                      fullWidth
                      size="lg"
                      tone="success"
                      className="py-4 text-lg font-black tracking-wide shadow-md shadow-success/10 rounded-2xl"
                      disabled={busyOrderId === order.id}
                      onClick={async () => {
                        setBusyOrderId(order.id)
                        const ok = await onAdvanceStatus(order.id, nextStatus)
                        if (ok) {
                          setNotice(`Pedido ${order.displayNumber} listo/despachado con éxito`)
                          const resetTimeout = window.setTimeout(() => setNotice(null), 2500)
                          return () => window.clearTimeout(resetTimeout)
                        }
                        setBusyOrderId(null)
                      }}
                    >
                      {busyOrderId === order.id ? (
                        <LoaderCircle size={20} className="animate-spin" />
                      ) : (
                        <>{buttonText}</>
                      )}
                    </Button>
                  )
                })()}
              </div>
            </article>
          )
        })}

        {activeOrders.length === 0 ? (
          <div className="col-span-full rounded-[2rem] border border-dashed border-lineStrong bg-white/70 p-12 text-center text-lg text-muted">
            <ChefHat size={48} className="mx-auto text-accentWash mb-4 animate-pulse" />
            No hay comandas activas pendientes en este momento.
          </div>
        ) : null}
      </div>
    </section>
  )
}
