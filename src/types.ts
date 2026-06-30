export type CategoryId = string

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'ready_for_pickup' | 'ready_for_dispatch' | 'out_for_delivery' | 'delivered' | 'cancelled'
export type PaymentMethod = 'cash' | 'qr' | 'mixed'
export type OrderSource = 'local' | 'whatsapp'
export type FulfillmentType = 'table' | 'pickup' | 'delivery'
export type ProductAvailability = 'available' | 'soldout'
export type UserRole = 'admin' | 'caja' | 'cocina' | 'pedidos'

export type RepositoryConnectionMode = 'connected' | 'connecting' | 'local' | 'offline'

export interface RepositoryStatus {
  mode: RepositoryConnectionMode
  label: string
  detail: string
  source: 'firebase' | 'local'
  hasPendingWrites: boolean
  isOnline: boolean
}

export interface RestaurantMember {
  uid: string
  email: string
  displayName: string
  role: UserRole
  active: boolean
  createdAt?: string
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

export interface CatalogCategory {
  id: string
  name: string
  subtitle?: string
  emoji: string
  sortOrder: number
  isActive: boolean
  isVisible: boolean
}

export interface Product {
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

export interface Order {
  id: string
  sequence: number
  displayNumber: string
  createdAt: string
  readyAt?: string
  deliveredAt?: string
  cancelledAt?: string
  cancelledBy?: string
  cancelledReason?: string
  status: OrderStatus
  items: OrderItem[]
  total: number
  payment: PaymentSummary
  paymentStatus: 'paid' | 'pending'
  paymentMethod: PaymentMethod | null
  expectedPaymentMethod: PaymentMethod | null
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
}

export interface CreateOrderInput {
  items: OrderItem[]
  total: number
  payment: PaymentSummary
  paymentStatus: 'paid' | 'pending'
  paymentMethod: PaymentMethod | null
  expectedPaymentMethod: PaymentMethod | null
  orderSource: OrderSource
  fulfillmentType: FulfillmentType
  tableInfo?: string
  customerName?: string
  customerPhone?: string
  deliveryAddress?: string
  createdBy?: string
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
