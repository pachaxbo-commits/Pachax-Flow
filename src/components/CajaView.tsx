import {
  ChevronDown,
  CookingPot,
  LoaderCircle,
  MessageSquareText,
  Minus,
  Plus,
  Trash2,
  DollarSign,
  Ban,
  FileEdit,
  Store,
  Utensils,
  ShoppingBag,
  Coins,
  QrCode,
  Shuffle,
  CheckCircle2,
  Printer,
  AlertCircle,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { formatCurrency } from '../lib/format'
import type { CartItem, CatalogCategory, PaymentMethod, PaymentSummary, Product, Order, OrderStatus, FulfillmentType } from '../types'
import { Button } from './ui/Button'
import { Panel } from './ui/Panel'
import { StatusPill, SourceBadge, FulfillmentBadge, PaymentBadge } from './ui/StatusPill'
import { playKitchenNotification } from '../lib/sound'

function buildCartItem(product: Product): CartItem {
  return {
    lineId: crypto.randomUUID(),
    productId: product.id,
    quantity: 1,
    modifiers: {
      extras: [],
      options: [],
      note: '',
    },
  }
}

function clampCurrency(value: string) {
  const parsed = Number(value.replace(/[^0-9.]/g, ''))
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

function isImageUrl(value: string) {
  return value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:')
}

function ProductVisual({ image, alt, badge }: { image: string; alt: string; badge?: string }) {
  return (
    <div className="relative h-32 overflow-hidden 2xl:h-36">
      {isImageUrl(image) ? (
        <img alt={alt} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" src={image} />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#fff1e8,#f7d7c8)] text-7xl">{image}</div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
      {badge ? (
        <div className="absolute bottom-4 right-4 rounded-full bg-accent px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-accent/15">
          {badge}
        </div>
      ) : null}
    </div>
  )
}

export function CajaView({
  nextOrderNumber,
  categories,
  products,
  orders,
  userRole,
  userId,
  userName,
  onSubmitOrder,
  onConfirmPayment,
  onCancelOrder,
  onDeleteOrder,
  onUpdateOrder,
  onSetOrderStatus,
}: {
  nextOrderNumber: string
  categories: CatalogCategory[]
  products: Product[]
  orders: Order[]
  userRole: string
  userId: string
  userName: string
  onSubmitOrder: (input: {
    cartItems: CartItem[]
    productsById: Map<string, Product>
    payment: PaymentSummary
    paymentStatus: 'paid' | 'pending'
    paymentMethod: PaymentMethod | null
    expectedPaymentMethod: PaymentMethod | null
    orderSource: 'local' | 'whatsapp'
    fulfillmentType: 'table' | 'pickup' | 'delivery'
    tableInfo?: string
    customerName?: string
    customerPhone?: string
    deliveryAddress?: string
    createdBy?: string
  }) => Promise<boolean>
  onConfirmPayment: (orderId: string, input: {
    paymentStatus: 'paid'
    paymentMethod: PaymentMethod
    payment: PaymentSummary
    paidBy: string
  }) => Promise<void>
  onCancelOrder: (orderId: string, cancelledBy: string, reason?: string) => Promise<boolean>
  onDeleteOrder: (orderId: string) => Promise<void>
  onUpdateOrder: (orderId: string, input: {
    cartItems: CartItem[]
    productsById: Map<string, Product>
    payment: PaymentSummary
    paymentStatus: 'paid' | 'pending'
    paymentMethod: PaymentMethod | null
    expectedPaymentMethod: PaymentMethod | null
    orderSource: 'local' | 'whatsapp'
    fulfillmentType: 'table' | 'pickup' | 'delivery'
    tableInfo?: string
    customerName?: string
    customerPhone?: string
    deliveryAddress?: string
  }) => Promise<void>
  onSetOrderStatus: (orderId: string, status: OrderStatus, estimatedDelay?: number) => Promise<void>
}) {
  // Main view mode: either POS catalog or orders list
  const [viewMode, setViewMode] = useState<'new_order' | 'orders_list'>('new_order')
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [globalDelay, setGlobalDelay] = useState<number>(10)
  // Edit Order State
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null)

  // Order Details / Fields State
  const [orderSource, setOrderSource] = useState<'local' | 'whatsapp'>(
    userRole === 'pedidos' ? 'whatsapp' : 'local'
  )
  const [fulfillmentType, setFulfillmentType] = useState<'table' | 'pickup' | 'delivery'>(
    userRole === 'pedidos' ? 'pickup' : 'table'
  )
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')

  // Catalog State
  const visibleCategories = useMemo(
    () => categories.filter((category) => category.isActive && category.isVisible).sort((left, right) => left.sortOrder - right.sortOrder),
    [categories],
  )
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(visibleCategories[0]?.id ?? '')
  const [activeTab, setActiveTab] = useState<'catalog' | 'cart'>('catalog')
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [expandedLineId, setExpandedLineId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Checkout Payment State
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending'>('paid')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>('cash')
  const [expectedPaymentMethod, setExpectedPaymentMethod] = useState<PaymentMethod | null>(null)
  const [tableInfo, setTableInfo] = useState('')
  const [cashReceivedInput, setCashReceivedInput] = useState('')
  const [cashSplitInput, setCashSplitInput] = useState('')

  // Fast Payment Modal State
  const [payingOrder, setPayingOrder] = useState<Order | null>(null)
  const [fastPayMethod, setFastPayMethod] = useState<PaymentMethod>('cash')
  const [fastCashReceived, setFastCashReceived] = useState('')
  const [fastCashSplit, setFastCashSplit] = useState('')

  // Cancel Order Modal State
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  // Confirm WhatsApp Order Delay State
  const [confirmingDelayOrderId, setConfirmingDelayOrderId] = useState<string | null>(null)

  // Print ticket and sub-filter state
  const [printedOrder, setPrintedOrder] = useState<Order | null>(null)
  const [whatsappSubFilter, setWhatsappSubFilter] = useState<'all' | 'pending' | 'paid'>('all')

  useEffect(() => {
    if (printedOrder) {
      const clearPrintedOrder = () => setPrintedOrder(null)
      window.addEventListener('afterprint', clearPrintedOrder, { once: true })
      const timer = setTimeout(() => {
        window.print()
      }, 500)
      const fallbackTimer = setTimeout(clearPrintedOrder, 120000)
      return () => {
        clearTimeout(timer)
        clearTimeout(fallbackTimer)
        window.removeEventListener('afterprint', clearPrintedOrder)
      }
    }
  }, [printedOrder])

  const activeCategory = visibleCategories.some((category) => category.id === selectedCategoryId)
    ? selectedCategoryId
    : (visibleCategories[0]?.id ?? '')

  const visibleProducts = useMemo(
    () =>
      products
        .filter(
          (product) =>
            product.categoryId === activeCategory &&
            product.isActive &&
            product.isVisible &&
            product.availability === 'available',
        )
        .sort((left, right) => left.sortOrder - right.sortOrder),
    [activeCategory, products],
  )

  const productsById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products])

  const cartTotal = cartItems.reduce((sum, item) => {
    const product = productsById.get(item.productId)

    if (!product) {
      return sum
    }

    const extrasTotal = item.modifiers.extras.reduce((acc, extra) => acc + extra.price, 0)
    return sum + (product.price + extrasTotal) * item.quantity
  }, 0)

  const totalUnits = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  // Cash splitter calculations
  const cashReceived = clampCurrency(cashReceivedInput)
  const mixedCashAmount = Math.min(cartTotal, clampCurrency(cashSplitInput))
  const qrAmount = paymentMethod === 'mixed' ? Math.max(0, cartTotal - mixedCashAmount) : paymentMethod === 'qr' ? cartTotal : 0
  const cashAmount = paymentMethod === 'cash' ? cartTotal : paymentMethod === 'mixed' ? mixedCashAmount : 0
  const change = paymentMethod === 'cash' || paymentMethod === 'mixed' ? Math.max(0, cashReceived - cashAmount) : 0
  const isPaymentValid =
    paymentStatus === 'pending'
      ? cartTotal > 0
      : paymentMethod === 'qr'
        ? cartTotal > 0
        : paymentMethod === 'cash'
          ? cashReceived >= cartTotal
          : paymentMethod === 'mixed'
            ? cashAmount > 0 && qrAmount > 0 && cashReceived >= cashAmount
            : false

  const isDeliveryInfoValid =
    customerName.trim() !== '' &&
    (fulfillmentType === 'delivery'
      ? customerPhone.trim() !== '' && deliveryAddress.trim() !== ''
      : orderSource === 'whatsapp'
        ? customerPhone.trim() !== ''
        : true)

  const buildPaymentSummary = (): PaymentSummary => ({
    method: paymentMethod || 'cash',
    cashAmount: paymentStatus === 'pending' ? 0 : cashAmount,
    qrAmount: paymentStatus === 'pending' ? 0 : qrAmount,
    cashReceived: paymentStatus === 'pending' ? 0 : (paymentMethod === 'qr' ? 0 : cashReceived),
    change: paymentStatus === 'pending' ? 0 : change,
  })

  // Fast payment modal computations
  const fastCashReceivedVal = clampCurrency(fastCashReceived)
  const fastCashSplitVal = clampCurrency(fastCashSplit)
  const fastQrAmount = fastPayMethod === 'mixed' ? Math.max(0, (payingOrder?.total || 0) - fastCashSplitVal) : fastPayMethod === 'qr' ? (payingOrder?.total || 0) : 0
  const fastCashAmount = fastPayMethod === 'cash' ? (payingOrder?.total || 0) : fastPayMethod === 'mixed' ? fastCashSplitVal : 0
  const fastChange = fastPayMethod === 'cash' || fastPayMethod === 'mixed' ? Math.max(0, fastCashReceivedVal - fastCashAmount) : 0
  const isFastPaymentValid =
    fastPayMethod === 'qr'
      ? (payingOrder?.total || 0) > 0
      : fastPayMethod === 'cash'
        ? fastCashReceivedVal >= (payingOrder?.total || 0)
        : fastPayMethod === 'mixed'
          ? fastCashAmount > 0 && fastQrAmount > 0 && fastCashReceivedVal >= fastCashAmount
          : false

  const buildFastPaymentSummary = (): PaymentSummary => ({
    method: fastPayMethod,
    cashAmount: fastCashAmount,
    qrAmount: fastQrAmount,
    cashReceived: fastPayMethod === 'qr' ? 0 : fastCashReceivedVal,
    change: fastChange,
  })

  // Filtered Orders & Badge count
  const pendingPaymentCount = useMemo(() => {
    return orders.filter((order) => {
      if (userRole === 'pedidos') {
        return order.createdBy === userId && order.paymentStatus === 'pending' && order.status !== 'cancelled'
      }
      return order.paymentStatus === 'pending' && order.status !== 'cancelled'
    }).length
  }, [orders, userRole, userId])

  // Escuchador para sonar alerta si entra un nuevo pedido de WhatsApp
  const lastPendingWhatsappSequence = useRef<number>(0)

  useEffect(() => {
    const pendingWhatsappOrders = orders.filter(
      (order) => order.orderSource === 'whatsapp' && order.status === 'pending'
    )
    
    const highestSequence = pendingWhatsappOrders.reduce(
      (highest, order) => Math.max(highest, order.sequence), 
      0
    )

    if (highestSequence > lastPendingWhatsappSequence.current) {
      const prevSequence = lastPendingWhatsappSequence.current
      lastPendingWhatsappSequence.current = highestSequence

      // Alerta sonora solo si es un pedido genuino recién ingresado
      if (highestSequence !== 0 && prevSequence !== 0) {
        const latestOrder = pendingWhatsappOrders.find((o) => o.sequence === highestSequence)
        if (latestOrder && new Date().getTime() - new Date(latestOrder.createdAt).getTime() < 15000) {
          playKitchenNotification()
        }
      }
    }

    if (highestSequence === 0) {
      lastPendingWhatsappSequence.current = 0
    }
  }, [orders])

  const todayKey = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }, [])

  const getOrderDayKey = (createdAtStr: string) => {
    const d = new Date(createdAtStr)
    if (isNaN(d.getTime())) return ''
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const isOrderDeliveryDelayed = (order: Order) => {
    if (order.status === 'delivered' || order.status === 'cancelled') return false
    if (!order.estimatedDelay) return false
    const dueAt = new Date(order.createdAt).getTime() + order.estimatedDelay * 60 * 1000
    return Date.now() > dueAt
  }

  // Pedidos pendientes de días anteriores para alerta
  const pastPendingOrders = useMemo(() => {
    return orders.filter((order) => {
      const orderDay = getOrderDayKey(order.createdAt)
      const isPast = orderDay && orderDay < todayKey
      const isPending = order.status !== 'delivered' && order.status !== 'cancelled'
      return isPast && isPending
    })
  }, [orders, todayKey])

  // Columnas para el Tablero Operativo (Solo hoy)
  const finalizadosOrders = useMemo(() => {
    return orders
      .filter((order) => getOrderDayKey(order.createdAt) === todayKey)
      .filter((order) => order.status === 'delivered' || order.status === 'cancelled')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 30) // Limitar a los últimos 30 pedidos finalizados del día para mejor rendimiento
  }, [orders, todayKey])

  const whatsappOrders = useMemo(() => {
    return orders
      .filter((order) => getOrderDayKey(order.createdAt) === todayKey)
      .filter((order) => 
        (order.orderSource === 'whatsapp' || order.fulfillmentType === 'delivery') &&
        order.status !== 'delivered' &&
        order.status !== 'cancelled'
      )
      .filter((order) => {
        if (whatsappSubFilter === 'pending') return order.paymentStatus === 'pending'
        if (whatsappSubFilter === 'paid') return order.paymentStatus === 'paid'
        return true
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [orders, todayKey, whatsappSubFilter])

  const localesOrders = useMemo(() => {
    return orders
      .filter((order) => getOrderDayKey(order.createdAt) === todayKey)
      .filter((order) => 
        order.orderSource === 'local' &&
        order.fulfillmentType !== 'delivery' &&
        order.status !== 'delivered' &&
        order.status !== 'cancelled'
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [orders, todayKey])

  const updateItem = (lineId: string, updater: (item: CartItem) => CartItem) => {
    setCartItems((currentItems) => currentItems.map((item) => (item.lineId === lineId ? updater(item) : item)))
  }

  const removeItem = (lineId: string) => {
    setCartItems((currentItems) => currentItems.filter((item) => item.lineId !== lineId))
    setExpandedLineId((currentLineId) => (currentLineId === lineId ? null : currentLineId))
  }

  // Load order back to cart for editing
  const handleEditOrder = (order: Order) => {
    setEditingOrderId(order.id)
    const loadedCartItems: CartItem[] = order.items.map((item) => {
      const product = products.find((p) => p.name === item.name)
      return {
        lineId: item.id || crypto.randomUUID(),
        productId: product ? product.id : 'unknown',
        quantity: item.quantity,
        modifiers: item.modifiers,
      }
    })
    setCartItems(loadedCartItems)
    setOrderSource(order.orderSource || 'local')
    setFulfillmentType(order.fulfillmentType || (order.orderType === 'delivery' ? 'delivery' : 'table'))
    setTableInfo(order.tableInfo || '')
    setCustomerName(order.customerName || '')
    setCustomerPhone(order.customerPhone || '')
    setDeliveryAddress(order.deliveryAddress || '')
    setPaymentStatus(order.paymentStatus)
    setPaymentMethod(order.paymentMethod || null)
    setExpectedPaymentMethod(order.expectedPaymentMethod || null)

    if (order.paymentStatus === 'paid' && order.payment) {
      setCashReceivedInput(String(order.payment.cashReceived || ''))
      setCashSplitInput(String(order.payment.cashAmount || ''))
    } else {
      setCashReceivedInput('')
      setCashSplitInput('')
    }
    setViewMode('new_order')
    setActiveTab('cart')
    setShowCheckoutModal(true)
  }

  const handleDiscardEdit = () => {
    setEditingOrderId(null)
    setCartItems([])
    setFulfillmentType(userRole === 'pedidos' ? 'pickup' : 'table')
    setOrderSource(userRole === 'pedidos' ? 'whatsapp' : 'local')
    setCustomerName('')
    setCustomerPhone('')
    setDeliveryAddress('')
    setTableInfo('')
    setPaymentStatus('paid')
    setPaymentMethod('cash')
    setExpectedPaymentMethod(null)
    setCashReceivedInput('')
    setCashSplitInput('')
    setShowCheckoutModal(false)
  }

  return (
    <div className={`space-y-4 ${cartItems.length > 0 && viewMode === 'new_order' ? 'xl:pr-[480px]' : ''}`}>
      {/* Top View Mode Switcher */}
      <div className="flex flex-wrap justify-between items-center gap-4 border-b border-line pb-4">
        <div className="flex gap-2 bg-white/60 p-1.5 rounded-2xl border border-white/80 shadow-insetSoft">
          <button
            type="button"
            className={`px-5 py-2.5 rounded-xl text-xs font-black tracking-wider transition ${
              viewMode === 'new_order'
                ? 'bg-ink text-white shadow-card'
                : 'text-muted hover:text-ink'
            }`}
            onClick={() => setViewMode('new_order')}
          >
            NUEVO PEDIDO
          </button>
          <button
            type="button"
            className={`relative px-5 py-2.5 rounded-xl text-xs font-black tracking-wider transition ${
              viewMode === 'orders_list'
                ? 'bg-ink text-white shadow-card'
                : 'text-muted hover:text-ink'
            }`}
            onClick={() => setViewMode('orders_list')}
          >
            PEDIDOS
            {pendingPaymentCount > 0 ? (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-accent text-[9px] font-black text-white shadow-lg animate-bounce">
                {pendingPaymentCount}
              </span>
            ) : null}
          </button>
        </div>

        {pendingPaymentCount > 0 ? (
          <button
            type="button"
            className="flex items-center gap-2 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 px-4 py-2 text-xs font-extrabold tracking-wider hover:bg-rose-100 transition shadow-sm animate-pulse"
            onClick={() => {
              setViewMode('orders_list')
              setWhatsappSubFilter('pending')
            }}
          >
            <DollarSign size={14} />
            <span>COBROS PENDIENTES ({pendingPaymentCount})</span>
          </button>
        ) : null}
      </div>

      {/* Responsive layout selector for mobile */}
      <div className="flex gap-2 rounded-2xl bg-white/70 p-1.5 shadow-insetSoft border border-white/80 xl:hidden">
        <button
          className={`flex-1 rounded-[1.15rem] py-3 text-center text-sm font-bold transition ${
            activeTab === 'catalog'
              ? 'bg-ink text-white shadow-card'
              : 'text-muted hover:text-ink'
          }`}
          onClick={() => setActiveTab('catalog')}
        >
          Productos
        </button>
        <button
          className={`flex-1 rounded-[1.15rem] py-3 text-center text-sm font-bold transition flex items-center justify-center gap-2 ${
            activeTab === 'cart'
              ? 'bg-ink text-white shadow-card'
              : 'text-muted hover:text-ink'
          }`}
          onClick={() => setActiveTab('cart')}
        >
          <span>Carrito</span>
          {cartItems.length > 0 ? (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-black text-white">
              {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          ) : null}
        </button>
      </div>

      <div className="w-full space-y-5">
        
        {/* Main Panel Section */}
        <section className="w-full space-y-5">
          {viewMode === 'new_order' ? (
            <>
              {/* POS Categories & Catalog */}
              <div className="flex flex-wrap gap-2 pb-2 overflow-x-auto no-scrollbar">
                {visibleCategories.map((category) => {
                  const isActive = category.id === activeCategory

                  return (
                    <button
                      key={category.id}
                      className={`px-4 py-2 rounded-full text-xs font-black tracking-wider transition shrink-0 shadow-sm ${
                        isActive
                          ? 'bg-ink text-white'
                          : 'bg-white border border-line text-ink hover:bg-panel'
                      }`}
                      onClick={() => setSelectedCategoryId(category.id)}
                    >
                      <span className="mr-1">{category.emoji}</span>
                      {category.name.toUpperCase()}
                    </button>
                  )
                })}
              </div>

              <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-3 min-[1850px]:grid-cols-4">
                {visibleProducts.map((product) => (
                  <Panel
                    key={product.id}
                    className="group overflow-hidden border-slate-800 bg-[#1e1e2d] text-white transition duration-200 hover:-translate-y-1 hover:shadow-float flex flex-col justify-between rounded-2xl min-h-[230px]"
                  >
                    <ProductVisual alt={product.name} badge={product.badge} image={product.image} />

                    <div className="p-3 flex-1 flex flex-col justify-between space-y-2.5">
                      <div>
                        <h3 className="text-sm font-bold text-white tracking-wide truncate">{product.name}</h3>
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-400 line-clamp-2 min-h-[32px]">{product.description || 'Sin descripción'}</p>
                      </div>
                      
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <div className="text-sm font-black text-amber-500">{formatCurrency(product.price)}</div>
                        <Button
                          className="px-2.5 py-1.5 h-8 text-[10px] font-black rounded-lg bg-accent hover:bg-accent/95 text-white flex items-center gap-1 shrink-0"
                          onClick={() => {
                            const nextItem = buildCartItem(product)
                            setCartItems((currentItems) => [...currentItems, nextItem])
                            setExpandedLineId(nextItem.lineId)
                            setActiveTab('cart')
                          }}
                        >
                          <Plus size={11} />
                          Agregar
                        </Button>
                      </div>
                    </div>
                  </Panel>
                ))}

                {visibleProducts.length === 0 ? (
                  <Panel className="col-span-full border-dashed border-lineStrong bg-white/55 p-8 text-center text-sm text-muted">
                    No hay productos disponibles en esta categoría.
                  </Panel>
                ) : null}
              </div>
            </>
          ) : (
            /* Orders Queue / List view */
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black text-ink">Sistema de Pedidos</h1>
                  <p className="text-xs text-muted">Gestión de comandas y estado de entregas en tiempo real.</p>
                </div>
              </div>

              {pastPendingOrders.length > 0 && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-pulse">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="text-red-700 shrink-0" size={20} />
                    <div>
                      <div className="text-sm font-black text-red-950 uppercase tracking-wide">Pedidos pendientes de días anteriores</div>
                      <div className="text-xs text-red-800 mt-0.5 font-bold">
                        Hay {pastPendingOrders.length} pedido(s) sin entregar o anular de fechas pasadas. Debes gestionarlos o anularlos para limpiar el reporte diario.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="px-4 py-2 bg-red-750 hover:bg-red-800 text-white text-xs font-black rounded-xl transition shadow-sm shrink-0"
                    onClick={async () => {
                      if (window.confirm(`¿Estás seguro de que deseas ANULAR automáticamente los ${pastPendingOrders.length} pedidos pendientes de días anteriores?`)) {
                        for (const order of pastPendingOrders) {
                          await onCancelOrder(order.id, 'Sistema', 'Anulación automática por cambio de día')
                        }
                      }
                    }}
                  >
                    ANULAR TODOS ({pastPendingOrders.length})
                  </button>
                </div>
              )}

              {pastPendingOrders.length > 0 && (
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {pastPendingOrders.map((order) => (
                    <div key={order.id} className="rounded-2xl border border-red-100 bg-white p-3 text-xs shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-black text-ink">{order.displayNumber}</span>
                        <span className="font-semibold text-red-800">{new Date(order.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="mt-1 truncate text-muted">{order.customerName || order.items.map((item) => item.name).join(', ')}</div>
                      <div className="mt-2 flex gap-2">
                        <button type="button" className="flex-1 rounded-lg bg-ink px-2 py-1.5 font-bold text-white" onClick={() => onSetOrderStatus(order.id, 'delivered')}>Entregado</button>
                        <button type="button" className="flex-1 rounded-lg bg-red-600 px-2 py-1.5 font-bold text-white" onClick={() => onCancelOrder(order.id, 'Sistema', 'Anulado desde pendientes anteriores')}>Anular</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tablero Kanban de 3 Columnas */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
                
                {/* COLUMNA 1: PEDIDOS FINALIZADOS */}
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-emerald-700" />
                      <span className="font-black text-sm tracking-wide">Pedidos Finalizados</span>
                    </div>
                    <span className="bg-emerald-600 text-white rounded-full text-xs px-2.5 py-0.5 font-bold">
                      {finalizadosOrders.length}
                    </span>
                  </div>

                  <div className="space-y-3 overflow-visible lg:max-h-[70vh] lg:overflow-y-auto lg:pr-1">
                    {finalizadosOrders.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-line p-8 text-center text-xs text-muted font-semibold bg-white/40">
                        No hay pedidos finalizados hoy.
                      </div>
                    ) : (
                      finalizadosOrders.map((order) => (
                        <div key={order.id} className="rounded-2xl border border-line bg-white p-4 shadow-sm hover:shadow transition space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-black text-ink">{order.displayNumber}</span>
                            <span className="text-[10px] text-muted font-semibold">
                              {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          
                          <div className="text-xs space-y-1">
                            <div>
                              <span className="font-bold text-muted">Cliente:</span>{' '}
                              <span className="font-semibold text-ink">{order.customerName || 'Cliente en local'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                              <SourceBadge source={order.orderSource} />
                              <FulfillmentBadge type={order.fulfillmentType} tableInfo={order.tableInfo} />
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                order.status === 'cancelled'
                                  ? 'bg-rose-50 border border-rose-200 text-rose-800'
                                  : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                              }`}>
                                {order.status === 'cancelled' ? 'Anulado' : 'Entregado'}
                              </span>
                              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                Pagado
                              </span>
                            </div>
                          </div>

                          <div className="border-t border-dashed border-line pt-2 text-[11px] text-ink/90 space-y-1">
                            {order.items.map((item) => (
                              <div key={item.id} className="flex justify-between">
                                <span>{item.quantity}x {item.name}</span>
                                <span>{formatCurrency(item.lineTotal)}</span>
                              </div>
                            ))}
                          </div>

                          <div className="border-t border-line pt-2 flex justify-between items-center">
                            <span className="text-xs font-black text-ink">Total: {formatCurrency(order.total)}</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                className="p-1.5 rounded-lg border border-line bg-panel text-muted hover:text-ink transition hover:bg-line"
                                title="Imprimir ticket"
                                onClick={() => setPrintedOrder(order)}
                              >
                                <Printer size={13} />
                              </button>
                              <button
                                type="button"
                                className="p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition"
                                title="Eliminar permanentemente"
                                onClick={async () => {
                                  if (window.confirm('¿Estás seguro de que deseas ELIMINAR permanentemente este pedido del sistema? Esta acción no se puede deshacer.')) {
                                    await onDeleteOrder(order.id)
                                  }
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* COLUMNA 2: PEDIDOS WHATSAPP / DELIVERY */}
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2">
                      <MessageSquareText size={18} className="text-amber-700" />
                      <span className="font-black text-sm tracking-wide">WhatsApp / Delivery</span>
                    </div>
                    <span className="bg-amber-600 text-white rounded-full text-xs px-2.5 py-0.5 font-bold">
                      {whatsappOrders.length}
                    </span>
                  </div>

                  {/* Control de Retraso General para WhatsApp */}
                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-2.5 flex items-center justify-between gap-2 shadow-sm text-amber-900">
                    <div className="text-[10px] font-black uppercase tracking-wider">Retraso General:</div>
                    <div className="flex gap-1">
                      {[10, 15, 20, 25, 30].map((mins) => {
                        const isActive = globalDelay === mins
                        return (
                          <button
                            key={mins}
                            type="button"
                            className={`px-2 py-1 rounded-lg text-[10px] font-black transition ${
                              isActive ? 'bg-amber-600 text-white shadow-sm' : 'bg-white hover:bg-amber-100 border border-amber-200 text-amber-950'
                            }`}
                            onClick={() => setGlobalDelay(mins)}
                          >
                            {mins}m
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Subfiltros de Pago para WhatsApp */}
                  <div className="flex gap-1.5 bg-white/60 p-1 rounded-xl border border-line shadow-insetSoft">
                    {[
                      { id: 'all', label: `Todos (${whatsappOrders.length})` },
                      { id: 'pending', label: 'Por Pagar' },
                      { id: 'paid', label: 'Pagados' },
                    ].map((tab) => {
                      const isActive = whatsappSubFilter === tab.id
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-black tracking-wider transition ${
                            isActive
                              ? 'bg-ink text-white shadow-sm'
                              : 'text-muted hover:text-ink'
                          }`}
                          onClick={() => setWhatsappSubFilter(tab.id as any)}
                        >
                          {tab.label}
                        </button>
                      )
                    })}
                  </div>

                  <div className="space-y-3 overflow-visible lg:max-h-[64vh] lg:overflow-y-auto lg:pr-1">
                    {whatsappOrders.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-line p-8 text-center text-xs text-muted font-semibold bg-white/40">
                        Sin pedidos activos en esta sección.
                      </div>
                    ) : (
                      whatsappOrders.map((order) => {
                        const isPaid = order.paymentStatus === 'paid'
                        return (
                          <div key={order.id} className="rounded-2xl border border-line bg-white p-4 shadow-sm hover:shadow transition space-y-3 border-l-4 border-l-amber-500">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-black text-ink">{order.displayNumber}</span>
                                <StatusPill status={order.status} />
                                {isOrderDeliveryDelayed(order) ? (
                                  <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[9px] font-black text-red-700">RETRASO DE ENTREGA</span>
                                ) : null}
                              </div>
                              <span className="text-[10px] text-muted font-semibold">
                                {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <div className="text-xs space-y-1.5">
                              <div>
                                <span className="font-bold text-muted">Cliente:</span>{' '}
                                <span className="font-semibold text-ink">{order.customerName || 'Cliente WhatsApp'}</span>
                              </div>
                              {order.customerPhone ? (
                                <div>
                                  <span className="font-bold text-muted">Teléfono:</span>{' '}
                                  <span className="font-semibold text-ink">{order.customerPhone}</span>
                                </div>
                              ) : null}
                              {order.deliveryAddress ? (
                                <div>
                                  <span className="font-bold text-muted">Dirección:</span>{' '}
                                  <span className="font-semibold text-ink">{order.deliveryAddress}</span>
                                </div>
                              ) : null}
                              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                <SourceBadge source={order.orderSource} />
                                <FulfillmentBadge type={order.fulfillmentType} tableInfo={order.tableInfo} />
                                <PaymentBadge paymentStatus={order.paymentStatus} paymentMethod={order.paymentMethod} />
                              </div>
                            </div>

                            <div className="border-t border-dashed border-line pt-2 text-[11px] text-ink/90 space-y-1">
                              {order.items.map((item) => (
                                <div key={item.id} className="flex justify-between">
                                  <span>{item.quantity}x {item.name}</span>
                                  <span className="text-muted font-semibold">{formatCurrency(item.lineTotal)}</span>
                                </div>
                              ))}
                              {order.fulfillmentType === 'delivery' && order.deliveryFee !== undefined ? (
                                <div className="mt-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] text-amber-950">
                                  <div className="flex justify-between">
                                    <span>Productos</span>
                                    <span className="font-semibold">{formatCurrency(order.productSubtotal ?? order.total - (order.deliveryFee || 0))}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Envio {order.deliveryDistanceKm ? `(${order.deliveryDistanceKm} km)` : ''}</span>
                                    <span className="font-semibold">{formatCurrency(order.deliveryFee)}</span>
                                  </div>
                                  {order.deliveryQuoteNote ? (
                                    <div className="mt-1 text-[10px] leading-4 text-amber-800">{order.deliveryQuoteNote}</div>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>

                            <div className="border-t border-line pt-2 flex justify-between items-center">
                              <span className="text-xs font-black text-ink">Total: {formatCurrency(order.total)}</span>
                              <button
                                type="button"
                                className="p-1.5 rounded-lg border border-line bg-panel text-muted hover:text-ink transition hover:bg-line"
                                title="Imprimir ticket"
                                onClick={() => setPrintedOrder(order)}
                              >
                                <Printer size={13} />
                              </button>
                            </div>

                            {/* Acciones para WhatsApp */}
                            <div className="flex flex-wrap gap-1.5 pt-1 border-t border-dashed border-line">
                              {order.status === 'pending' ? (
                                confirmingDelayOrderId === order.id ? (
                                  <div className="flex items-center gap-1 bg-[#f8fafc] p-1.5 rounded-xl border border-[#cbd5e1] flex-wrap w-full">
                                    <span className="text-[10px] font-black text-slate-500 px-1">Retraso:</span>
                                    {[10, 15, 20, 25, 30].map((mins) => (
                                      <button
                                        key={mins}
                                        type="button"
                                        className="bg-amber-500 hover:bg-amber-600 text-white px-1.5 py-1 rounded text-[9px] font-black transition"
                                        onClick={async () => {
                                          await onSetOrderStatus(order.id, 'preparing', mins)
                                          setConfirmingDelayOrderId(null)
                                          setPrintedOrder(order)
                                        }}
                                      >
                                        {mins}m
                                      </button>
                                    ))}
                                    <button
                                      type="button"
                                      className="bg-slate-400 hover:bg-slate-500 text-white px-1.5 py-1 rounded text-[9px] font-black transition"
                                      onClick={() => setConfirmingDelayOrderId(null)}
                                    >
                                      Atrás
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex-1 flex gap-1.5">
                                    <button
                                      type="button"
                                      className="flex-1 flex items-center justify-center gap-1 bg-amber-500 hover:bg-amber-600 text-white py-1.5 rounded-lg text-[10px] font-black transition shadow-sm"
                                      onClick={async () => {
                                        await onSetOrderStatus(order.id, 'preparing', globalDelay)
                                        setPrintedOrder(order)
                                      }}
                                    >
                                      <CheckCircle2 size={12} />
                                      Confirmar ({globalDelay}m)
                                    </button>
                                    <button
                                      type="button"
                                      className="px-2 bg-slate-100 hover:bg-slate-200 border border-line rounded-lg text-[10px] font-bold text-ink transition"
                                      onClick={() => setConfirmingDelayOrderId(order.id)}
                                      title="Cambiar tiempo de retraso"
                                    >
                                      + Atraso
                                    </button>
                                  </div>
                                )
                              ) : null}

                              {!isPaid && (
                                <button
                                  type="button"
                                  className="flex-1 flex items-center justify-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white py-1.5 rounded-lg text-[10px] font-black transition shadow-sm"
                                  onClick={() => {
                                    setPayingOrder(order)
                                    setFastPayMethod('cash')
                                    setFastCashReceived('')
                                    setFastCashSplit('')
                                  }}
                                >
                                  <Coins size={12} />
                                  Cobrar
                                </button>
                              )}

                              <button
                                type="button"
                                className="flex-1 flex items-center justify-center gap-1 bg-ink hover:bg-ink/90 text-white py-1.5 rounded-lg text-[10px] font-black transition shadow-sm"
                                onClick={() => onSetOrderStatus(order.id, 'delivered')}
                              >
                                <CheckCircle2 size={12} />
                                Entregado
                              </button>

                              <button
                                type="button"
                                className="flex items-center justify-center p-1.5 border border-line bg-panel text-muted hover:text-ink rounded-lg text-[10px] font-black transition"
                                onClick={() => handleEditOrder(order)}
                              >
                                <FileEdit size={12} />
                              </button>

                              <button
                                type="button"
                                className="flex items-center justify-center p-1.5 border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-[10px] font-black transition"
                                onClick={() => {
                                  setCancellingOrder(order)
                                  setCancelReason('')
                                }}
                              >
                                <Ban size={12} />
                              </button>

                              <button
                                type="button"
                                className="flex items-center justify-center p-1.5 border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-[10px] font-black transition"
                                onClick={async () => {
                                  if (window.confirm('¿Estás seguro de que deseas ELIMINAR permanentemente este pedido del sistema? Esta acción no se puede deshacer.')) {
                                    await onDeleteOrder(order.id)
                                  }
                                }}
                                title="Eliminar permanentemente"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>

                {/* COLUMNA 3: PEDIDOS LOCALES ACTIVES */}
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2">
                      <Store size={18} className="text-blue-700" />
                      <span className="font-black text-sm tracking-wide">Pedidos Locales (Caja)</span>
                    </div>
                    <span className="bg-blue-600 text-white rounded-full text-xs px-2.5 py-0.5 font-bold">
                      {localesOrders.length}
                    </span>
                  </div>

                  <div className="space-y-3 overflow-visible lg:max-h-[70vh] lg:overflow-y-auto lg:pr-1">
                    {localesOrders.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-line p-8 text-center text-xs text-muted font-semibold bg-white/40">
                        Sin pedidos de caja activos hoy.
                      </div>
                    ) : (
                      localesOrders.map((order) => {
                        const isPaid = order.paymentStatus === 'paid'
                        return (
                          <div key={order.id} className="rounded-2xl border border-line bg-white p-4 shadow-sm hover:shadow transition space-y-3 border-l-4 border-l-blue-500">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-black text-ink">{order.displayNumber}</span>
                                <StatusPill status={order.status} />
                                {isOrderDeliveryDelayed(order) ? (
                                  <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[9px] font-black text-red-700">RETRASO DE ENTREGA</span>
                                ) : null}
                              </div>
                              <span className="text-[10px] text-muted font-semibold">
                                {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <div className="text-xs space-y-1.5">
                              <div>
                                <span className="font-bold text-muted">Cliente:</span>{' '}
                                <span className="font-semibold text-ink">{order.customerName || 'Cliente General'}</span>
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                <FulfillmentBadge type={order.fulfillmentType} tableInfo={order.tableInfo} />
                                <PaymentBadge paymentStatus={order.paymentStatus} paymentMethod={order.paymentMethod} />
                              </div>
                            </div>

                            <div className="border-t border-dashed border-line pt-2 text-[11px] text-ink/90 space-y-1">
                              {order.items.map((item) => (
                                <div key={item.id} className="flex justify-between">
                                  <span>{item.quantity}x {item.name}</span>
                                  <span className="text-muted font-semibold">{formatCurrency(item.lineTotal)}</span>
                                </div>
                              ))}
                            </div>

                            <div className="border-t border-line pt-2 flex justify-between items-center">
                              <span className="text-xs font-black text-ink">Total: {formatCurrency(order.total)}</span>
                              <button
                                type="button"
                                className="p-1.5 rounded-lg border border-line bg-panel text-muted hover:text-ink transition hover:bg-line"
                                title="Imprimir ticket"
                                onClick={() => setPrintedOrder(order)}
                              >
                                <Printer size={13} />
                              </button>
                            </div>

                            {/* Acciones para Pedido Local */}
                            <div className="flex flex-wrap gap-1.5 pt-1 border-t border-dashed border-line">
                              {order.status === 'pending' ? (
                                <button
                                  type="button"
                                  className="flex-1 flex items-center justify-center gap-1 bg-amber-500 hover:bg-amber-600 text-white py-1.5 rounded-lg text-[10px] font-black transition shadow-sm"
                                  onClick={async () => {
                                    await onSetOrderStatus(order.id, 'preparing')
                                    setPrintedOrder(order) // Auto imprimir al enviar a cocina
                                  }}
                                >
                                  <CookingPot size={12} />
                                  A Cocina
                                </button>
                              ) : null}

                              {!isPaid && (
                                <button
                                  type="button"
                                  className="flex-1 flex items-center justify-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white py-1.5 rounded-lg text-[10px] font-black transition shadow-sm"
                                  onClick={() => {
                                    setPayingOrder(order)
                                    setFastPayMethod('cash')
                                    setFastCashReceived('')
                                    setFastCashSplit('')
                                  }}
                                >
                                  <Coins size={12} />
                                  Cobrar
                                </button>
                              )}

                              <button
                                type="button"
                                className="flex-1 flex items-center justify-center gap-1 bg-ink hover:bg-ink/90 text-white py-1.5 rounded-lg text-[10px] font-black transition shadow-sm"
                                onClick={() => onSetOrderStatus(order.id, 'delivered')}
                              >
                                <CheckCircle2 size={12} />
                                Entregado
                              </button>

                              <button
                                type="button"
                                className="flex items-center justify-center p-1.5 border border-line bg-panel text-muted hover:text-ink rounded-lg text-[10px] font-black transition"
                                onClick={() => handleEditOrder(order)}
                              >
                                <FileEdit size={12} />
                              </button>

                              <button
                                type="button"
                                className="flex items-center justify-center p-1.5 border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-[10px] font-black transition"
                                onClick={() => {
                                  setCancellingOrder(order)
                                  setCancelReason('')
                                }}
                              >
                                <Ban size={12} />
                              </button>

                              <button
                                type="button"
                                className="flex items-center justify-center p-1.5 border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-[10px] font-black transition"
                                onClick={async () => {
                                  if (window.confirm('¿Estás seguro de que deseas ELIMINAR permanentemente este pedido del sistema? Esta acción no se puede deshacer.')) {
                                    await onDeleteOrder(order.id)
                                  }
                                }}
                                title="Eliminar permanentemente"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
              </div>
            </div>
            </div>
          )}
        </section>
      </div>

      {/* Botón flotante para reabrir el carrito cuando hay productos y el modal está cerrado */}
      {cartItems.length > 0 && !showCheckoutModal && (
        <button
          type="button"
          className="fixed bottom-6 right-6 z-40 bg-accent hover:bg-accent/90 text-white font-black px-6 py-4 rounded-full shadow-2xl flex items-center gap-2 transition transform hover:scale-105 active:scale-95 border border-white/20 xl:hidden"
          onClick={() => setShowCheckoutModal(true)}
        >
          <ShoppingBag size={18} />
          <span>VER CARRITO / COBRAR ({cartItems.reduce((sum, item) => sum + item.quantity, 0)})</span>
        </button>
      )}

      {/* Modal emergente de checkout de doble columna (horizontal y vertical grande) */}
      {(showCheckoutModal || (cartItems.length > 0 && viewMode === 'new_order')) && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm xl:pointer-events-none xl:left-auto xl:right-4 xl:top-5 xl:bottom-5 xl:w-[460px] xl:items-stretch xl:justify-end xl:bg-transparent xl:p-0 xl:backdrop-blur-0 ${showCheckoutModal ? '' : 'hidden xl:flex'}`}>
          <Panel className="w-full max-w-5xl h-[85vh] bg-[#fffdfb] rounded-[2.2rem] shadow-float overflow-hidden flex flex-col border border-line xl:pointer-events-auto xl:h-full xl:max-w-none xl:rounded-[1.5rem]">
            
            {/* Cabecera del Modal */}
            <div className="border-b border-line px-4 py-3 flex items-center justify-between bg-white shrink-0">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-accent">CONFIRMAR PEDIDO</p>
                <h2 className="mt-1 text-base font-black text-ink flex items-center gap-2">
                  <span>Carrito & Datos de Cobro</span>
                  {editingOrderId ? <span className="text-[10px] bg-orange-100 text-orange-900 px-2 py-0.5 rounded-full font-black">EDITANDO PEDIDO</span> : null}
                </h2>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-line bg-accentWash px-2.5 py-1.5 text-right shadow-insetSoft flex items-center gap-2">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted">Siguiente Ticket:</span>
                  <span className="text-sm font-black text-ink">{nextOrderNumber}</span>
                </div>
                
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl text-xs font-black bg-panel hover:bg-line transition text-ink xl:hidden"
                  onClick={() => setShowCheckoutModal(false)}
                >
                  Seguir Agregando
                </button>
              </div>
            </div>

            {/* Dos columnas del modal */}
              <div className="flex-1 grid grid-cols-1 grid-rows-[minmax(180px,0.75fr)_minmax(360px,1.25fr)] overflow-hidden bg-canvas/30">
              
              {/* Columna Izquierda: Lista de items en el carrito */}
              <div className="border-b border-line flex flex-col h-full min-h-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                  {cartItems.length === 0 ? (
                    <div className="rounded-[1.4rem] border border-dashed border-lineStrong bg-canvas/60 p-5 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-accent shadow-insetSoft">
                        <CookingPot size={24} />
                      </div>
                      <h3 className="mt-4 text-sm font-bold text-ink">Todavia no hay productos</h3>
                      <p className="mt-1 text-xs text-muted">
                        Agrega productos para armar el pedido.
                      </p>
                    </div>
                  ) : null}

                  {cartItems.map((item) => {
                    const product = productsById.get(item.productId)

                    if (!product) {
                      return null
                    }

                    const selectedExtras = item.modifiers.extras
                    const selectedOptions = item.modifiers.options
                    const extrasTotal = selectedExtras.reduce((sum, extra) => sum + extra.price, 0)
                    const lineTotal = (product.price + extrasTotal) * item.quantity
                    const isExpanded = expandedLineId === item.lineId
                    const hasModifiers = selectedExtras.length > 0 || selectedOptions.length > 0 || Boolean(item.modifiers.note)

                    return (
                      <article
                        key={item.lineId}
                        className={`rounded-[1.1rem] border bg-white p-3 transition duration-150 ${
                          isExpanded ? 'border-accent/20 shadow-card' : 'border-line'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          {isImageUrl(product.image) ? (
                            <img alt={product.name} className="h-12 w-12 rounded-xl object-cover" src={product.image} />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accentWash text-2xl">{product.image}</div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="text-xs font-bold text-ink truncate">{product.name}</h3>
                                <p className="mt-0.5 text-xs text-muted">{formatCurrency(product.price)}</p>
                              </div>
                              <button
                                type="button"
                                className="rounded-full p-1.5 text-muted transition hover:bg-accentWash hover:text-accent shrink-0"
                                onClick={() => removeItem(item.lineId)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>

                            <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-panel text-ink transition hover:bg-line active:scale-95"
                                  onClick={() =>
                                    updateItem(item.lineId, (currentItem) => ({
                                      ...currentItem,
                                      quantity: Math.max(1, currentItem.quantity - 1),
                                    }))
                                  }
                                >
                                  <Minus size={12} />
                                </button>
                                <span className="w-6 text-center text-xs font-semibold text-ink">{item.quantity}</span>
                                <button
                                  type="button"
                                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-panel text-ink transition hover:bg-line active:scale-95"
                                  onClick={() =>
                                    updateItem(item.lineId, (currentItem) => ({
                                      ...currentItem,
                                      quantity: currentItem.quantity + 1,
                                    }))
                                  }
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-bold text-ink">{formatCurrency(lineTotal)}</span>
                              </div>
                            </div>

                            {/* Botón de Modificadores */}
                            <div className="mt-2.5 flex justify-between items-center border-t border-dashed border-line pt-2">
                              <button
                                type="button"
                                className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold transition ${
                                  isExpanded ? 'bg-accentWash text-accent' : 'bg-panel text-muted hover:text-ink'
                                }`}
                                onClick={() => setExpandedLineId(isExpanded ? null : item.lineId)}
                              >
                                <span>Modificadores</span>
                                <ChevronDown size={12} className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              </button>
                              {hasModifiers && !isExpanded ? (
                                <span className="text-[9px] text-accent font-black bg-accentWash px-2 py-0.5 rounded-md">Configurado</span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        {/* Panel de Modificadores expandido */}
                        {isExpanded ? (
                          <div className="mt-3 space-y-3.5 border-t border-line pt-3">
                            {product.extras?.length ? (
                              <div>
                                <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-muted">Extras</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {product.extras.map((extra) => {
                                    const isSelected = selectedExtras.some((se) => se.id === extra.id)

                                    return (
                                      <button
                                        key={extra.id}
                                        type="button"
                                        className={`rounded-full px-2.5 py-1 text-xs transition font-semibold ${
                                          isSelected ? 'bg-accent text-white shadow-sm' : 'bg-canvas text-ink hover:bg-accentSoft'
                                        }`}
                                        onClick={() =>
                                          updateItem(item.lineId, (currentItem) => {
                                            const alreadySelected = currentItem.modifiers.extras.some((se) => se.id === extra.id)
                                            return {
                                              ...currentItem,
                                              modifiers: {
                                                ...currentItem.modifiers,
                                                extras: alreadySelected
                                                  ? currentItem.modifiers.extras.filter((se) => se.id !== extra.id)
                                                  : [...currentItem.modifiers.extras, extra],
                                              },
                                            }
                                          })
                                        }
                                      >
                                        {extra.name} +{formatCurrency(extra.price)}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            ) : null}

                            {product.options?.length ? (
                              <div>
                                <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-muted">Modificadores</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {product.options.map((option) => {
                                    const isSelected = selectedOptions.includes(option.label)

                                    return (
                                      <button
                                        key={option.id}
                                        type="button"
                                        className={`rounded-full px-2.5 py-1 text-xs transition font-semibold ${
                                          isSelected ? 'bg-accent text-white shadow-sm' : 'bg-canvas text-ink hover:bg-accentSoft'
                                        }`}
                                        onClick={() =>
                                          updateItem(item.lineId, (currentItem) => ({
                                            ...currentItem,
                                            modifiers: {
                                              ...currentItem.modifiers,
                                              options: currentItem.modifiers.options.includes(option.label)
                                                ? currentItem.modifiers.options.filter((currentOption) => currentOption !== option.label)
                                                : [...currentItem.modifiers.options, option.label],
                                            },
                                          }))
                                        }
                                      >
                                        {option.label}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            ) : null}

                            <div>
                              <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-muted">
                                <MessageSquareText size={12} />
                                Observacion para cocina
                              </label>
                              <textarea
                                className="min-h-16 w-full rounded-xl border border-line bg-canvas/35 px-3 py-2 text-xs text-ink outline-none transition placeholder:text-muted focus:border-accent"
                                placeholder="Ej. salsa aparte, sin cebolla..."
                                value={item.modifiers.note}
                                onChange={(event) =>
                                  updateItem(item.lineId, (currentItem) => ({
                                    ...currentItem,
                                    modifiers: {
                                      ...currentItem.modifiers,
                                      note: event.target.value,
                                    },
                                  }))
                                }
                              />
                            </div>
                          </div>
                        ) : null}
                      </article>
                    )
                  })}
                </div>

                {/* Subtotal del carrito */}
                <div className="border-t border-line bg-panel/50 p-4 shrink-0 flex justify-between items-center">
                  <div>
                    <div className="text-[9px] font-black uppercase text-muted tracking-wider">Productos</div>
                    <div className="text-xs font-black text-ink">{totalUnits} unidades</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] font-black uppercase text-muted tracking-wider">Total Carrito</div>
                    <div className="text-lg font-black text-accent">{formatCurrency(cartTotal)}</div>
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Formulario de Checkout */}
              <div className="flex flex-col h-full min-h-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  
                  {/* Origen de pedido */}
                  {userRole !== 'pedidos' ? (
                    <div className="rounded-[1.2rem] border border-line bg-white p-3 shadow-sm">
                      <div className="text-[10px] font-black uppercase tracking-wider text-muted">Origen</div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {[
                          { id: 'local', label: 'Local', icon: Store },
                          { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquareText },
                        ].map((option) => {
                          const isActive = orderSource === option.id
                          const Icon = option.icon

                          return (
                            <button
                              key={option.id}
                              type="button"
                              className={`rounded-[0.9rem] border py-2 text-xs font-black transition flex items-center justify-center gap-1.5 min-h-[40px] ${
                                isActive
                                  ? option.id === 'local'
                                    ? 'border-[#3b82f6] bg-[#3b82f6] text-white shadow-sm'
                                    : 'border-[#10b981] bg-[#10b981] text-white shadow-sm'
                                  : 'border-line bg-panel/80 text-ink hover:bg-panel'
                              }`}
                              onClick={() => {
                                setOrderSource(option.id as 'local' | 'whatsapp')
                                if (option.id === 'local') {
                                  setFulfillmentType('table')
                                } else {
                                  setFulfillmentType('pickup')
                                }
                              }}
                            >
                              <Icon size={14} />
                              {option.label.toUpperCase()}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}

                  {/* Modalidad de entrega */}
                  <div className="rounded-[1.2rem] border border-line bg-white p-3 shadow-sm">
                    <div className="text-[10px] font-black uppercase tracking-wider text-muted">Entrega</div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                    {(() => {
                      const options: Array<{
                        id: FulfillmentType
                        label: string
                        icon: typeof Utensils
                        disabled?: boolean
                      }> = [
                        { id: 'table', label: 'Mesa', icon: Utensils, disabled: userRole === 'pedidos' || orderSource === 'whatsapp' },
                        { id: 'pickup', label: 'Retiro', icon: ShoppingBag },
                      ]
                      return options.map((option) => {
                        const isActive = fulfillmentType === option.id
                        const Icon = option.icon

                        if (option.disabled) return null

                        let activeStyles = 'border-ink bg-ink text-white shadow-sm'
                        if (option.id === 'table') {
                          activeStyles = 'border-[#6366f1] bg-[#6366f1] text-white shadow-sm'
                        } else if (option.id === 'pickup') {
                          activeStyles = 'border-[#d97706] bg-[#d97706] text-white shadow-sm'
                        } else if (option.id === 'delivery') {
                          activeStyles = 'border-[#ec4899] bg-[#ec4899] text-white shadow-sm'
                        }

                        return (
                          <button
                            key={option.id}
                            type="button"
                            className={`rounded-[0.9rem] border py-2 text-xs font-black transition flex flex-col items-center justify-center gap-0.5 min-h-[44px] ${
                              isActive ? activeStyles : 'border-line bg-panel/80 text-ink hover:bg-panel'
                            }`}
                            onClick={() => setFulfillmentType(option.id)}
                          >
                            <Icon size={14} />
                            <span>{option.label.toUpperCase()}</span>
                          </button>
                        )
                      })
                    })()}
                    </div>

                    {fulfillmentType === 'table' ? (
                      <div className="mt-2">
                        <input
                          className="w-full rounded-[0.9rem] border border-line bg-canvas/35 px-3 py-2 text-xs text-ink outline-none transition focus:border-accent"
                          placeholder="Mesa (ej: 4, Terraza 2)"
                          value={tableInfo}
                          onChange={(event) => setTableInfo(event.target.value)}
                        />
                      </div>
                    ) : null}
                  </div>

                  {/* Datos de Contacto */}
                  <div className="rounded-[1.2rem] border border-line bg-white p-3 shadow-sm space-y-2.5">
                    <div className="text-[10px] font-black uppercase tracking-wider text-muted">Datos de Contacto</div>
                    <div>
                      <input
                        className={`w-full rounded-[0.9rem] border bg-canvas/35 px-3 py-2.5 text-xs text-ink outline-none transition focus:border-accent ${
                          customerName.trim() === ''
                            ? 'border-red-300 focus:border-red-500'
                            : 'border-line'
                        }`}
                        placeholder="Nombre del Cliente"
                        value={customerName}
                        onChange={(event) => setCustomerName(event.target.value)}
                      />
                      {customerName.trim() === '' ? (
                        <span className="text-[9px] text-red-500 font-bold mt-0.5 block px-1">Nombre es obligatorio</span>
                      ) : null}
                    </div>

                    {(orderSource === 'whatsapp' || fulfillmentType === 'delivery') ? (
                      <div>
                        <input
                          className={`w-full rounded-[0.9rem] border bg-canvas/35 px-3 py-2.5 text-xs text-ink outline-none transition focus:border-accent ${
                            (orderSource === 'whatsapp' || fulfillmentType === 'delivery') && customerPhone.trim() === ''
                              ? 'border-red-300 focus:border-red-500'
                              : 'border-line'
                          }`}
                          placeholder="Teléfono"
                          value={customerPhone}
                          onChange={(event) => setCustomerPhone(event.target.value)}
                        />
                        {(orderSource === 'whatsapp' || fulfillmentType === 'delivery') && customerPhone.trim() === '' ? (
                          <span className="text-[9px] text-red-500 font-bold mt-0.5 block px-1">Teléfono es obligatorio</span>
                        ) : null}
                      </div>
                    ) : null}

                    {fulfillmentType === 'delivery' ? (
                      <div>
                        <textarea
                          className={`w-full min-h-[48px] rounded-[0.9rem] border bg-canvas/35 px-3 py-2 text-xs text-ink outline-none transition focus:border-accent ${
                            fulfillmentType === 'delivery' && deliveryAddress.trim() === ''
                              ? 'border-red-300 focus:border-red-500'
                              : 'border-line'
                          }`}
                          placeholder="Dirección completa de entrega"
                          value={deliveryAddress}
                          onChange={(event) => setDeliveryAddress(event.target.value)}
                        />
                        {fulfillmentType === 'delivery' && deliveryAddress.trim() === '' ? (
                          <span className="text-[9px] text-red-500 font-bold mt-0.5 block px-1">Dirección es obligatoria</span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  {/* Estado de Pago */}
                  <div className="rounded-[1.2rem] border border-line bg-white p-3 shadow-sm">
                    <div className="text-[10px] font-black uppercase tracking-wider text-muted">Estado de Pago</div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {[
                        { id: 'paid', label: 'Pagado' },
                        { id: 'pending', label: 'Pendiente' },
                      ].map((option) => {
                        const isActive = paymentStatus === option.id

                        return (
                          <button
                            key={option.id}
                            type="button"
                            className={`rounded-[0.9rem] border py-2 text-xs font-black transition min-h-[40px] ${
                              isActive
                                ? option.id === 'paid'
                                  ? 'border-[#10b981] bg-[#10b981] text-white shadow-sm'
                                  : 'border-[#ef4444] bg-[#ef4444] text-white shadow-sm'
                                : 'border-line bg-panel/80 text-ink hover:bg-panel'
                            }`}
                            onClick={() => {
                              setPaymentStatus(option.id as 'paid' | 'pending')
                              if (option.id === 'pending') {
                                setPaymentMethod(null)
                              } else {
                                setPaymentMethod('cash')
                              }
                            }}
                          >
                            {option.label.toUpperCase()}
                          </button>
                        )
                      })}
                    </div>

                    {paymentStatus === 'paid' ? (
                      <div className="mt-3 border-t border-dashed border-line pt-3">
                        <div className="text-[10px] font-black uppercase tracking-wider text-muted">Método de Pago</div>
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          {[
                            { id: 'cash', label: 'Efectivo', icon: Coins },
                            { id: 'qr', label: 'QR', icon: QrCode },
                            { id: 'mixed', label: 'Mixto', icon: Shuffle },
                          ].map((option) => {
                            const isActive = paymentMethod === option.id
                            const Icon = option.icon

                            return (
                              <button
                                key={option.id}
                                type="button"
                                className={`rounded-[0.8rem] border py-1.5 text-xs font-black transition flex flex-col items-center justify-center gap-0.5 min-h-[44px] ${
                                  isActive ? 'border-[#10b981] bg-[#10b981] text-white shadow-sm' : 'border-line bg-panel/80 text-ink hover:bg-panel'
                                }`}
                                onClick={() => setPaymentMethod(option.id as PaymentMethod)}
                              >
                                <Icon size={13} />
                                <span>{option.label.toUpperCase()}</span>
                              </button>
                            )
                          })}
                        </div>

                        {paymentMethod === 'cash' ? (
                          <div className="mt-3 space-y-2">
                            <label className="block">
                              <div className="mb-1 text-[10px] font-black uppercase tracking-wider text-muted">Recibido</div>
                              <input
                                className={`w-full rounded-[0.8rem] border bg-canvas/35 px-3 py-2 text-xs text-ink outline-none transition focus:border-accent ${
                                  cashReceived < cartTotal ? 'border-red-300 focus:border-red-500' : 'border-line'
                                }`}
                                inputMode="decimal"
                                placeholder="0"
                                value={cashReceivedInput}
                                onChange={(event) => setCashReceivedInput(event.target.value)}
                              />
                              {cashReceived < cartTotal ? (
                                <span className="text-[9px] text-red-500 font-bold mt-1 block px-1">
                                  Pago insuficiente (Mínimo: {formatCurrency(cartTotal)})
                                </span>
                              ) : null}
                            </label>
                            <div className="flex items-center justify-between text-xs pt-1">
                              <span className="text-muted font-semibold">Cambio</span>
                              <span className="font-black text-ink">{formatCurrency(change)}</span>
                            </div>
                          </div>
                        ) : null}

                        {paymentMethod === 'mixed' ? (
                          <div className="mt-3 space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <label className="block">
                                <div className="mb-1 text-[9px] font-black uppercase tracking-wider text-muted">Efectivo</div>
                                <input
                                  className={`w-full rounded-[0.8rem] border bg-canvas/35 px-2.5 py-1.5 text-xs text-ink outline-none transition focus:border-accent ${
                                    cashAmount === 0 ? 'border-red-300 focus:border-red-500' : 'border-line'
                                  }`}
                                  inputMode="decimal"
                                  placeholder="0"
                                  value={cashSplitInput}
                                  onChange={(event) => setCashSplitInput(event.target.value)}
                                />
                              </label>
                              <div className="block">
                                <div className="mb-1 text-[9px] font-black uppercase tracking-wider text-muted">Monto QR</div>
                                <div className="rounded-[0.8rem] border border-line bg-panel/80 px-2 py-1.5 text-xs font-bold text-ink h-[32px] flex items-center">
                                  {formatCurrency(qrAmount)}
                                </div>
                              </div>
                            </div>
                            {cashAmount === 0 ? (
                              <span className="text-[9px] text-red-500 font-bold block px-1">Efectivo debe ser mayor a 0</span>
                            ) : null}

                            <label className="block mt-2">
                              <div className="mb-1 text-[9px] font-black uppercase tracking-wider text-muted">Efectivo Recibido</div>
                              <input
                                className={`w-full rounded-[0.8rem] border bg-canvas/35 px-2.5 py-1.5 text-xs text-ink outline-none transition focus:border-accent ${
                                  cashReceived < cashAmount ? 'border-red-300 focus:border-red-500' : 'border-line'
                                }`}
                                inputMode="decimal"
                                placeholder="0"
                                value={cashReceivedInput}
                                onChange={(event) => setCashReceivedInput(event.target.value)}
                              />
                              {cashReceived < cashAmount ? (
                                <span className="text-[9px] text-red-500 font-bold mt-1 block px-1">
                                  Efectivo insuficiente (Mínimo: {formatCurrency(cashAmount)})
                                </span>
                              ) : null}
                            </label>
                            <div className="flex items-center justify-between text-xs mt-1">
                              <span className="text-muted font-semibold">Cambio</span>
                              <span className="font-black text-ink">{formatCurrency(change)}</span>
                            </div>
                          </div>
                        ) : null}

                        {paymentMethod === 'qr' ? (
                          <div className="mt-2 rounded-[0.8rem] bg-panel/80 p-2.5 text-xs flex justify-between items-center">
                            <span className="text-muted font-semibold">Monto por QR</span>
                            <span className="font-black text-ink">{formatCurrency(cartTotal)}</span>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      /* Expected payment method selection for pending orders */
                      <div className="mt-3 border-t border-dashed border-line pt-3">
                        <div className="text-[10px] font-black uppercase tracking-wider text-muted">Método Esperado</div>
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          {[
                            { id: 'cash', label: 'Efectivo', icon: Coins },
                            { id: 'qr', label: 'QR', icon: QrCode },
                            { id: 'mixed', label: 'Mixto', icon: Shuffle },
                          ].map((option) => {
                            const isActive = expectedPaymentMethod === option.id
                            const Icon = option.icon

                            return (
                              <button
                                key={option.id}
                                type="button"
                                className={`rounded-[0.8rem] border py-1.5 text-xs font-black transition flex flex-col items-center justify-center gap-0.5 min-h-[44px] ${
                                  isActive ? 'border-[#10b981] bg-[#10b981] text-white shadow-sm' : 'border-line bg-panel/80 text-ink hover:bg-panel'
                                }`}
                                onClick={() => setExpectedPaymentMethod(option.id as PaymentMethod)}
                              >
                                <Icon size={13} />
                                <span>{option.label.toUpperCase()}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                {/* Footer de Enviar a Cocina */}
                <div className="border-t border-line bg-white p-4 shrink-0 flex gap-3.5">
                  <Button
                    fullWidth
                    size="lg"
                    className="shadow-xl shadow-accent/20"
                    disabled={cartItems.length === 0 || isSubmitting || !isPaymentValid || !isDeliveryInfoValid}
                    onClick={async () => {
                      setIsSubmitting(true)
                      const payload = {
                        cartItems,
                        productsById,
                        payment: buildPaymentSummary(),
                        paymentStatus,
                        paymentMethod,
                        expectedPaymentMethod,
                        orderSource,
                        fulfillmentType,
                        tableInfo: fulfillmentType === 'table' ? tableInfo.trim() : '',
                        customerName: customerName.trim(),
                        customerPhone: customerPhone.trim(),
                        deliveryAddress: deliveryAddress.trim(),
                        createdBy: userId,
                      }

                      let isSuccess = false
                      if (editingOrderId) {
                        try {
                          await onUpdateOrder(editingOrderId, payload)
                          isSuccess = true
                        } catch (error) {
                          console.error('Failed to update order:', error)
                        }
                      } else {
                        isSuccess = await onSubmitOrder(payload)
                      }

                      if (isSuccess) {
                        // Generar recibo imprimible antes de limpiar el estado
                        const completedOrderMock = {
                          displayNumber: nextOrderNumber,
                          createdAt: new Date().toISOString(),
                          items: cartItems.map((item) => {
                            const product = productsById.get(item.productId)
                            const selectedExtras = item.modifiers.extras
                            const extrasTotal = selectedExtras.reduce((sum, extra) => sum + extra.price, 0)
                            return {
                              id: item.lineId,
                              name: product?.name || 'Producto',
                              price: product?.price || 0,
                              quantity: item.quantity,
                              lineTotal: ((product?.price || 0) + extrasTotal) * item.quantity,
                              modifiers: item.modifiers
                            }
                          }),
                          total: cartTotal,
                          payment: buildPaymentSummary(),
                          paymentStatus,
                          paymentMethod,
                          orderSource,
                          fulfillmentType,
                          tableInfo: fulfillmentType === 'table' ? tableInfo.trim() : '',
                          customerName: customerName.trim(),
                          customerPhone: customerPhone.trim(),
                          deliveryAddress: deliveryAddress.trim(),
                          createdBy: userId,
                        }
                        setPrintedOrder(completedOrderMock as any)

                        setCartItems([])
                        setExpandedLineId(null)
                        setPaymentStatus('paid')
                        setPaymentMethod('cash')
                        setCashReceivedInput('')
                        setCashSplitInput('')
                        setFulfillmentType(userRole === 'pedidos' ? 'pickup' : 'table')
                        setOrderSource(userRole === 'pedidos' ? 'whatsapp' : 'local')
                        setTableInfo('')
                        setCustomerName('')
                        setCustomerPhone('')
                        setDeliveryAddress('')
                        setExpectedPaymentMethod(null)
                        setEditingOrderId(null)
                        setActiveTab('catalog')
                        setShowCheckoutModal(false)
                      }

                      setIsSubmitting(false)
                    }}
                  >
                    {isSubmitting ? <LoaderCircle size={18} className="animate-spin" /> : <CookingPot size={18} />}
                    {isSubmitting ? 'Guardando...' : editingOrderId ? 'Guardar Cambios' : 'Enviar a cocina'}
                  </Button>

                  {editingOrderId && (
                    <button
                      type="button"
                      className="px-4 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 transition text-xs font-bold text-orange-950"
                      onClick={handleDiscardEdit}
                    >
                      Descartar Edición
                    </button>
                  )}

                  <button
                    type="button"
                    className="px-4 rounded-xl border border-line bg-panel hover:bg-line transition text-xs font-bold text-ink"
                    onClick={() => setShowCheckoutModal(false)}
                  >
                    Cerrar
                  </button>
                </div>
              </div>

            </div>
          </Panel>
        </div>
      )}

      {/* Fast Payment Modal (QR, Cash change calculation & Mixed validation) */}
      {payingOrder ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2.2rem] border border-line bg-white p-6 shadow-float space-y-4">
            <div>
              <h3 className="text-xl font-bold text-ink">Registrar Cobro Rápido</h3>
              <p className="text-sm text-muted">
                Pedido {payingOrder.displayNumber} · Total: <span className="font-extrabold text-ink">{formatCurrency(payingOrder.total)}</span>
              </p>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Método de Pago Realizado</div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'cash', label: 'Efectivo' },
                  { id: 'qr', label: 'QR' },
                  { id: 'mixed', label: 'Mixto' },
                ].map((option) => {
                  const isActive = fastPayMethod === option.id

                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={`rounded-[0.9rem] border py-2 text-xs font-bold transition ${
                        isActive ? 'border-ink bg-ink text-white' : 'border-line bg-panel/85 text-ink hover:bg-panel'
                      }`}
                      onClick={() => {
                        setFastPayMethod(option.id as PaymentMethod)
                        setFastCashReceived('')
                        setFastCashSplit('')
                      }}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>

              {fastPayMethod === 'cash' ? (
                <div className="space-y-2 pt-2">
                  <label className="block">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">Recibido</div>
                    <input
                      className="w-full rounded-[0.8rem] border border-line bg-canvas/35 px-3 py-2.5 text-sm text-ink outline-none transition focus:border-accent"
                      inputMode="decimal"
                      placeholder="0"
                      value={fastCashReceived}
                      onChange={(event) => setFastCashReceived(event.target.value)}
                    />
                  </label>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-muted">Cambio</span>
                    <span className="font-extrabold text-emerald-800 text-sm">{formatCurrency(fastChange)}</span>
                  </div>
                </div>
              ) : null}

              {fastPayMethod === 'mixed' ? (
                <div className="space-y-2 pt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Efectivo</div>
                      <input
                        className="w-full rounded-[0.8rem] border border-line bg-canvas/35 px-2 py-1.5 text-xs text-ink outline-none transition focus:border-accent"
                        inputMode="decimal"
                        placeholder="0"
                        value={fastCashSplit}
                        onChange={(event) => setFastCashSplit(event.target.value)}
                      />
                    </label>
                    <div className="block">
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Monto QR</div>
                      <div className="rounded-[0.8rem] border border-line bg-panel/80 px-2 py-1.5 text-xs font-semibold text-ink h-[34px] flex items-center">
                        {formatCurrency(fastQrAmount)}
                      </div>
                    </div>
                  </div>
                  <label className="block mt-2">
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Efectivo Recibido</div>
                    <input
                      className="w-full rounded-[0.8rem] border border-line bg-canvas/35 px-2 py-1.5 text-xs text-ink outline-none transition focus:border-accent"
                      inputMode="decimal"
                      placeholder="0"
                      value={fastCashReceived}
                      onChange={(event) => setFastCashReceived(event.target.value)}
                    />
                  </label>
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-muted">Cambio</span>
                    <span className="font-extrabold text-emerald-800 text-sm">{formatCurrency(fastChange)}</span>
                  </div>
                </div>
              ) : null}

              {fastPayMethod === 'qr' ? (
                <div className="rounded-[0.8rem] bg-panel/80 p-3 text-xs">
                  <div className="text-muted font-semibold">Monto por QR</div>
                  <div className="mt-1 font-extrabold text-ink text-sm">{formatCurrency(payingOrder.total)}</div>
                </div>
              ) : null}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                fullWidth
                tone="success"
                disabled={!isFastPaymentValid}
                onClick={async () => {
                  try {
                    await onConfirmPayment(payingOrder.id, {
                      paymentStatus: 'paid',
                      paymentMethod: fastPayMethod,
                      payment: buildFastPaymentSummary(),
                      paidBy: userName,
                    })
                    setPayingOrder(null)
                  } catch (error) {
                    console.error('Failed to confirm fast payment:', error)
                  }
                }}
              >
                Confirmar Pago
              </Button>
              <button
                type="button"
                className="w-full rounded-[1.2rem] border border-line bg-panel text-ink hover:bg-line transition text-sm font-semibold"
                onClick={() => setPayingOrder(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Cancel Order Dialog Modal */}
      {cancellingOrder ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2.2rem] border border-line bg-white p-6 shadow-float space-y-4">
            <div>
              <h3 className="text-xl font-bold text-ink">Anular Pedido</h3>
              <p className="text-sm text-muted">¿Está seguro que desea anular el pedido {cancellingOrder.displayNumber}?</p>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-muted">Motivo de Anulación</label>
              <textarea
                className="w-full min-h-20 rounded-[1.2rem] border border-line bg-canvas/35 px-3 py-2 text-sm text-ink outline-none transition focus:border-accent"
                placeholder="Ej. Cliente desistió del pedido, error al ingresar items..."
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                className="w-full bg-red-600 hover:bg-red-700 text-white rounded-[1.2rem] py-3 text-sm font-bold transition shadow-md shadow-red-500/10"
                onClick={async () => {
                  try {
                    await onCancelOrder(cancellingOrder.id, userName, cancelReason)
                    setCancellingOrder(null)
                  } catch (error) {
                    console.error('Failed to cancel order:', error)
                  }
                }}
              >
                Confirmar Anulación
              </button>
              <button
                type="button"
                className="w-full rounded-[1.2rem] border border-line bg-panel text-ink hover:bg-line transition py-3 text-sm font-semibold"
                onClick={() => setCancellingOrder(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Estilos para impresión térmica y división de tickets */}
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body * {
            visibility: hidden;
          }
          #print-section, #print-section * {
            visibility: visible;
          }
          #print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 76mm;
            padding: 0;
            margin: 0;
            background: white;
            color: black;
          }
          .print-page {
            page-break-after: always;
            break-after: page;
          }
        }
      `}</style>

      {/* Recibo térmico dual (Cliente + Cocina) */}
      {printedOrder ? (
        <div id="print-section" className="hidden print:block text-black font-mono text-[10px] p-1 leading-normal bg-white w-[76mm]">
          {/* Ticket de Cliente */}
          <div className="print-page w-full flex flex-col items-center">
            <div className="text-center font-bold text-base tracking-wider mb-0.5">BURGUER LAB</div>
            <div className="text-center text-[8px] text-gray-500 mb-2">Comandero & WhatsApp Bot</div>
            
            <div className="border-t border-b border-black border-dashed py-1 w-full text-left space-y-0.5 text-[9px]">
              <div><b>Ticket:</b> {printedOrder.displayNumber}</div>
              <div><b>Fecha:</b> {new Date(printedOrder.createdAt).toLocaleString('es-ES')}</div>
              <div><b>Cliente:</b> {printedOrder.customerName || 'Cliente General'}</div>
              <div><b>Origen:</b> {printedOrder.orderSource === 'whatsapp' ? 'PEDIDO WHATSAPP' : 'PEDIDO LOCAL'}</div>
              <div><b>Entrega:</b> {printedOrder.fulfillmentType === 'table' ? `Mesa: ${printedOrder.tableInfo}` : printedOrder.fulfillmentType === 'pickup' ? 'Retiro en Local' : 'Delivery'}</div>
            </div>
            
            <div className="mt-2 w-full space-y-1.5 text-[9px]">
              {printedOrder.items.map((item: any, idx: number) => (
                 <div key={idx} className="w-full">
                    <div className="flex justify-between font-bold">
                       <span>{item.quantity}x {item.name}</span>
                       <span>{formatCurrency(item.lineTotal || (item.price * item.quantity))}</span>
                    </div>
                    {item.modifiers.extras.length > 0 && (
                      <div className="text-[8px] text-gray-600 ml-2">
                         + Extras: {item.modifiers.extras.map((e: any) => e.name).join(', ')}
                      </div>
                    )}
                    {item.modifiers.options.length > 0 && (
                      <div className="text-[8px] text-gray-600 ml-2">
                         + Opción: {item.modifiers.options.join(', ')}
                      </div>
                    )}
                    {item.modifiers.note && (
                      <div className="text-[8px] text-red-700 font-bold ml-2">
                         Obs: {item.modifiers.note}
                      </div>
                    )}
                 </div>
              ))}
            </div>
            
            <div className="border-t border-black border-dashed mt-2 pt-1 w-full text-right text-[9px] space-y-0.5">
               <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(printedOrder.total)}</span>
               </div>
               <div className="flex justify-between font-bold text-xs">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(printedOrder.total)}</span>
               </div>
               <div className="flex justify-between">
                  <span>Método:</span>
                  <span>{printedOrder.payment?.method === 'qr' ? 'Pago QR' : printedOrder.payment?.method === 'mixed' ? 'Mixto' : 'Efectivo'}</span>
               </div>
               <div className="flex justify-between">
                  <span>Estado:</span>
                  <span>{printedOrder.paymentStatus === 'paid' ? 'PAGADO' : 'PENDIENTE'}</span>
               </div>
            </div>
            
            <div className="text-center text-[8px] mt-4 border-t border-black border-dotted pt-1">
               ¡Muchas gracias por su preferencia!
            </div>
          </div>

          {/* Ticket de Cocina */}
          <div className="print-page w-full flex flex-col items-center mt-8">
            <div className="text-center font-bold text-sm tracking-wider mb-0.5">COMANDA DE COCINA</div>
            <div className="text-center font-bold text-base bg-black text-white px-2 py-0.5 rounded mb-2">
              {printedOrder.displayNumber}
            </div>
            
            <div className="border-t border-b border-black border-dashed py-1 w-full text-left space-y-0.5 text-[9px]">
              <div><b>Fecha:</b> {new Date(printedOrder.createdAt).toLocaleString('es-ES')}</div>
              <div><b>Cliente:</b> {printedOrder.customerName || 'Cliente General'}</div>
              <div><b>Origen:</b> {printedOrder.orderSource === 'whatsapp' ? 'WHATSAPP' : 'LOCAL'}</div>
              <div><b>Entrega:</b> {printedOrder.fulfillmentType === 'table' ? `Mesa: ${printedOrder.tableInfo}` : printedOrder.fulfillmentType === 'pickup' ? 'Retiro en Local' : 'Delivery'}</div>
            </div>
            
            <div className="mt-2 w-full space-y-2 text-[10px]">
              {printedOrder.items.map((item: any, idx: number) => (
                 <div key={idx} className="w-full border-b border-black/10 pb-1">
                    <div className="font-bold text-xs">{item.quantity}x {item.name}</div>
                    {item.modifiers.extras.length > 0 && (
                      <div className="text-[9px] text-gray-700 ml-2 font-medium">
                         Extras: {item.modifiers.extras.map((e: any) => e.name).join(', ')}
                      </div>
                    )}
                    {item.modifiers.options.length > 0 && (
                      <div className="text-[9px] text-gray-700 ml-2 font-medium">
                         Opción: {item.modifiers.options.join(', ')}
                      </div>
                    )}
                    {item.modifiers.note && (
                      <div className="text-[9px] text-red-600 font-bold ml-2 border border-red-200 bg-red-50 p-1 mt-0.5 rounded">
                         OBS: {item.modifiers.note}
                      </div>
                    )}
                 </div>
              ))}
            </div>
            
            <div className="text-center text-[8px] mt-4 border-t border-black border-dotted pt-1">
               Burguer Lab Cocina
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
