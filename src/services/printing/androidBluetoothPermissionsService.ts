import { Capacitor } from '@capacitor/core'

export interface BluetoothPermissionState {
  isNativeAndroid: boolean
  isPluginAvailable: boolean
  isBluetoothEnabled: boolean
  hasPermissions: boolean
  permissionStatus: 'granted' | 'denied' | 'permanently_denied' | 'unknown'
  message: string
}

export class AndroidBluetoothPermissionsService {
  /** Check complete native status of Bluetooth plugin and permissions */
  static async checkPermissionState(): Promise<BluetoothPermissionState> {
    const isNativeAndroid = Capacitor.getPlatform() === 'android'
    const btSerial = (window as any).bluetoothSerial
    const isPluginAvailable = Boolean(btSerial)

    if (!isNativeAndroid) {
      return {
        isNativeAndroid: false,
        isPluginAvailable: false,
        isBluetoothEnabled: false,
        hasPermissions: true,
        permissionStatus: 'granted',
        message: 'Ejecutando en entorno Web / Dev (Bridge simulado disponible).',
      }
    }

    if (!isPluginAvailable) {
      return {
        isNativeAndroid: true,
        isPluginAvailable: false,
        isBluetoothEnabled: false,
        hasPermissions: false,
        permissionStatus: 'denied',
        message: 'Plugin Nativo cordova-plugin-bluetooth-serial no detectado en el APK.',
      }
    }

    // Check if Bluetooth is enabled
    const isBluetoothEnabled = await new Promise<boolean>((resolve) => {
      btSerial.isEnabled(
        () => resolve(true),
        () => resolve(false)
      )
    })

    // Check runtime permission state via plugin native call if available
    const hasPermissions = await new Promise<boolean>((resolve) => {
      if (typeof btSerial.hasPermission === 'function') {
        btSerial.hasPermission(
          () => resolve(true),
          () => resolve(false)
        )
      } else {
        // Fallback check if hasPermission function is absent in older wrapper
        resolve(isBluetoothEnabled)
      }
    })

    return {
      isNativeAndroid: true,
      isPluginAvailable: true,
      isBluetoothEnabled,
      hasPermissions,
      permissionStatus: hasPermissions ? 'granted' : 'denied',
      message: !isBluetoothEnabled
        ? 'El Bluetooth está apagado en tu teléfono. Por favor enciéndelo.'
        : !hasPermissions
        ? 'Se requieren permisos de Bluetooth Connect y Scan. Haz clic en "Solicitar Permisos".'
        : 'Bluetooth encendido y permisos concedidos.',
    }
  }

  /** Trigger native Android runtime permission prompt */
  static async requestPermissions(): Promise<BluetoothPermissionState> {
    const btSerial = (window as any).bluetoothSerial
    if (!btSerial) {
      return await this.checkPermissionState()
    }

    if (typeof btSerial.requestPermission === 'function') {
      await new Promise<void>((resolve) => {
        btSerial.requestPermission(
          () => resolve(),
          () => resolve()
        )
      })
    }

    return await this.checkPermissionState()
  }
}
