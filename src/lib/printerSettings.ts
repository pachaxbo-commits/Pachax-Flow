export interface PrinterSettings {
  paperWidth: '58mm' | '80mm'
  autoPrintCustomerReceipt: boolean
  autoPrintKitchenTicket: boolean
  kickCashDrawer: boolean
  copies: number
  printMode: 'rawbt' | 'browser'
  receiptPrinterName: string
  kitchenPrinterName: string
  printItemNotesLarge: boolean
  groupKitchenItemsByCategory: boolean
}

const PRINTER_SETTINGS_KEY = 'pachax:printer-settings'

export const DEFAULT_PRINTER_SETTINGS: PrinterSettings = {
  paperWidth: '80mm',
  autoPrintCustomerReceipt: true,
  autoPrintKitchenTicket: true,
  kickCashDrawer: true,
  copies: 1,
  printMode: 'rawbt',
  receiptPrinterName: 'Impresora Caja POS',
  kitchenPrinterName: 'Impresora Cocina',
  printItemNotesLarge: true,
  groupKitchenItemsByCategory: true,
}

export function getPrinterSettings(): PrinterSettings {
  try {
    const raw = localStorage.getItem(PRINTER_SETTINGS_KEY)
    if (!raw) return DEFAULT_PRINTER_SETTINGS
    return { ...DEFAULT_PRINTER_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_PRINTER_SETTINGS
  }
}

export function savePrinterSettings(settings: PrinterSettings): void {
  try {
    localStorage.setItem(PRINTER_SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // ignore
  }
}
