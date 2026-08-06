import { AlertCircle, PackageCheck, WalletCards, BellRing, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AdminView } from './components/AdminView'
import { CajaView } from './components/CajaView'
import { FloatingOrderAlert } from './components/FloatingOrderAlert'
import { BotView } from './components/BotView'
import { CocinaView } from './components/CocinaView'
import { HistorialView } from './components/HistorialView'
import { LoginView } from './components/LoginView'
import { RegisterView } from './components/RegisterView'
import { Sidebar, type ViewType } from './components/Sidebar'
import { TenantCustomizerModal } from './components/TenantCustomizerModal'
import { PrinterSettingsModal } from './components/PrinterSettingsModal'
import { PrinterDiagnosticView } from './components/PrinterDiagnosticView'
import { PrinterSettingsView } from './components/PrinterSettingsView'
import { CashSessionView } from './components/CashSessionView'
import { UnauthorizedView } from './components/UnauthorizedView'
import { notifyBotOrderConfirmed } from './lib/botApi'
import { formatCurrency } from './lib/format'
import { fetchRestaurantAccount, updateRestaurantBranding } from './lib/firebase'
import { useAuthStore } from './store/authStore'
import { useCatalogStore } from './store/catalogStore'
import { useOrdersStore } from './store/appStore'
import { startContinuousOrderAlert, stopContinuousOrderAlert } from './lib/sound'
import type { CartItem, Order, OrderStatus, PaymentMethod, PaymentSummary, Product, RestaurantBranding, UserRole } from './types'

function getDayKey(value: string | Date = new Date()) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getAllowedViews(role: UserRole | 'demo'): ViewType[] {
  if (role === 'admin' || role === 'demo') {
    return ['caja', 'cocina', 'historial', 'admin', 'bot']
  }

  if (role === 'caja') {
    return ['caja', 'historial', 'bot']
  }

  if (role === 'pedidos') {
    return ['caja', 'bot']
  }

  return ['cocina']
}

