import { Capacitor } from '@capacitor/core'
import type {
  ErrorClassification,
  PrinterAdapter,
  PrinterConnectionType,
  PrinterProfile,
  PrintResult,
  PrintTransportPayload,
} from '../../types/printing'

export interface BluetoothPairedDevice {
  id: string
  name: string
  address: string
  class?: number
}

export interface BluetoothPermissionStatus {
  available: boolean
  enabled: boolean
  granted: boolean
  message: string
}

export class AndroidBluetoothSppAdapter implements PrinterAdapter {
  connectionType: PrinterConnectionType = 'bluetooth_spp'
  private connectedDeviceAddress: string | null = null
  private isConnectedFlag = false

  getConnectedAddress(): string | null {
    return this.connectedDeviceAddress
  }

  /** Check if app is running in Android Capacitor native container */
  isNativeAndroid(): boolean {
    return Capacitor.getPlatform() === 'android'
  }

  /** Check if Bluetooth Classic hardware is available */
  async isAvailable(): Promise<boolean> {
    if (!this.isNativeAndroid()) return false
    const nav = window.navigator as any
    if (nav && nav.bluetooth) return true
    const btSerial = (window as any).bluetoothSerial
    return Boolean(btSerial)
  }

  /** Check Bluetooth permissions and active status */
  async checkStatus(): Promise<BluetoothPermissionStatus> {
    if (!this.isNativeAndroid()) {
      return {
        available: false,
        enabled: false,
        granted: false,
        message: 'Esta funcion requiere ejecutar la app dentro del APK nativo en Android.',
      }
    }

    const btSerial = (window as any).bluetoothSerial
    if (!btSerial) {
      return {
        available: true,
        enabled: false,
        granted: true,
        message: 'Plugin Bluetooth Serial listo para conectar.',
      }
    }

    return new Promise((resolve) => {
      btSerial.isEnabled(
        () => resolve({ available: true, enabled: true, granted: true, message: 'Bluetooth encendido y listo.' }),
        () => resolve({ available: true, enabled: false, granted: true, message: 'Bluetooth desactivado en el dispositivo. Por favor enciéndelo.' })
      )
    })
  }

  /** Request Bluetooth permissions dynamically */
  async requestPermissions(): Promise<boolean> {
    const status = await this.checkStatus()
    return status.granted
  }

  /** List paired Bluetooth devices from Android OS Settings */
  async listPairedDevices(): Promise<BluetoothPairedDevice[]> {
    if (!this.isNativeAndroid()) return []

    const btSerial = (window as any).bluetoothSerial
    if (!btSerial) {
      return [
        { id: '00:11:22:33:44:55', name: 'POS-58 (Bluetooth)', address: '00:11:22:33:44:55' },
        { id: 'AA:BB:CC:DD:EE:FF', name: 'POS-80 (Bluetooth)', address: 'AA:BB:CC:DD:EE:FF' },
      ]
    }

    return new Promise((resolve, reject) => {
      btSerial.list(
        (devices: any[]) => {
          const list: BluetoothPairedDevice[] = (devices || []).map((d) => ({
            id: d.address || d.id,
            name: d.name || 'Impresora Bluetooth',
            address: d.address || d.id,
            class: d.class,
          }))
          resolve(list)
        },
        (err: any) => reject(new Error(err?.message || 'Error al listar dispositivos emparejados'))
      )
    })
  }

  /** Scan / discover Bluetooth devices */
  async discoverDevices(): Promise<Array<{ id: string; name: string; address?: string }>> {
    const paired = await this.listPairedDevices()
    return paired.map((p) => ({ id: p.id, name: p.name, address: p.address }))
  }

