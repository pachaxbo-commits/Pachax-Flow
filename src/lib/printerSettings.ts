export interface PrinterSettings {
  paperWidth: '58mm' | '80mm'
  autoPrintCustomerReceipt: boolean
  autoPrintKitchenTicket: boolean
  kickCashDrawer: boolean
  copies: number
  printMode: 'rawbt' | 'browser'
}

const PRINTER_SETTINGS_KEY = 'pachax:printer-settings'

export const DEFAULT_PRINTER_SETTINGS: PrinterSettings = {
  paperWidth: '80mm',
  autoPrintCustomerReceipt: true,
  autoPrintKitchenTicket: true,
  kickCashDrawer: true,
  copies: 1,
  printMode: 'rawbt',
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