function MainShell({
  mode,
  role,
  userName,
  userId,
  restaurantId,
  onSignOut,
}: {
  mode: 'firebase' | 'local'
  role: UserRole | 'demo'
  userName: string
  userId: string
  restaurantId: string | null
  onSignOut: () => Promise<void>
}) {
  const availableViews = getAllowedViews(role)
  const [selectedView, setSelectedView] = useState<ViewType>(availableViews[0] ?? 'caja')
  const view = availableViews.includes(selectedView) ? selectedView : availableViews[0]
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false)
  const [isPrinterSettingsOpen, setIsPrinterSettingsOpen] = useState(false)

  const [branding, setBranding] = useState<RestaurantBranding>({
    name: 'PACHAX Comandero',
    primaryColor: '#0B132B',
    accentColor: '#00F0FF',
    tablesCount: 12,
  })

  // Fetch tenant branding on load
  useEffect(() => {
    if (restaurantId && mode === 'firebase') {
      void (async () => {
        const account = await fetchRestaurantAccount(restaurantId)
        if (account?.branding) {
          setBranding(account.branding)
        }
      })()
    }
  }, [restaurantId, mode])

  const {
    state: { orders, sequence },
    placeOrder,
    setOrderStatus,
    cancelOrder,
    confirmPayment,
    updateOrder,
    deleteOrder,
  } = useOrdersStore()

  const {
    state: { categories, products, quickExtras },
    createCategory,
    updateCategory,
    setCategoryVisibility,
    setCategoryActive,
    deleteCategory,
    moveCategory,
    createProduct,
    updateProduct,
    setProductVisibility,
    setProductActive,
    setProductAvailability,
    deleteProduct,
    moveProduct,
    saveQuickExtras,
  } = useCatalogStore()

  const todayKey = useMemo(() => getDayKey(), [])
  const todayOrders = useMemo(() => orders.filter((order: Order) => getDayKey(order.createdAt) === todayKey), [orders, todayKey])
  const dailyTotal = useMemo(() => todayOrders.reduce((sum: number, order: Order) => (order.status !== 'cancelled' && order.paymentStatus === 'paid') ? sum + (order.productSubtotal ?? order.total) : sum, 0), [todayOrders])
  const activeTodayCount = useMemo(() => todayOrders.filter((order: Order) => order.status !== 'cancelled').length, [todayOrders])
  const pendingCount = useMemo(() => todayOrders.filter((order: Order) => order.status === 'pending' && order.orderSource === 'whatsapp' && Boolean(order.whatsappChatId)).length, [todayOrders])
  const nextOrderNumber = `#${String(sequence + 1).padStart(3, '0')}`

  // Alerta sonora continua global para pedidos pendientes
  useEffect(() => {
    const unconfirmedOrders = orders.filter(
      (order: Order) => order.status === 'pending' && order.orderSource === 'whatsapp' && Boolean(order.whatsappChatId)
    )

    if (unconfirmedOrders.length > 0) {
      startContinuousOrderAlert()
    } else {
      stopContinuousOrderAlert()
    }

    return () => {
      stopContinuousOrderAlert()
    }
  }, [orders])

  useEffect(() => {
    if (!confirmation) return
    const timeout = window.setTimeout(() => setConfirmation(null), 2800)
    return () => window.clearTimeout(timeout)
  }, [confirmation])

  useEffect(() => {
    if (!errorMessage) return
    const timeout = window.setTimeout(() => setErrorMessage(null), 4200)
    return () => window.clearTimeout(timeout)
  }, [errorMessage])

  const handleSubmitOrder = async (input: {
    cartItems: CartItem[]
    productsById: Map<string, Product>
    payment: PaymentSummary
    paymentStatus: 'paid' | 'pending' | 'gift'
    paymentMethod: PaymentMethod | null
    expectedPaymentMethod: PaymentMethod | null
    orderSource: 'local' | 'whatsapp'
    fulfillmentType: 'table' | 'pickup' | 'delivery'
    tableInfo?: string
    customerName?: string
    customerPhone?: string
    deliveryAddress?: string
    createdBy?: string
  }) => {
    try {
      const orderNumber = await placeOrder(input)
      setErrorMessage(null)
      setConfirmation(orderNumber)
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo enviar el pedido.'
      setErrorMessage(message)
      return false
    }
  }

  const handleAdvanceStatus = async (
    orderId: string,
    nextStatus: OrderStatus,
    estimatedDelay?: number,
    options?: { suppressWhatsappDispatchNotice?: boolean; forceWhatsappDispatchNotice?: boolean },
  ) => {
    try {
      const order = orders.find((currentOrder: Order) => currentOrder.id === orderId)
      await setOrderStatus(orderId, nextStatus, estimatedDelay, options)
      if (order?.orderSource === 'whatsapp' && nextStatus === 'preparing' && order?.status !== 'delivered') {
        try {
          await notifyBotOrderConfirmed(orderId, estimatedDelay ?? 10)
        } catch (error) {
          console.warn('No se pudo avisar al cliente por WhatsApp:', error)
        }
      }
      setErrorMessage(null)
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo actualizar el estado.'
      setErrorMessage(message)
      return false
    }
  }

  const handleCancelOrder = async (orderId: string, cancelledBy: string, reason?: string) => {
    try {
      await cancelOrder(orderId, cancelledBy, reason)
      setErrorMessage(null)
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo anular el pedido.'
      setErrorMessage(message)
      return false
    }
  }

  const handleSaveBranding = async (updates: Partial<RestaurantBranding>) => {
    setBranding((prev) => ({ ...prev, ...updates }))
    if (restaurantId && mode === 'firebase') {
      await updateRestaurantBranding(restaurantId, updates)
    }
  }

  return (
    <div className="min-h-screen bg-pachaxDark text-ink px-2 sm:px-4 py-3 md:py-4 pb-20 md:pb-4">
      {/* Toast Notifications */}
      {confirmation && (
        <div className="pointer-events-none fixed right-5 top-5 z-50 w-[min(400px,calc(100vw-2rem))] rounded-3xl border border-pachaxCyan/30 bg-pachaxNavy/95 p-4 shadow-float backdrop-blur cyan-border-glow">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pachaxCyan text-pachaxDark font-bold">
              <PackageCheck size={22} />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-pachaxCyan">Pedido Registrado</div>
              <div className="text-xl font-extrabold text-ink">{confirmation}</div>
              <p className="text-xs text-muted mt-0.5">Enviado a cocina para preparación inmediata.</p>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="fixed bottom-5 right-5 z-50 w-[min(440px,calc(100vw-2rem))] rounded-3xl border border-danger/30 bg-pachaxNavy/95 p-4 shadow-float backdrop-blur">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-dangerSoft text-danger">
              <AlertCircle size={20} />
            </div>
            <div>
              <div className="text-sm font-bold text-ink">Aviso del Sistema</div>
              <p className="text-xs text-muted mt-0.5">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      <FloatingOrderAlert
        orders={orders.filter((o: Order) => o.orderSource === 'whatsapp' && Boolean(o.whatsappChatId))}
        onConfirmOrder={async (orderId, delay) => {
          await handleAdvanceStatus(orderId, 'preparing', delay)
        }}
      />

      {/* Main Layout Grid */}
      <div className="flex gap-4 items-start max-w-[1920px] mx-auto">
        {/* Sleek Compact Sidebar */}
        <Sidebar
          currentView={view}
          availableViews={availableViews}
          onChangeView={setSelectedView}
          userRole={role}
          userName={userName}
          restaurantName={branding.name}
          logoUrl={branding.logoUrl}
          pendingOrdersCount={pendingCount}
          onSignOut={onSignOut}
          onOpenCustomizer={role === 'admin' || role === 'demo' ? () => setIsCustomizerOpen(true) : undefined}
          onOpenPrinterSettings={() => setIsPrinterSettingsOpen(true)}
        />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 space-y-4">
          {/* Top Info Header */}
          <header className="rounded-3xl glass-panel border border-panelBorder px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-card">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-2xl bg-pachaxNavy flex items-center justify-center text-pachaxCyan">
                <Sparkles size={18} />
              </div>
              <div>
                <h1 className="text-base font-extrabold text-ink tracking-tight flex items-center gap-2">
                  {branding.name}
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-pachaxCyan/10 text-pachaxCyan border border-pachaxCyan/30">
                    {view.toUpperCase()}
                  </span>
                </h1>
                <p className="text-[11px] text-muted">PACHAX Comandero Multi-Restaurante</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {role !== 'pedidos' && (
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-pachaxNavy/80 border border-panelBorder text-xs">
                  <WalletCards size={15} className="text-pachaxCyan" />
                  <span className="text-muted font-medium">Venta Hoy:</span>
                  <span className="font-extrabold text-ink">{formatCurrency(dailyTotal)}</span>
                  <span className="text-[11px] text-pachaxCyan font-semibold">({activeTodayCount})</span>
                </div>
              )}

              {pendingCount > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-accentSoft border border-pachaxCyan/40 text-pachaxCyan text-xs font-bold animate-pulse">
                  <BellRing size={14} />
                  <span>{pendingCount} Pendiente(s)</span>
                </div>
              )}
            </div>
          </header>

          {/* Views Render */}
          <div>
            {view === 'caja' && (
              <CajaView
                categories={categories}
                nextOrderNumber={nextOrderNumber}
                onSubmitOrder={handleSubmitOrder}
                products={products}
                orders={orders}
                quickExtras={quickExtras ?? []}
                userRole={role}
                userId={userId}
                userName={userName}
                onConfirmPayment={confirmPayment}
                onCancelOrder={handleCancelOrder}
                onDeleteOrder={deleteOrder}
                onUpdateOrder={updateOrder}
                onSetOrderStatus={handleAdvanceStatus}
              />
            )}
            {view === 'cocina' && <CocinaView orders={orders} onAdvanceStatus={handleAdvanceStatus} />}
            {view === 'historial' && (
              <HistorialView
                onAdvanceStatus={handleAdvanceStatus}
                onCancelOrder={handleCancelOrder}
                orders={orders}
                userName={userName}
                userRole={role}
              />
            )}
            {view === 'admin' && (
              <AdminView
                categories={categories}
                onCreateCategory={createCategory}
                onCreateProduct={createProduct}
                onDeleteCategory={deleteCategory}
                onDeleteProduct={deleteProduct}
                onMoveCategory={moveCategory}
                onMoveProduct={moveProduct}
                onSetCategoryActive={setCategoryActive}
                onSetCategoryVisibility={setCategoryVisibility}
                onSetProductActive={setProductActive}
                onSetProductAvailability={setProductAvailability}
                onSetProductVisibility={setProductVisibility}
                onUpdateCategory={updateCategory}
                onUpdateProduct={updateProduct}
                products={products}
                quickExtras={quickExtras ?? []}
                onSaveQuickExtras={saveQuickExtras}
              />
            )}
            {view === 'bot' && <BotView />}
            {view === 'printer-diagnostic' && <PrinterDiagnosticView />}
            {view === 'printer-settings' && <PrinterSettingsView />}
            {view === 'cash-session' && <CashSessionView />}
          </div>
        </main>
      </div>

      {/* Tenant Customizer Modal */}
      <TenantCustomizerModal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        initialBranding={branding}
        onSave={handleSaveBranding}
      />

      {/* Printer Settings Modal */}
      <PrinterSettingsModal
        isOpen={isPrinterSettingsOpen}
        onClose={() => setIsPrinterSettingsOpen(false)}
      />
    </div>
  )
}

