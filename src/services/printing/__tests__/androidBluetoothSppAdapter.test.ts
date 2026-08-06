import { AndroidBluetoothSppAdapter, toCleanArrayBuffer } from '../../../adapters/printing/androidBluetoothSppAdapter'
import { AndroidBluetoothPermissionsService } from '../androidBluetoothPermissionsService'
import { transliterateText } from '../escPosFormatter'
import type { PrinterProfile } from '../../../types/printing'

export async function runAndroidBluetoothSppTestSuite(): Promise<{ passed: number; failed: number; results: string[] }> {
  const results: string[] = []
  let passed = 0
  let failed = 0

  function assert(condition: boolean, testName: string) {
    if (condition) {
      passed++
      results.push(`✅ PASS: ${testName}`)
    } else {
      failed++
      results.push(`❌ FAIL: ${testName}`)
    }
  }

  const samplePrinter: PrinterProfile = {
    id: 'prn-bt-01',
    restaurantId: 'principal',
    branchId: 'main',
    name: 'Impresora Bluetooth POS-58',
    role: 'receipt',
    connectionType: 'bluetooth_spp',
    paperWidth: '58mm',
    macAddress: '00:11:22:33:44:55',
    copies: 1,
    autoPrintOnOrderCreated: true,
    autoPrintOnOrderPaid: true,
    kickDrawerOnPrint: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    capabilities: {
      supportsCashDrawerKick: true,
      supportsPaperCut: true,
      supportsBeep: true,
      supportsBarcode: true,
      supportsQrCode: true,
      supportsImages: true,
      supportsRealtimeStatus: false,
      columnsPerLine: 32,
      codePage: 'CP850',
      encoding: 'utf-8',
      chunkSize: 64, // Small chunk size for testing
      chunkDelayMs: 5,
      connectionTimeoutMs: 2000,
      writeTimeoutMs: 2000,
      feedLinesEnd: 3,
    },
  }

  // --- Test 1: Adapter instantiation & connectionType ---
  try {
    const adapter = new AndroidBluetoothSppAdapter()
    assert(adapter.connectionType === 'bluetooth_spp', 'Prueba BT-1: Adaptador configurado para bluetooth_spp')
  } catch (e: any) {
    assert(false, `Prueba BT-1 Fallo: ${e.message}`)
  }

  // --- Test 2: Native plugin availability check ---
  try {
    const adapter = new AndroidBluetoothSppAdapter()
    const isAvail = await adapter.isAvailable()
    assert(typeof isAvail === 'boolean', 'Prueba BT-2: Verificacion de disponibilidad de window.bluetoothSerial')
  } catch (e: any) {
    assert(false, `Prueba BT-2 Fallo: ${e.message}`)
  }

  // --- Test 3: Permission State Diagnostic ---
  try {
    const state = await AndroidBluetoothPermissionsService.checkPermissionState()
    assert(typeof state.isNativeAndroid === 'boolean' && typeof state.message === 'string', 'Prueba BT-3: Diagnostico de estado de permisos de Android')
  } catch (e: any) {
    assert(false, `Prueba BT-3 Fallo: ${e.message}`)
  }

  // --- Test 4: List paired devices ---
  try {
    const adapter = new AndroidBluetoothSppAdapter()
    const devices = await adapter.listPairedDevices()
    assert(Array.isArray(devices), 'Prueba BT-4: Listado de dispositivos emparejados devuelto como arreglo')
  } catch (e: any) {
    assert(false, `Prueba BT-4 Fallo: ${e.message}`)
  }

  // --- Test 5: Missing MAC address pre-connection error classification ---
  try {
    const adapter = new AndroidBluetoothSppAdapter()
    const invalidPrinter: PrinterProfile = { ...samplePrinter, macAddress: undefined }
    let errorClassification = ''
    try {
      await adapter.connect(invalidPrinter)
    } catch (err: any) {
      errorClassification = err.classification
    }
    assert(errorClassification === 'safeToRetry', 'Prueba BT-5: Error de direccion MAC faltante clasificado como safeToRetry')
  } catch (e: any) {
    assert(false, `Prueba BT-5 Fallo: ${e.message}`)
  }

  // --- Test 6: Chunked byte transmission ---
  try {
    const adapter = new AndroidBluetoothSppAdapter()
    await adapter.connect(samplePrinter)
    const testBytes = new Uint8Array(200) // 200 bytes with chunkSize 64 = 4 chunks
    const result = await adapter.sendBytes({ jobId: 'job-bt-test', bytes: testBytes, printer: samplePrinter })

    assert(result.success === true && result.bytesWritten === 200, 'Prueba BT-6: Transmision dividida por bloques de 64 bytes exitosa')
    await adapter.disconnect()
  } catch (e: any) {
    assert(false, `Prueba BT-6 Fallo: ${e.message}`)
  }

  // --- Test 7: Binary Uint8Array to ArrayBuffer slice conversion ---
  try {
    const sliceBytes = new Uint8Array([0x1b, 0x40, 0x61, 0x01])
    const cleanBuffer = toCleanArrayBuffer(sliceBytes)

    assert(cleanBuffer instanceof ArrayBuffer && cleanBuffer.byteLength === 4, 'Prueba BT-7: Conversion limpia a ArrayBuffer de tamano exacto')
  } catch (e: any) {
    assert(false, `Prueba BT-7 Fallo: ${e.message}`)
  }

  // --- Test 8: ESC/POS special character transliteration ---
  try {
    const raw = 'Hamburguesa Ñandú con Ají en Mesa 12'
    const clean = transliterateText(raw)

    assert(!clean.includes('ñ') && !clean.includes('í') && clean.includes('Nandu') && clean.includes('Aji'), 'Prueba BT-8: Transliteracion limpia para evitar corrupcion de texto en la impresora')
  } catch (e: any) {
    assert(false, `Prueba BT-8 Fallo: ${e.message}`)
  }

  return { passed, failed, results }
}
