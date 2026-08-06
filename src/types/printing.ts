import type { TenantScopedEntity } from '../types'

export type PrinterConnectionType =
  | 'bluetooth_spp'
  | 'bluetooth_le'
  | 'web_bluetooth'
  | 'lan_tcp'
  | 'usb_serial'
  | 'rawbt_intent'
  | 'browser_dialog'
  | 'virtual_pdf'

export type PlatformType = 'web' | 'android_native' | 'ios_native'

export type PrintJobTarget =
  | 'receipt'
  | 'kitchen_ticket'
  | 'bar_ticket'
  | 'cancellation_ticket'
  | 'cash_report'
  | 'drawer_kick'
  | 'test'

export type PrintJobStatus =
  | 'queued'
  | 'routing'
  | 'formatting'
  | 'processing'
  | 'connecting'
  | 'transmitting'
  | 'transmitted'
  | 'confirmed'
  | 'unknown'
  | 'retrying'
  | 'failed'
  | 'cancelled'

export interface PrinterCapability {
  supportsCashDrawerKick: boolean
  supportsPaperCut: boolean
  supportsBeep: boolean
  supportsBarcode: boolean
  supportsQrCode: boolean
  supportsImages: boolean
  supportsRealtimeStatus: boolean
  columnsPerLine: number // 32 for 58mm, 48 for 80mm
  codePage: string
  encoding: string
  chunkSize: number
  chunkDelayMs: number
  connectionTimeoutMs: number
  writeTimeoutMs: number
  cutSequenceHex?: string
  drawerSequenceHex?: string
  feedLinesEnd: number
  imageMaxWidthPx?: number
}

export interface KitchenStation {
  id: string
  restaurantId: string
  branchId: string
  name: string
  primaryPrinterId: string
  backupPrinterId?: string
  assignedCategoryIds: string[]
  isActive: boolean
}

export interface PrinterProfile extends Partial<TenantScopedEntity> {
  id: string
  restaurantId: string
  branchId: string
  name: string
  role: 'receipt' | 'kitchen' | 'bar' | 'despacho' | 'general'
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

export interface PrintableItemPayload {
  productId?: string
  name: string
  printName?: string
  categoryName?: string
  basePrice: number
  quantity: number
  modifiersText?: string[]
  note?: string
  extrasTotal?: number
  lineTotal: number
}

export interface PrintJobPayload {
  payloadSchemaVersion: number
  templateVersion: string
  restaurantName: string
  branchName: string
  branchAddress?: string
  branchPhone?: string
  orderId?: string
  sequenceNumber?: number
  displayNumber?: string
  orderSource?: string
  fulfillmentType?: string
  tableInfo?: string
  customerName?: string
  customerPhone?: string
  deliveryAddress?: string
  items: PrintableItemPayload[]
  subtotal: number
  discountTotal: number
  taxTotal: number
  deliveryFee: number
  grandTotal: number
  paymentMethod?: string
  cashReceived?: number
  changeAmount?: number
  isCopy: boolean
  reprintReason?: string
  reprintCount?: number
  customMessage?: string
  copies: number
  createdIso: string
}

export interface PrintJob extends Partial<TenantScopedEntity> {
  id: string
  jobId: string
  idempotencyKey: string
  restaurantId: string
  branchId: string
  terminalId: string
  targetType: PrintJobTarget
  stationId?: string
  printerProfileId: string
  backupPrinterProfileId?: string
  connectionType: PrinterConnectionType
  status: PrintJobStatus
  payloadSchemaVersion: number
  templateVersion: string
  payload: PrintJobPayload
  attempts: number
  maxAttempts: number
  lockedByTerminalId?: string
  lockedAtIso?: string
  leaseExpiresAtIso?: string
  lastError?: string
  rawBytesBase64?: string
  queuedAtIso: string
  startedAtIso?: string
  transmittedAtIso?: string
  confirmedAtIso?: string
  failedAtIso?: string
}

export interface PrintJobStorage {
  save(job: PrintJob): Promise<void>
  get(jobId: string): Promise<PrintJob | null>
  listRecoverable(terminalId: string): Promise<PrintJob[]>
  update(jobId: string, changes: Partial<PrintJob>): Promise<void>
  remove(jobId: string): Promise<void>
  purgeCompletedOlderThan(cutoffIso: string): Promise<number>
}

export interface PrintTransportPayload {
  jobId: string
  bytes: Uint8Array
  printer: PrinterProfile
}

export interface PrintResult {
  success: boolean
  bytesWritten?: number
  hardwareConfirmed?: boolean
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
  orderId?: string
  stationId?: string
  printerProfileId?: string
  idempotencyKey?: string
  payload: PrintJobPayload
  copies?: number
}

export interface RequestReprintInput {
  originalJobId: string
  requestedByUid: string
  reason: string
  terminalId: string
}

export interface IndependentDrawerKickInput {
  userUid: string
  terminalId: string
  reason: string
  printerProfileId?: string
}
