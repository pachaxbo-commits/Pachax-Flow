import type { FulfillmentType, OrderSource, OrderStatus } from '../../types'

const styles: Record<OrderStatus, string> = {
  pending: 'border border-[#f0cfbf] bg-[#fff3ec] text-[#9c4d2a]',
  preparing: 'border border-[#ead7ad] bg-warningSoft text-warning',
  ready: 'border border-[#cfe2d6] bg-successSoft text-success',
  ready_for_pickup: 'border border-[#c5d9e8] bg-[#eef5fb] text-[#2a6b9c]',
  ready_for_dispatch: 'border border-[#c5d9e8] bg-[#eef5fb] text-[#2a6b9c]',
  out_for_delivery: 'border border-[#d8cde8] bg-[#f3eefb] text-[#6b3fa0]',
  delivered: 'border border-[#d5dbeb] bg-[#eef2fb] text-[#39518a]',
  cancelled: 'border border-[#ecc6c6] bg-[#fdf3f3] text-[#c93b3b]',
}

const labels: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  preparing: 'En preparacion',
  ready: 'Listo',
  ready_for_pickup: 'Listo para retirar',
  ready_for_dispatch: 'Listo para despachar',
  out_for_delivery: 'En delivery',
  delivered: 'Entregado',
  cancelled: 'Anulado',
}

export function StatusPill({ status }: { status: OrderStatus }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[status] ?? styles.pending}`}>{labels[status] ?? status}</span>
}

const sourceLabels: Record<OrderSource, string> = {
  local: 'LOCAL',
  whatsapp: 'WHATSAPP',
}

const sourceStyles: Record<OrderSource, string> = {
  local: 'bg-slate-100 border-slate-200 text-slate-700',
  whatsapp: 'bg-green-100 border-green-200 text-green-800',
}

export function SourceBadge({ source }: { source: OrderSource }) {
  return (
    <span className={`inline-flex items-center rounded-xl border px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide ${sourceStyles[source] ?? sourceStyles.local}`}>
      {sourceLabels[source] ?? 'LOCAL'}
    </span>
  )
}

const fulfillmentLabels: Record<FulfillmentType, string> = {
  table: 'MESA',
  pickup: 'RETIRO',
  delivery: 'DELIVERY',
}

const fulfillmentStyles: Record<FulfillmentType, string> = {
  table: 'bg-indigo-100 border-indigo-200 text-indigo-800',
  pickup: 'bg-cyan-100 border-cyan-200 text-cyan-800',
  delivery: 'bg-orange-100 border-orange-200 text-orange-800',
}

export function FulfillmentBadge({ type, tableInfo }: { type: FulfillmentType; tableInfo?: string }) {
  return (
    <span className={`inline-flex items-center rounded-xl border px-3.5 py-1.5 text-sm font-extrabold uppercase tracking-wide ${fulfillmentStyles[type] ?? fulfillmentStyles.table}`}>
      {type === 'table' ? `MESA ${tableInfo || 'N/D'}` : fulfillmentLabels[type]}
    </span>
  )
}

export function PaymentBadge({ paymentStatus, paymentMethod }: { paymentStatus: 'paid' | 'pending'; paymentMethod?: string | null }) {
  if (paymentStatus === 'paid') {
    return (
      <span className="inline-flex items-center rounded-xl bg-emerald-100 border border-emerald-200 px-3.5 py-1.5 text-sm font-extrabold uppercase tracking-wide text-emerald-800">
        PAGADO · {String(paymentMethod || 'EFECTIVO').toUpperCase()}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center rounded-xl bg-red-100 border border-red-200 px-3.5 py-1.5 text-sm font-extrabold uppercase tracking-wide text-red-800">
      PENDIENTE DE PAGO
    </span>
  )
}