function App() {
  const auth = useAuthStore()
  const [authView, setAuthView] = useState<'login' | 'register'>('login')

  if (auth.mode === 'local') {
    return (
      <MainShell
        mode="local"
        onSignOut={auth.signOut}
        role={auth.role ?? 'demo'}
        userName={auth.userDisplayName ?? 'Modo demo'}
        userId={auth.member?.uid || `mock-${auth.role || 'admin'}`}
        restaurantId={auth.restaurantId}
      />
    )
  }

  if (auth.status === 'loading' && auth.userEmail === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-100">
        <h1 className="text-4xl font-serif italic text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-sky-400 animate-pulse tracking-wide mb-3">
          Pachax Flow
        </h1>
        <div className="h-1 w-24 bg-gradient-to-r from-indigo-600 to-sky-400 rounded-full animate-pulse" />
      </div>
    )
  }

  if (auth.status === 'signed_out' || authView === 'register') {
    if (authView === 'register') {
      return (
        <RegisterView
          onSuccess={() => setAuthView('login')}
          onSwitchToLogin={() => setAuthView('login')}
        />
      )
    }
    return (
      <LoginView
        error={auth.error}
        isLoading={false}
        onSubmit={auth.signIn}
        onSwitchToRegister={() => setAuthView('register')}
      />
    )
  }

  if (auth.status === 'authenticating' || auth.status === 'loading') {
    return (
      <LoginView
        error={auth.error}
        isLoading={true}
        onSubmit={auth.signIn}
        onSwitchToRegister={() => setAuthView('register')}
      />
    )
  }

  if (auth.status === 'unauthorized') {
    return <UnauthorizedView email={auth.error} message={auth.error ?? 'Acceso no autorizado.'} onSignOut={auth.signOut} />
  }

  return (
    <MainShell
      mode="firebase"
      onSignOut={auth.signOut}
      role={auth.role ?? 'caja'}
      userName={auth.userDisplayName ?? auth.userEmail ?? 'Usuario'}
      userId={auth.member?.uid ?? ''}
      restaurantId={auth.restaurantId}
    />
  )
}

export default App
