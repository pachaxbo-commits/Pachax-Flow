export type CategoryId = string

export type OrderStatus =
  | 'pending'
  | 'preparing'
  | 'ready'
  | 'ready_for_pickup'
  | 'ready_for_dispatch'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'

export type PaymentMethod = 'cash' | 'qr' | 'mixed'
export type OrderSource = 'local' | 'whatsapp'
export type FulfillmentType = 'table' | 'pickup' | 'delivery'
export type ProductAvailability = 'available' | 'soldout'
export type UserRole =
  | 'superadmin'
  | 'owner'
  | 'admin'
  | 'manager'
  | 'caja'
  | 'cocina'
  | 'pedidos'
  | 'delivery'
  | 'accountant'
  | 'readonly'

export type RepositoryConnectionMode = 'connected' | 'connecting' | 'local' | 'offline'

export interface RepositoryStatus {
  mode: RepositoryConnectionMode
  label: string
  detail: string
  source: 'firebase' | 'local'
  hasPendingWrites: boolean
  isOnline: boolean
}

/** Base interface for all tenant-scoped entities supporting versioning & soft deletes */
export interface TenantScopedEntity {
  schemaVersion: number
  restaurantId: string
  branchId: string
  createdAt: string
  updatedAt?: string
  createdBy?: string
  updatedBy?: string
  deletedAt?: string
  deletedBy?: string
  isDeleted?: boolean
}

export interface Branch {
  id: string
  restaurantId: string
  name: string
  code: string
  address?: string
  phone?: string
  isActive: boolean
  isMain: boolean
  createdAt: string
}

export type Permission =
  | 'orders.create'
  | 'orders.edit'
  | 'orders.cancel'
  | 'orders.applyDiscount'
  | 'orders.reopen'
  | 'orders.viewAll'
  | 'payments.create'
  | 'payments.refund'
  | 'cash.open'
  | 'cash.close'
  | 'catalog.create'
  | 'catalog.edit'
  | 'catalog.delete'
  | 'inventory.view'
  | 'reports.view'
  | 'users.create'
  | 'settings.manage'
  | 'printers.manage'
  | 'branches.manage'

export type PlanFeature =
  | 'pos'
  | 'tables'
  | 'delivery'
  | 'kitchenDisplay'
  | 'thermalPrinting'
  | 'advancedPrinting'
  | 'cashSessions'
  | 'inventory'
  | 'reports'
  | 'advancedReports'
  | 'multiBranch'
  | 'customRoles'
  | 'auditLogs'
  | 'customBranding'
  | 'offlineMode'

export interface RestaurantEntitlements {
  planId: string
  featureOverrides: Partial<Record<PlanFeature, boolean>>
  limitOverrides: {
    branches?: number | null
    users?: number | null
    printers?: number | null
    products?: number | null
    monthlyOrders?: number | null
  }
}

export interface RestaurantBranding {
  name: string
  logoUrl?: string
  primaryColor?: string
  accentColor?: string
  receiptHeader?: string
  receiptFooter?: string
  tablesCount?: number
}

export interface RestaurantAccount {
  id: string
  name: string
  slug: string
  ownerUid: string
  createdAt: string
  plan: 'basic' | 'pro' | 'enterprise'
  branding: RestaurantBranding
  schemaVersion?: number
}

export interface RestaurantMember {
  uid: string
  email: string
  displayName: string
  role: UserRole
  active: boolean
  permissions?: Permission[]
  createdAt?: string
  restaurantId?: string
  branchId?: string
}

export interface ProductExtra {
  id: string
  name: string
  price: number
}

export interface ProductOption {
  id: string
  label: string
}

export interface CatalogCategory extends Partial<TenantScopedEntity> {
  id: string
  name: string
  subtitle?: string
  emoji: string
  sortOrder: number
  isActive: boolean
  isVisible: boolean
}

export interface Product extends Partial<TenantScopedEntity> {
  id: string
  categoryId: CategoryId
  name: string
  description?: string
  price: number
  image: string
  badge?: string
  availability: ProductAvailability
  sortOrder: number
  isActive: boolean
  isVisible: boolean
  extras?: ProductExtra[]
  options?: ProductOption[]
}

export interface CatalogState {
  categories: CatalogCategory[]
  products: Product[]
  quickExtras?: ProductExtra[]
  lastUpdatedAt: number
}

export interface CatalogCategoryInput {
  name: string
  subtitle?: string
  emoji: string
}

export interface CatalogProductInput {
  categoryId: string
  name: string
  description?: string
  price: number
  image: string
  badge?: string
  extras?: ProductExtra[]
  options?: ProductOption[]
}

export interface CartItemModifier {
  extras: ProductExtra[]
  options: string[]
  note: string
}

export interface CartItem {
  lineId: string
  productId: string
  quantity: number
  modifiers: CartItemModifier
}

export interface PaymentSummary {
  method: PaymentMethod
  cashAmount: number
  qrAmount: number
  cashReceived: number
  change: number
}

export interface OrderItem {
  id: string
  name: string
  basePrice: number
  quantity: number
  modifiers: CartItemModifier
  lineTotal: number
}

export interface Order extends Partial<TenantScopedEntity> {
  /** Internal unique UUID */
  id: string
  sequence: number
  /** User-visible order/ticket number (customizable per tenant/branch) */
  displayNumber: string
  createdAt: string
  readyAt?: string
  deliveredAt?: string
  cancelledAt?: string
  cancelledBy?: string
  cancelledReason?: string
  status: OrderStatus
  estimatedDelay?: number
  items: OrderItem[]
  total: number
  productSubtotal?: number
  deliveryFee?: number
  deliveryDistanceKm?: number | null
  deliveryQuoteStatus?: 'not_needed' | 'quoted' | 'missing_location' | 'manual_review'
  deliveryQuoteNote?: string
  payment: PaymentSummary
  paymentStatus: 'paid' | 'pending' | 'gift'
  paymentMethod: PaymentMethod | null
  expectedPaymentMethod: PaymentMethod | null
  qrProofReceived?: boolean
  paymentReviewNote?: string
  suppressWhatsappDispatchNotice?: boolean
  forceWhatsappDispatchNotice?: boolean
  paidAt?: string
  paidBy?: string
  orderSource: OrderSource
  fulfillmentType: FulfillmentType
  /** @deprecated Use fulfillmentType instead. Kept for backward compat reads. */
  orderType?: 'table' | 'delivery'
  tableInfo?: string
  customerName?: string
  customerPhone?: string
  deliveryAddress?: string
  createdBy?: string
  dayKey?: string
  whatsappChatId?: string
}

export interface CreateOrderInput {
  items: OrderItem[]
  total: number
  payment: PaymentSummary
  paymentStatus: 'paid' | 'pending' | 'gift'
  paymentMethod: PaymentMethod | null
  expectedPaymentMethod: PaymentMethod | null
  orderSource: OrderSource
  fulfillmentType: FulfillmentType
  tableInfo?: string
  customerName?: string
  customerPhone?: string
  deliveryAddress?: string
  createdBy?: string
  suppressWhatsappDispatchNotice?: boolean
  forceWhatsappDispatchNotice?: boolean
}

export interface ConfirmPaymentInput {
  paymentStatus: 'paid'
  paymentMethod: PaymentMethod
  payment: PaymentSummary
  paidBy: string
}

export interface AppState {
  orders: Order[]
  sequence: number
  lastUpdatedAt: number
}
