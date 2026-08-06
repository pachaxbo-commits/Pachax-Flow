import { Capacitor } from '@capacitor/core'

export interface BluetoothDiagnosticState {
  isNativeAndroid: boolean
  isPluginAvailable: boolean
  isBluetoothEnabled: boolean
  message: string
}

export class AndroidBluetoothPermissionsService {
  /** Check real native availability of BluetoothSerial in window */
  static async checkDiagnosticState(): Promise<BluetoothDiagnosticState> {
    const isNativeAndroid = Capacitor.getPlatform() === 'android'
    const btSerial = (window as any).bluetoothSerial
    const isPluginAvailable = Boolean(btSerial)

    if (!isNativeAndroid) {
      return {
        isNativeAndroid: false,
        isPluginAvailable: false,
        isBluetoothEnabled: false,
        message: 'Ejecutando en entorno Web / Dev (Bridge simulado activo).',
      }
    }

    if (!isPluginAvailable) {
      return {
        isNativeAndroid: true,
        isPluginAvailable: false,
        isBluetoothEnabled: false,
        message: 'Objeto window.bluetoothSerial no inyectado en el WebLayer.',
      }
    }

    const isBluetoothEnabled = await new Promise<boolean>((resolve) => {
      btSerial.isEnabled(
        () => resolve(true),
        () => resolve(false)
      )
    })

    return {
      isNativeAndroid: true,
      isPluginAvailable: true,
      isBluetoothEnabled,
      message: !isBluetoothEnabled
        ? 'El Bluetooth está apagado. Presiona "Encender Bluetooth" o abre Ajustes.'
        : 'Plugin nativo inyectado y Bluetooth encendido.',
    }
  }

  /** Trigger native Android system dialog to enable Bluetooth */
  static async enableBluetooth(): Promise<boolean> {
    const btSerial = (window as any).bluetoothSerial
    if (!btSerial || typeof btSerial.enable !== 'function') return false

    return new Promise((resolve) => {
      btSerial.enable(
        () => resolve(true),
        () => resolve(false)
      )
    })
  }

  /** Open native Android Bluetooth settings screen */
  static async openBluetoothSettings(): Promise<void> {
    const btSerial = (window as any).bluetoothSerial
    if (btSerial && typeof btSerial.showBluetoothSettings === 'function') {
      btSerial.showBluetoothSettings()
    }
  }
}
