import {
  ChevronDown,
  ChevronUp,
  CookingPot,
  LoaderCircle,
  MessageSquareText,
  Minus,
  Plus,
  Sparkles,
  Trash2,
  DollarSign,
  Ban,
  FileEdit,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatCurrency } from '../lib/format'
import type { CartItem, CatalogCategory, PaymentMethod, PaymentSummary, Product, Order, OrderStatus, FulfillmentType } from '../types'
import { Button } from './ui/Button'
import { Panel } from './ui/Panel'

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
    <div className="relative h-36 overflow-hidden xl:h-32 2xl:h-52">
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
  onSetOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>
}) {
  // Main view mode: either POS catalog or orders list
  const [viewMode, setViewMode] = useState<'new_order' | 'orders_list'>('new_order')
  const [orderFilter, setOrderFilter] = useState<
    'active' | 'whatsapp' | 'local' | 'pending_payment' | 'ready_for_pickup' | 'ready_for_dispatch' | 'out_for_delivery' | 'delivered' | 'cancelled'
  >('active')

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
    fulfillmentType === 'delivery'
      ? customerName.trim() !== '' && customerPhone.trim() !== '' && deliveryAddress.trim() !== ''
      : orderSource === 'whatsapp'
        ? customerName.trim() !== '' && customerPhone.trim() !== ''
        : true

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

  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        // Pedidos operator role can only see their own active orders
        if (userRole === 'pedidos') {
          if (order.createdBy !== userId) return false
          if (order.status === 'cancelled') return false
        }

        switch (orderFilter) {
          case 'active':
            return order.status !== 'delivered' && order.status !== 'cancelled'
          case 'whatsapp':
            return order.orderSource === 'whatsapp'
          case 'local':
            return order.orderSource === 'local'
          case 'pending_payment':
            return order.paymentStatus === 'pending' && order.status !== 'cancelled'
          case 'ready_for_pickup':
            return order.status === 'ready_for_pickup'
          case 'ready_for_dispatch':
            return order.status === 'ready_for_dispatch'
          case 'out_for_delivery':
            return order.status === 'out_for_delivery'
          case 'delivered':
            return order.status === 'delivered'
          case 'cancelled':
            return order.status === 'cancelled'
          default:
            return true
        }
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [orders, orderFilter, userRole, userId])

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
  }

  return (
    <div className="space-y-4">
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
              setOrderFilter('pending_payment')
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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[1.6fr_0.98fr] 2xl:gap-5">
        
        {/* Main Panel Section */}
        <section className={`min-w-0 space-y-5 ${activeTab === 'catalog' ? 'block' : 'hidden xl:block'}`}>
          {viewMode === 'new_order' ? (
            <>
              {/* POS Categories & Catalog */}
              <div className="flex flex-wrap gap-2 2xl:gap-3">
                {visibleCategories.map((category) => {
                  const isActive = category.id === activeCategory

                  return (
                    <button
                      key={category.id}
                      className={`group rounded-[1.2rem] border px-3 py-2 text-left transition duration-150 2xl:rounded-[1.6rem] 2xl:px-4 2xl:py-3 ${
                        isActive
                          ? 'border-accent/15 bg-ink text-white shadow-lg shadow-black/8'
                          : 'border-white/80 bg-white/72 text-ink hover:-translate-y-0.5 hover:bg-white'
                      }`}
                      onClick={() => setSelectedCategoryId(category.id)}
                    >
                      <div className="flex items-center gap-2 2xl:gap-3">
                        <div
                          className={`rounded-xl px-2.5 py-2 text-[10px] font-bold tracking-[0.2em] 2xl:rounded-2xl 2xl:px-3 2xl:text-[11px] 2xl:tracking-[0.24em] ${
                            isActive ? 'bg-white/10 text-white' : 'bg-accentWash text-accent'
                          }`}
                        >
                          {category.emoji}
                        </div>
                        <div>
                          <div className="text-sm font-semibold">{category.name}</div>
                          <div className={`hidden text-xs 2xl:block ${isActive ? 'text-white/65' : 'text-muted'}`}>
                            {category.subtitle || 'Categoria activa'}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3 2xl:gap-4">
                {visibleProducts.map((product) => (
                  <Panel
                    key={product.id}
                    className="group overflow-hidden border-white/80 bg-white/78 transition duration-200 hover:-translate-y-1 hover:shadow-float"
                  >
                    <ProductVisual alt={product.name} badge={product.badge} image={product.image} />

                    <div className="space-y-3 p-4 2xl:space-y-4 2xl:p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="text-lg font-semibold text-ink 2xl:text-xl">{product.name}</h3>
                          <p className="mt-1 text-sm leading-5 text-muted 2xl:mt-2 2xl:leading-6">{product.description || 'Sin descripcion'}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-lg font-semibold text-ink">{formatCurrency(product.price)}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <div className="hidden flex-wrap gap-2 text-xs text-muted 2xl:flex">
                          {product.extras?.length ? <span className="rounded-full bg-accentWash px-3 py-1">Extras</span> : null}
                          {product.options?.length ? <span className="rounded-full bg-accentWash px-3 py-1">Opciones</span> : null}
                        </div>
                        <Button
                          className="min-w-[110px] 2xl:min-w-[124px]"
                          size="sm"
                          onClick={() => {
                            const nextItem = buildCartItem(product)
                            setCartItems((currentItems) => [...currentItems, nextItem])
                            setExpandedLineId(nextItem.lineId)
                          }}
                        >
                          <Plus size={16} />
                          Agregar
                        </Button>
                      </div>
                    </div>
                  </Panel>
                ))}

                {visibleProducts.length === 0 ? (
                  <Panel className="col-span-full border-dashed border-lineStrong bg-white/55 p-8 text-center text-sm text-muted">
                    No hay productos disponibles en esta categoria.
                  </Panel>
                ) : null}
              </div>
            </>
          ) : (
            /* Orders Queue / List view */
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 bg-white/40 p-2 rounded-2xl border border-line shadow-sm">
                {(() => {
                  const filterOptions: Array<{
                    id: typeof orderFilter
                    label: string
                  }> = [
                    { id: 'active', label: 'Activos' },
                    { id: 'whatsapp', label: 'WhatsApp' },
                    { id: 'local', label: 'Local' },
                    { id: 'pending_payment', label: 'Cobros Pendientes' },
                    { id: 'ready_for_pickup', label: 'Listos Retiro' },
                    { id: 'ready_for_dispatch', label: 'Listos Despacho' },
                    { id: 'out_for_delivery', label: 'En Delivery' },
                    { id: 'delivered', label: 'Entregados' },
                    { id: 'cancelled', label: 'Anulados' },
                  ]
                  return filterOptions.map((filter) => {
                    const isActive = orderFilter === filter.id
                    return (
                      <button
                        key={filter.id}
                        type="button"
                        className={`px-3 py-1.5 rounded-xl text-xs font-black tracking-wide transition ${
                          isActive
                            ? 'bg-ink text-white shadow-sm'
                            : 'bg-white/70 border border-line text-ink hover:bg-panel'
                        }`}
                        onClick={() => setOrderFilter(filter.id)}
                      >
                        {filter.label}
                      </button>
                    )
                  })
                })()}
              </div>

              <div className="space-y-3.5">
                {filteredOrders.length === 0 ? (
                  <div className="rounded-[1.5rem] border border-dashed border-line p-10 text-center text-muted font-semibold bg-white/50">
                    No se encontraron pedidos con este filtro.
                  </div>
                ) : (
                  filteredOrders.map((order) => {
                    const isPaid = order.paymentStatus === 'paid'
                    const displayStatus =
                      order.status === 'pending'
                        ? 'Pendiente en Cocina'
                        : order.status === 'ready_for_pickup'
                          ? 'Listo para Retirar'
                          : order.status === 'ready_for_dispatch'
                            ? 'Listo para Despachar'
                            : order.status === 'out_for_delivery'
                              ? 'En Delivery'
                              : order.status === 'delivered'
                                ? 'Entregado'
                                : order.status === 'cancelled'
                                  ? 'Anulado'
                                  : order.status

                    const statusColor =
                      order.status === 'pending'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : order.status === 'ready_for_pickup'
                          ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                          : order.status === 'ready_for_dispatch'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : order.status === 'out_for_delivery'
                              ? 'bg-orange-50 text-orange-850 border-orange-200'
                              : order.status === 'delivered'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-red-50 text-red-800 border-red-200'

                    return (
                      <div key={order.id} className="rounded-[1.6rem] border border-line bg-white p-5 shadow-card hover:shadow-lg transition-all duration-200 space-y-3.5">
                        <div className="flex items-start justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-black text-ink">{order.displayNumber}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                              order.orderSource === 'whatsapp' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {order.orderSource === 'whatsapp' ? 'WhatsApp' : 'Local'}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${statusColor} border`}>
                              {displayStatus}
                            </span>
                          </div>
                          <span className="text-xs font-semibold text-muted">
                            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Customer & Fulfillment Info */}
                        <div className="grid gap-2.5 sm:grid-cols-2 text-xs">
                          <div>
                            <span className="font-bold text-muted">Modalidad: </span>
                            <span className="font-semibold text-ink">
                              {order.fulfillmentType === 'table' ? `Mesa ${order.tableInfo || 'N/D'}` : order.fulfillmentType === 'pickup' ? 'Retiro' : 'Delivery'}
                            </span>
                          </div>
                          {order.customerName ? (
                            <div>
                              <span className="font-bold text-muted">Cliente: </span>
                              <span className="font-semibold text-ink">{order.customerName}</span>
                            </div>
                          ) : null}
                          {order.customerPhone ? (
                            <div>
                              <span className="font-bold text-muted">Teléfono: </span>
                              <span className="font-semibold text-ink">{order.customerPhone}</span>
                            </div>
                          ) : null}
                          {order.deliveryAddress ? (
                            <div className="sm:col-span-2">
                              <span className="font-bold text-muted">Dirección: </span>
                              <span className="font-semibold text-ink">{order.deliveryAddress}</span>
                            </div>
                          ) : null}
                          {order.createdBy ? (
                            <div className="sm:col-span-2">
                              <span className="font-bold text-muted text-[10px] uppercase tracking-wider">Creado por: </span>
                              <span className="font-semibold text-muted text-[10px]">{order.createdBy.replace('mock-', '')}</span>
                            </div>
                          ) : null}
                        </div>

                        {/* Order items summary */}
                        <div className="border-t border-dashed border-line pt-3 text-xs text-ink space-y-1.5">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex justify-between">
                              <span>{item.quantity}x {item.name}</span>
                              <span className="text-muted font-semibold">{formatCurrency(item.lineTotal)}</span>
                            </div>
                          ))}
                        </div>

                        {/* Total, Payment status & Actions */}
                        <div className="flex items-center justify-between flex-wrap gap-3 border-t border-line pt-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-ink">Total: {formatCurrency(order.total)}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${
                              isPaid ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}>
                              {isPaid ? `PAGADO · ${String(order.paymentMethod || order.payment.method).toUpperCase()}` : 'PENDIENTE'}
                            </span>
                          </div>

                          {/* Order Actions */}
                          <div className="flex gap-2">
                            {/* Quick payment button */}
                            {userRole !== 'pedidos' && !isPaid && order.status !== 'cancelled' ? (
                              <button
                                type="button"
                                className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-black tracking-wide transition shadow-md shadow-emerald-500/10"
                                onClick={() => {
                                  setPayingOrder(order)
                                  setFastPayMethod('cash')
                                  setFastCashReceived('')
                                  setFastCashSplit('')
                                }}
                              >
                                <DollarSign size={13} />
                                Cobrar
                              </button>
                            ) : null}

                            {/* Edit order details (based on role restrictions) */}
                            {(userRole !== 'pedidos' && order.status !== 'delivered' && order.status !== 'cancelled') ||
                             (userRole === 'pedidos' && order.createdBy === userId && order.status === 'pending') ? (
                              <button
                                type="button"
                                className="flex items-center gap-1 bg-accent hover:bg-accent/90 text-white px-3 py-1.5 rounded-xl text-xs font-black tracking-wide transition shadow-md shadow-accent/10"
                                onClick={() => handleEditOrder(order)}
                              >
                                <FileEdit size={13} />
                                Editar
                              </button>
                            ) : null}

                            {/* State advancement buttons */}
                            {userRole !== 'pedidos' && order.status === 'ready_for_dispatch' ? (
                              <button
                                type="button"
                                className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-xl text-xs font-black tracking-wide transition shadow-sm"
                                onClick={() => onSetOrderStatus(order.id, 'out_for_delivery')}
                              >
                                Despachar
                              </button>
                            ) : null}

                            {userRole !== 'pedidos' && (order.status === 'ready_for_pickup' || order.status === 'out_for_delivery') ? (
                              <button
                                type="button"
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl text-xs font-black tracking-wide transition shadow-sm"
                                onClick={() => onSetOrderStatus(order.id, 'delivered')}
                              >
                                Entregar
                              </button>
                            ) : null}

                             {/* Cancel order button with reason */}
                             {userRole !== 'pedidos' && order.status !== 'cancelled' && order.status !== 'delivered' ? (
                               <button
                                 type="button"
                                 className="flex items-center gap-1 bg-red-50 border border-red-200 hover:bg-red-100 text-red-800 px-3 py-1.5 rounded-xl text-xs font-black tracking-wide transition"
                                 onClick={() => {
                                   if (order.paymentStatus === 'paid') {
                                     window.alert('Un pedido cobrado requiere devolución antes de poder anularse.')
                                     return
                                   }
                                   setCancellingOrder(order)
                                   setCancelReason('')
                                 }}
                               >
                                 <Ban size={13} />
                                 Anular
                               </button>
                             ) : null}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </section>

        {/* Sidebar Checkout Cart Panel */}
        <aside className={`min-w-0 xl:sticky xl:top-5 xl:self-start ${activeTab === 'cart' ? 'block' : 'hidden xl:block'}`}>
          <Panel className="flex min-h-[76vh] flex-col overflow-hidden border-white/85 bg-[#fffdfb]">
            <div className="border-b border-line px-4 pb-4 pt-4 2xl:px-5 2xl:pb-5 2xl:pt-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">Pedido actual</p>
                  <h2 className="mt-2 text-xl font-semibold text-ink 2xl:text-2xl">Carrito de caja</h2>
                </div>
                <div className="rounded-[1rem] border border-line bg-accentWash px-3 py-2.5 text-right shadow-insetSoft 2xl:rounded-[1.2rem] 2xl:px-4 2xl:py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Proximo</div>
                  <div className="mt-1 text-xl font-semibold text-ink">{nextOrderNumber}</div>
                </div>
              </div>
            </div>

            {/* Editing order info indicator */}
            {editingOrderId ? (
              <div className="px-4 pt-3">
                <div className="flex items-center justify-between rounded-2xl border border-orange-200 bg-orange-50/70 p-3 text-xs text-orange-900 font-semibold shadow-sm">
                  <span>Editando Pedido Activo</span>
                  <button
                    type="button"
                    className="rounded-lg bg-orange-100 hover:bg-orange-200 px-2 py-1 transition font-bold"
                    onClick={handleDiscardEdit}
                  >
                    Descartar
                  </button>
                </div>
              </div>
            ) : null}

            <div className="border-b border-line px-4 py-4 2xl:px-5">
              <div className="grid grid-cols-3 gap-2 2xl:gap-3">
                <div className="rounded-[1rem] border border-line bg-panel/80 p-3 2xl:rounded-[1.3rem]">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Lineas</div>
                  <div className="mt-1 text-xl font-semibold text-ink">{cartItems.length}</div>
                </div>
                <div className="rounded-[1rem] border border-line bg-panel/80 p-3 2xl:rounded-[1.3rem]">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Productos</div>
                  <div className="mt-1 text-xl font-semibold text-ink">{totalUnits}</div>
                </div>
                <div className="rounded-[1rem] border border-line bg-panel/80 p-3 2xl:rounded-[1.3rem]">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Subtotal</div>
                  <div className="mt-1 text-xl font-semibold text-ink">{formatCurrency(cartTotal)}</div>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 2xl:space-y-4 2xl:px-5 2xl:py-5">
              {cartItems.length === 0 ? (
                <div className="rounded-[1.4rem] border border-dashed border-lineStrong bg-canvas/60 p-5 text-center 2xl:rounded-[1.8rem] 2xl:p-7">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-accent shadow-insetSoft">
                    <CookingPot size={24} />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-ink">Todavia no hay productos</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">
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
                    className={`rounded-[1.4rem] border bg-white p-3 transition duration-150 2xl:rounded-[1.8rem] 2xl:p-4 ${
                      isExpanded ? 'border-accent/20 shadow-card' : 'border-line'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {isImageUrl(product.image) ? (
                        <img alt={product.name} className="h-20 w-20 rounded-[1.3rem] object-cover" src={product.image} />
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-[1.3rem] bg-accentWash text-4xl">{product.image}</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-base font-semibold text-ink">{product.name}</h3>
                            <p className="mt-1 text-sm text-muted">{formatCurrency(product.price)}</p>
                          </div>
                          <button
                            type="button"
                            className="rounded-full p-2 text-muted transition hover:bg-accentWash hover:text-accent"
                            onClick={() => removeItem(item.lineId)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2 rounded-full border border-line bg-panel/80 p-1">
                            <button
                              type="button"
                              className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-white hover:text-ink"
                              onClick={() =>
                                updateItem(item.lineId, (currentItem) => ({
                                  ...currentItem,
                                  quantity: Math.max(1, currentItem.quantity - 1),
                                }))
                              }
                            >
                              <Minus size={16} />
                            </button>
                            <div className="min-w-8 text-center text-sm font-semibold text-ink">{item.quantity}</div>
                            <button
                              type="button"
                              className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-white transition hover:scale-[1.03]"
                              onClick={() =>
                                updateItem(item.lineId, (currentItem) => ({
                                  ...currentItem,
                                  quantity: currentItem.quantity + 1,
                                }))
                              }
                            >
                              <Plus size={16} />
                            </button>
                          </div>

                          <div className="text-right">
                            <div className="text-xs uppercase tracking-[0.14em] text-muted">Linea</div>
                            <div className="text-lg font-semibold text-ink">{formatCurrency(lineTotal)}</div>
                          </div>
                        </div>

                        {hasModifiers ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {selectedExtras.map((extra) => (
                              <span key={extra.id} className="rounded-full bg-accentWash px-3 py-1 text-xs font-semibold text-accent">
                                {extra.name}
                              </span>
                            ))}
                            {selectedOptions.map((option) => (
                              <span key={option} className="rounded-full bg-canvas px-3 py-1 text-xs font-semibold text-ink">
                                {option}
                              </span>
                            ))}
                            {item.modifiers.note ? (
                              <span className="rounded-full bg-warningSoft px-3 py-1 text-xs font-semibold text-warning">Nota cargada</span>
                            ) : null}
                          </div>
                        ) : null}

                        <button
                          type="button"
                          className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-accent 2xl:mt-4"
                          onClick={() => setExpandedLineId((currentLineId) => (currentLineId === item.lineId ? null : item.lineId))}
                        >
                          <Sparkles size={15} />
                          {isExpanded ? 'Ocultar detalles' : 'Personalizar'}
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>
                    </div>

                    {isExpanded ? (
                      <div className="mt-4 space-y-4 border-t border-line pt-4">
                        {product.extras?.length ? (
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted">Extras</p>
                            <div className="flex flex-wrap gap-2">
                              {product.extras.map((extra) => {
                                const isSelected = selectedExtras.some((selectedExtra) => selectedExtra.id === extra.id)

                                return (
                                  <button
                                    key={extra.id}
                                    type="button"
                                    className={`rounded-full px-3 py-2 text-sm transition ${
                                      isSelected ? 'bg-ink text-white' : 'bg-accentWash text-ink hover:bg-accentSoft'
                                    }`}
                                    onClick={() =>
                                      updateItem(item.lineId, (currentItem) => {
                                        const alreadySelected = currentItem.modifiers.extras.some(
                                          (selectedExtra) => selectedExtra.id === extra.id,
                                        )

                                        return {
                                          ...currentItem,
                                          modifiers: {
                                            ...currentItem.modifiers,
                                            extras: alreadySelected
                                              ? currentItem.modifiers.extras.filter((selectedExtra) => selectedExtra.id !== extra.id)
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
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted">Modificadores</p>
                            <div className="flex flex-wrap gap-2">
                              {product.options.map((option) => {
                                const isSelected = selectedOptions.includes(option.label)

                                return (
                                  <button
                                    key={option.id}
                                    type="button"
                                    className={`rounded-full px-3 py-2 text-sm transition ${
                                      isSelected ? 'bg-accent text-white' : 'bg-canvas text-ink hover:bg-accentSoft'
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
                          <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                            <MessageSquareText size={14} />
                            Observacion para cocina
                          </label>
                          <textarea
                            className="min-h-20 w-full rounded-[1.4rem] border border-line bg-canvas/35 px-4 py-3 text-sm text-ink outline-none transition placeholder:text-muted focus:border-accent"
                            placeholder="Ej. salsa aparte, pan bien tostado, sin sal..."
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

            <div className="border-t border-line bg-white/80 px-4 py-4 2xl:px-5 2xl:py-5">
              <div className="mb-4 rounded-[1.2rem] border border-line bg-panel/90 p-4 2xl:rounded-[1.6rem]">
                <div className="flex items-center justify-between text-sm text-muted">
                  <span>Resumen</span>
                  <span>{totalUnits} productos</span>
                </div>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Subtotal</div>
                    <div className="mt-1 text-2xl font-semibold text-ink 2xl:text-3xl">{formatCurrency(cartTotal)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Ticket</div>
                    <div className="mt-1 text-xl font-semibold text-ink">{nextOrderNumber}</div>
                  </div>
                </div>
              </div>

              {/* Order source selector for admin/caja roles */}
              {userRole !== 'pedidos' ? (
                <div className="mb-3 rounded-[1.2rem] border border-line bg-white p-3 2xl:rounded-[1.4rem]">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Origen</div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {[
                      { id: 'local', label: 'Local' },
                      { id: 'whatsapp', label: 'WhatsApp' },
                    ].map((option) => {
                      const isActive = orderSource === option.id

                      return (
                        <button
                          key={option.id}
                          type="button"
                          className={`rounded-[0.9rem] border py-2 text-sm font-semibold transition ${
                            isActive ? 'border-ink bg-ink text-white' : 'border-line bg-panel/80 text-ink hover:bg-panel'
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
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              {/* Delivery Modality Selection */}
              <div className="mb-3 rounded-[1.2rem] border border-line bg-white p-3 2xl:rounded-[1.4rem]">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Entrega</div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                {(() => {
                  const options: Array<{
                    id: FulfillmentType
                    label: string
                    disabled?: boolean
                  }> = [
                    { id: 'table', label: 'Mesa', disabled: userRole === 'pedidos' || orderSource === 'whatsapp' },
                    { id: 'pickup', label: 'Retiro' },
                    { id: 'delivery', label: 'Despacho' },
                  ]
                  return options.map((option) => {
                    const isActive = fulfillmentType === option.id

                    if (option.disabled) return null

                    return (
                      <button
                        key={option.id}
                        type="button"
                        className={`rounded-[0.9rem] border py-2 text-xs font-semibold transition ${
                          isActive ? 'border-ink bg-ink text-white' : 'border-line bg-panel/80 text-ink hover:bg-panel'
                        }`}
                        onClick={() => setFulfillmentType(option.id)}
                      >
                        {option.label}
                      </button>
                    )
                  })
                })()}
                </div>

                {fulfillmentType === 'table' ? (
                  <div className="mt-2">
                    <input
                      className="w-full rounded-[0.9rem] border border-line bg-canvas/35 px-3 py-2 text-sm text-ink outline-none transition focus:border-accent"
                      placeholder="Mesa (ej: 4, Terraza 2)"
                      value={tableInfo}
                      onChange={(event) => setTableInfo(event.target.value)}
                    />
                  </div>
                ) : null}
              </div>

              {/* Customer Contact metadata fields */}
              {(orderSource === 'whatsapp' || fulfillmentType === 'delivery') ? (
                <div className="mb-3 rounded-[1.2rem] border border-line bg-white p-3 2xl:rounded-[1.4rem] space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Datos de Contacto</div>
                  <input
                    className="w-full rounded-[0.9rem] border border-line bg-canvas/35 px-3 py-2 text-xs text-ink outline-none transition focus:border-accent"
                    placeholder="Nombre del Cliente"
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                  />
                  <input
                    className="w-full rounded-[0.9rem] border border-line bg-canvas/35 px-3 py-2 text-xs text-ink outline-none transition focus:border-accent"
                    placeholder="Teléfono"
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                  />
                  {fulfillmentType === 'delivery' ? (
                    <textarea
                      className="w-full min-h-[50px] rounded-[0.9rem] border border-line bg-canvas/35 px-3 py-2 text-xs text-ink outline-none transition focus:border-accent"
                      placeholder="Dirección completa"
                      value={deliveryAddress}
                      onChange={(event) => setDeliveryAddress(event.target.value)}
                    />
                  ) : null}
                </div>
              ) : null}

              {/* Payment status and method selector */}
              <div className="mb-4 rounded-[1.2rem] border border-line bg-white p-3 2xl:rounded-[1.4rem]">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Estado de Pago</div>
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
                        className={`rounded-[0.9rem] border py-2 text-sm font-semibold transition ${
                          isActive ? 'border-ink bg-ink text-white' : 'border-line bg-panel/80 text-ink hover:bg-panel'
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
                        {option.label}
                      </button>
                    )
                  })}
                </div>

                {paymentStatus === 'paid' ? (
                  <div className="mt-3 border-t border-dashed border-line pt-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Método de Pago</div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {[
                        { id: 'cash', label: 'Efectivo' },
                        { id: 'qr', label: 'QR' },
                        { id: 'mixed', label: 'Mixto' },
                      ].map((option) => {
                        const isActive = paymentMethod === option.id

                        return (
                          <button
                            key={option.id}
                            type="button"
                            className={`rounded-[0.8rem] border py-1.5 text-xs font-semibold transition ${
                              isActive ? 'border-ink bg-ink text-white' : 'border-line bg-panel/80 text-ink hover:bg-panel'
                            }`}
                            onClick={() => setPaymentMethod(option.id as PaymentMethod)}
                          >
                            {option.label}
                          </button>
                        )
                      })}
                    </div>

                    {paymentMethod === 'cash' ? (
                      <div className="mt-3 space-y-2">
                        <label className="block">
                          <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">Recibido</div>
                          <input
                            className="w-full rounded-[0.8rem] border border-line bg-canvas/35 px-3 py-2 text-sm text-ink outline-none transition focus:border-accent"
                            inputMode="decimal"
                            placeholder="0"
                            value={cashReceivedInput}
                            onChange={(event) => setCashReceivedInput(event.target.value)}
                          />
                        </label>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted">Cambio</span>
                          <span className="font-semibold text-ink">{formatCurrency(change)}</span>
                        </div>
                      </div>
                    ) : null}

                    {paymentMethod === 'mixed' ? (
                      <div className="mt-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <label className="block">
                            <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Efectivo</div>
                            <input
                              className="w-full rounded-[0.8rem] border border-line bg-canvas/35 px-2 py-1.5 text-xs text-ink outline-none transition focus:border-accent"
                              inputMode="decimal"
                              placeholder="0"
                              value={cashSplitInput}
                              onChange={(event) => setCashSplitInput(event.target.value)}
                            />
                          </label>
                          <div className="block">
                            <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Monto QR</div>
                            <div className="rounded-[0.8rem] border border-line bg-panel/80 px-2 py-1.5 text-xs font-semibold text-ink h-[34px] flex items-center">
                              {formatCurrency(qrAmount)}
                            </div>
                          </div>
                        </div>
                        <label className="block mt-2">
                          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Efectivo Recibido</div>
                          <input
                            className="w-full rounded-[0.8rem] border border-line bg-canvas/35 px-2 py-1.5 text-xs text-ink outline-none transition focus:border-accent"
                            inputMode="decimal"
                            placeholder="0"
                            value={cashReceivedInput}
                            onChange={(event) => setCashReceivedInput(event.target.value)}
                          />
                        </label>
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className="text-muted">Cambio</span>
                          <span className="font-semibold text-ink">{formatCurrency(change)}</span>
                        </div>
                      </div>
                    ) : null}

                    {paymentMethod === 'qr' ? (
                      <div className="mt-3 rounded-[0.8rem] bg-panel/80 p-2.5 text-xs">
                        <div className="text-muted">Monto por QR</div>
                        <div className="mt-1 font-semibold text-ink">{formatCurrency(cartTotal)}</div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  /* Expected payment method selection for pending orders */
                  <div className="mt-3 border-t border-dashed border-line pt-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Método Esperado</div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {[
                        { id: 'cash', label: 'Efectivo' },
                        { id: 'qr', label: 'QR' },
                        { id: 'mixed', label: 'Mixto' },
                      ].map((option) => {
                        const isActive = expectedPaymentMethod === option.id

                        return (
                          <button
                            key={option.id}
                            type="button"
                            className={`rounded-[0.8rem] border py-1.5 text-xs font-semibold transition ${
                              isActive ? 'border-ink bg-ink text-white' : 'border-line bg-panel/80 text-ink hover:bg-panel'
                            }`}
                            onClick={() => setExpectedPaymentMethod(option.id as PaymentMethod)}
                          >
                            {option.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

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
                    customerName: (orderSource === 'whatsapp' || fulfillmentType === 'delivery') ? customerName.trim() : '',
                    customerPhone: (orderSource === 'whatsapp' || fulfillmentType === 'delivery') ? customerPhone.trim() : '',
                    deliveryAddress: fulfillmentType === 'delivery' ? deliveryAddress.trim() : '',
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
                  }

                  setIsSubmitting(false)
                }}
              >
                {isSubmitting ? <LoaderCircle size={18} className="animate-spin" /> : <CookingPot size={18} />}
                {isSubmitting ? 'Guardando...' : editingOrderId ? 'Guardar Cambios' : 'Enviar a cocina'}
              </Button>
            </div>
          </Panel>
        </aside>
      </div>

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
    </div>
  )
}