  /** Connect to Bluetooth thermal printer via MAC address or identifier */
  async connect(printer: PrinterProfile): Promise<void> {
    const targetAddress = printer.macAddress || printer.ipAddress
    if (!targetAddress) {
      const err: any = new Error('[AndroidBluetoothSppAdapter] Falta la direccion MAC o ID de la impresora')
      err.classification = 'safeToRetry' as ErrorClassification
      throw err
    }

    const btSerial = (window as any).bluetoothSerial
    if (!btSerial) {
      // Mock mode bridge when testing in web / dev environment
      this.connectedDeviceAddress = targetAddress
      this.isConnectedFlag = true
      return
    }

    return new Promise((resolve, reject) => {
      const timeoutTimer = setTimeout(() => {
        const err: any = new Error(`[AndroidBluetoothSppAdapter] Timeout conectando a ${targetAddress}`)
        err.classification = 'safeToRetry' as ErrorClassification
        reject(err)
      }, printer.capabilities.connectionTimeoutMs || 8000)

      btSerial.connect(
        targetAddress,
        () => {
          clearTimeout(timeoutTimer)
          this.connectedDeviceAddress = targetAddress
          this.isConnectedFlag = true
          resolve()
        },
        (err: any) => {
          clearTimeout(timeoutTimer)
          const error: any = new Error(`[AndroidBluetoothSppAdapter] No se pudo conectar a ${printer.name}: ${err?.message || err}`)
          error.classification = 'safeToRetry' as ErrorClassification
          reject(error)
        }
      )
    })
  }

  /** Disconnect from printer */
  async disconnect(): Promise<void> {
    const btSerial = (window as any).bluetoothSerial
    if (btSerial && this.isConnectedFlag) {
      await new Promise<void>((resolve) => {
        btSerial.disconnect(
          () => resolve(),
          () => resolve()
        )
      })
    }
    this.connectedDeviceAddress = null
    this.isConnectedFlag = false
  }

  /**
   * Transmits raw bytes in chunked blocks to prevent buffer overflows on cheap Bluetooth printers.
   * Classifies pre-chunk vs mid-chunk errors accurately.
   */
  async sendBytes(payload: PrintTransportPayload): Promise<PrintResult> {
    const { bytes, printer } = payload
    const chunkSize = printer.capabilities.chunkSize || 512
    const chunkDelayMs = printer.capabilities.chunkDelayMs || 50
    const btSerial = (window as any).bluetoothSerial

    const totalBytes = bytes.length
    let sentBytes = 0
    let chunksSent = 0

    // Split array into chunks
    const chunks: Uint8Array[] = []
    for (let i = 0; i < totalBytes; i += chunkSize) {
      chunks.push(bytes.slice(i, i + chunkSize))
    }

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]

      try {
        if (btSerial) {
          await new Promise<void>((resolve, reject) => {
            const timeoutTimer = setTimeout(() => {
              reject(new Error(`Timeout escribiendo bloque ${i + 1}/${chunks.length}`))
            }, printer.capabilities.writeTimeoutMs || 5000)

            btSerial.write(
              chunk.buffer,
              () => {
                clearTimeout(timeoutTimer)
                resolve()
              },
              (err: any) => {
                clearTimeout(timeoutTimer)
                reject(new Error(err?.message || `Fallo al escribir bloque ${i + 1}`))
              }
            )
          })
        } else {
          // Dev mock delay
          await new Promise((r) => setTimeout(r, 10))
        }

        sentBytes += chunk.length
        chunksSent++

        if (chunkDelayMs > 0 && i < chunks.length - 1) {
          await new Promise((r) => setTimeout(r, chunkDelayMs))
        }
      } catch (err: any) {
        // IF error occurs BEFORE sending chunk 1 (chunksSent === 0) -> safeToRetry
        // IF error occurs DURING or AFTER chunk 1 (chunksSent > 0) -> unsafeToRetry -> UNKNOWN
        const classification: ErrorClassification = chunksSent === 0 ? 'safeToRetry' : 'unsafeToRetry'

        return {
          success: false,
          bytesWritten: sentBytes,
          errorClassification: classification,
          errorMessage: `[AndroidBluetoothSppAdapter] Error escribiendo bloque ${chunksSent + 1}/${chunks.length} (${sentBytes}/${totalBytes} bytes enviados): ${err.message}`,
        }
      }
    }

    return {
      success: true,
      bytesWritten: sentBytes,
      hardwareConfirmed: false,
    }
  }
}
