import type { Order, TenantScopedEntity } from '../types'

export type PrinterConnectionType = 'bluetooth' | 'lan_ip' | 'usb' | 'rawbt' | 'browser' | 'pdf'
export type PlatformType = 'web' | 'android_native' | 'ios_native'
export type PrinterRole = 'receipt' | 'kitchen' | 'bar' | 'despacho' | 'general'
export type PrintJobTarget = 'receipt' | 'kitchen_ticket' | 'bar_ticket' | 'cash_report' | 'test'

export type PrintJobStatus =
  | 'queued'
  | 'routing'
  | 'formatting'
  | 'connecting'
  | 'printing'
  | 'completed'
  | 'failed'
  | 'retrying'
  | 'cancelled'

export interface PrinterCapability {
  supportsCashDrawerKick: boolean
  supportsPaperCut: boolean
  supportsBeep: boolean
  supportsBarcode: boolean
  supportsQrCode: boolean
  supportsImages: boolean
  maxColumns: number // 32 for 58mm, 48 for 80mm
  supportedCodePages: string[]
}

export interface PrinterProfile extends Partial<TenantScopedEntity> {
  id: string
  restaurantId: string
  branchId: string
  name: string
  role: PrinterRole
  targetCategories?: string[]
  connectionType: PrinterConnectionType
  paperWidth: '58mm' | '80mm'
  macAddress?: string
  ipAddress?: string
  ipPort?: number
  usbVendorId?: string
  usbProductId?: string
  copies: number
  autoPrintOnOrderCreated: boolean
  autoPrintOnOrderPaid: boolean
  kickDrawerOnPrint: boolean
  capabilities: PrinterCapability
  isActive: boolean
  createdAt: string
  updatedAt?: string
}

export interface PrintJob extends Partial<TenantScopedEntity> {
  id: string
  jobId: string
  idempotencyKey: string
  orderId?: string
  orderDisplayNumber?: string
  targetType: PrintJobTarget
  printerProfileId: string
  printerName: string
  connectionType: PrinterConnectionType
  status: PrintJobStatus
  attempts: number
  maxAttempts: number
  lastError?: string
  rawBytesBase64?: string
  renderedTextSnapshot?: string
  queuedAt: string
  startedAt?: string
  completedAt?: string
  failedAt?: string
}

export interface PrintTransportPayload {
  jobId: string
  bytes: Uint8Array
  printer: PrinterProfile
}

export interface PrintResult {
  success: boolean
  bytesWritten?: number
  errorMessage?: string
  errorCode?: string
}

export interface PrinterAdapter {
  connectionType: PrinterConnectionType
  isAvailable(): Promise<boolean>
  connect(printer: PrinterProfile): Promise<void>
  disconnect(): Promise<void>
  sendBytes(payload: PrintTransportPayload): Promise<PrintResult>
  discoverDevices?(): Promise<Array<{ id: string; name: string; address?: string }>>
}

export interface SubmitPrintRequestInput {
  targetType: PrintJobTarget
  order?: Order
  printerProfileId?: string
  idempotencyKey?: string
  customText?: string
  copies?: number
}
