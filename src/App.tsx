import { AlertCircle, BellRing, Flame, Clock3, PackageCheck, WalletCards } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AdminView } from './components/AdminView'
import { CajaView } from './components/CajaView'
import { BotControlPanel } from './components/BotControlPanel'
import { CocinaView } from './components/CocinaView'
import { HistorialView } from './components/HistorialView'
import { LoginView } from './components/LoginView'
import { TopBar } from './components/TopBar'
import { UnauthorizedView } from './components/UnauthorizedView'
import { notifyBotOrderConfirmed } from './lib/botApi'
import { formatCurrency } from './lib/format'
import { useAuthStore } from './store/authStore'
import { useCatalogStore } from './store/catalogStore'
import { useOrdersStore } from './store/appStore'
import type { CartItem, OrderStatus, PaymentMethod, PaymentSummary, Product, UserRole } from './types'

type View = 'caja' | 'cocina' | 'historial' | 'admin'

function getAllowedViews(role: UserRole | 'demo'): View[] {
  if (role === 'admin' || role === 'demo') {
    return ['caja', 'cocina', 'historial', 'admin']
  }

  if (role === 'caja') {
    return ['caja', 'historial']
  }

  if (role === 'pedidos') {
    return ['caja']
  }

  return ['cocina']
}

function MainShell({
  mode,
  role,
  userName,
  userId,
  onSignOut,
}: {
  mode: 'firebase' | 'local'
  role: UserRole | 'demo'
  userName: string
  userId: string
  onSignOut: () => Promise<void>
}) {
  const availableViews = getAllowedViews(role)
  const [selectedView, setSelectedView] = useState<View>(availableViews[0] ?? 'caja')
  const isSidebarCollapsed = false
  const view = availableViews.includes(selectedView) ? selectedView : availableViews[0]
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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
    state: { categories, products },
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
  } = useCatalogStore()

  const dailyTotal = useMemo(() => orders.reduce((sum, order) => (order.status !== 'cancelled' && order.paymentStatus === 'paid') ? sum + order.total : sum, 0), [orders])
  const pendingCount = useMemo(() => orders.filter((order) => order.status === 'pending').length, [orders])
  const nextOrderNumber = `#${String(sequence + 1).padStart(3, '0')}`

  useEffect(() => {
    if (!confirmation) {
      return
    }

    const timeout = window.setTimeout(() => setConfirmation(null), 2800)
    return () => window.clearTimeout(timeout)
  }, [confirmation])

  useEffect(() => {
    if (!errorMessage) {
      return
    }

    const timeout = window.setTimeout(() => setErrorMessage(null), 4200)
    return () => window.clearTimeout(timeout)
  }, [errorMessage])

  const handleSubmitOrder = async (input: {
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
  const handleAdvanceStatus = async (orderId: string, nextStatus: OrderStatus, estimatedDelay?: number) => {
    try {
      const order = orders.find((currentOrder) => currentOrder.id === orderId)
      await setOrderStatus(orderId, nextStatus, estimatedDelay)
      let botNotifyFailed = false
      if (order?.orderSource === 'whatsapp' && nextStatus === 'preparing') {
        try {
          await notifyBotOrderConfirmed(orderId, estimatedDelay ?? 10)
        } catch (error) {
          console.warn('No se pudo avisar al cliente por WhatsApp:', error)
          botNotifyFailed = true
          setErrorMessage('Pedido confirmado, pero el bot no pudo avisar el tiempo al cliente. Revisa que el bot este encendido.')
        }
      }
      if (!botNotifyFailed) setErrorMessage(null)
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

  return (
    <div className="min-h-screen bg-canvas px-4 py-5 text-ink md:px-5 xl:px-6">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.75),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(197,91,51,0.08),_transparent_25%)]" />

      {mode === 'local' ? (
        <div className="relative z-40 mx-auto mb-4 max-w-[1680px] rounded-[1.5rem] border border-[#ead7ad] bg-warningSoft px-5 py-4 text-sm font-semibold text-warning shadow-card">
          Modo local/demo activo. Este modo usa localStorage y no aplica seguridad real de produccion.
        </div>
      ) : null}

      {confirmation ? (
        <div className="pointer-events-none fixed right-5 top-5 z-50 w-[min(420px,calc(100vw-2.5rem))] rounded-[1.8rem] border border-accent/15 bg-white/95 p-4 shadow-float backdrop-blur">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-white shadow-lg shadow-accent/20">
              <PackageCheck size={22} />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.26em] text-accent">Pedido enviado</div>
              <div className="mt-1 text-2xl font-semibold text-ink">{confirmation}</div>
              <p className="mt-1 text-sm text-muted">La cocina ya lo recibio y esta listo para iniciar preparacion.</p>
            </div>
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="fixed bottom-5 right-5 z-50 w-[min(460px,calc(100vw-2.5rem))] rounded-[1.7rem] border border-[#f0cfbf] bg-white/95 p-4 shadow-float backdrop-blur">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff3ec] text-[#9c4d2a]">
              <AlertCircle size={20} />
            </div>
            <div>
              <div className="text-sm font-semibold text-ink">Accion no sincronizada</div>
              <p className="mt-1 text-sm text-muted">{errorMessage}</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className={`relative grid max-w-none gap-4 ${isSidebarCollapsed ? 'xl:grid-cols-[82px_minmax(0,1fr)]' : 'xl:grid-cols-[240px_minmax(0,1fr)]'}`}>
        <TopBar
          availableViews={availableViews}
          collapsed={isSidebarCollapsed}
          currentView={view}
          mode={mode}
          onChange={setSelectedView}
          onSignOut={onSignOut}
          rightSlot={
            <div className="space-y-3">
              {role !== 'pedidos' ? (
                <div className="rounded-[1.5rem] border border-white/80 bg-panel/92 p-4 shadow-card">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                    <WalletCards size={15} className="text-accent" />
                    Venta del dia
                  </div>
                  <div className="mt-3 text-3xl font-semibold tracking-tight text-ink">{formatCurrency(dailyTotal)}</div>
                  <div className="mt-1 text-sm text-muted">
                    {orders.filter((order) => order.status !== 'cancelled').length} pedidos activos
                  </div>
                </div>
              ) : null}

              <BotControlPanel collapsed={isSidebarCollapsed} userRole={role} />

              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <div className="rounded-[1.4rem] border border-white/80 bg-white/72 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <BellRing size={16} className="text-accent" />
                    Pendientes
                  </div>
                  <div className="mt-2 text-2xl font-semibold">{pendingCount}</div>
                </div>
                <div className="rounded-[1.4rem] border border-white/80 bg-white/72 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <Clock3 size={16} className="text-accent" />
                    Proximo
                  </div>
                  <div className="mt-2 text-2xl font-semibold">{nextOrderNumber}</div>
                </div>
                <div className="rounded-[1.4rem] border border-white/80 bg-white/72 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <Flame size={16} className="text-accent" />
                    Area
                  </div>
                  <div className="mt-2 text-sm font-semibold text-muted">
                    {view === 'caja' ? 'Tomando pedidos' : view === 'cocina' ? 'Preparacion' : view === 'historial' ? 'Reporte diario' : 'Menu y productos'}
                  </div>
                </div>
              </div>
            </div>
          }
          userName={userName}
          userRole={role}
        />

        <main className="min-w-0">
          {view === 'caja' ? (
            <CajaView
              categories={categories}
              nextOrderNumber={nextOrderNumber}
              onSubmitOrder={handleSubmitOrder}
              products={products}
              orders={orders}
              userRole={role}
              userId={userId}
              userName={userName}
              onConfirmPayment={confirmPayment}
              onCancelOrder={handleCancelOrder}
              onDeleteOrder={deleteOrder}
              onUpdateOrder={updateOrder}
              onSetOrderStatus={setOrderStatus}
            />
          ) : null}
          {view === 'cocina' ? <CocinaView orders={orders} onAdvanceStatus={handleAdvanceStatus} /> : null}
          {view === 'historial' ? (
            <HistorialView
              onAdvanceStatus={handleAdvanceStatus}
              onCancelOrder={handleCancelOrder}
              orders={orders}
              userName={userName}
              userRole={role}
            />
          ) : null}
          {view === 'admin' ? (
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
            />
          ) : null}
        </main>
      </div>
    </div>
  )
}

function App() {
  const auth = useAuthStore()

  if (auth.mode === 'local') {
    return <MainShell mode="local" onSignOut={auth.signOut} role={auth.role ?? 'demo'} userName={auth.userDisplayName ?? 'Modo demo'} userId={auth.member?.uid || `mock-${auth.role || 'admin'}`} />
  }

  if (auth.status === 'loading' && auth.userEmail === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-sm font-semibold text-muted">
        Validando acceso seguro...
      </div>
    )
  }

  if (auth.status === 'signed_out') {
    return <LoginView error={auth.error} isLoading={false} onSubmit={auth.signIn} />
  }

  if (auth.status === 'authenticating' || auth.status === 'loading') {
    return <LoginView error={auth.error} isLoading={true} onSubmit={auth.signIn} />
  }

  if (auth.status === 'unauthorized') {
    return <UnauthorizedView email={auth.userEmail} message={auth.error ?? 'Acceso no autorizado.'} onSignOut={auth.signOut} />
  }

  return <MainShell mode="firebase" onSignOut={auth.signOut} role={auth.role ?? 'caja'} userName={auth.userDisplayName ?? auth.userEmail ?? 'Usuario'} userId={auth.member?.uid ?? ''} />
}

export default App
