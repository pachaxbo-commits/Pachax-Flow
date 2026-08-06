# ARQUITECTURA DEL SUBSISTEMA DE IMPRESIÓN TÉRMICA PACHAX FLOW

- **Documento de Diseño Técnico (Etapa 4A)**
- **Versión**: 1.0.0
- **Fecha**: 2026-08-06

---

## 1. VISIÓN GENERAL Y OBJETIVOS

El subsistema de impresión de PACHAX Flow es una infraestructura desacoplada, multi-impresora e idempotente orientada a la emisión de comandas de cocina y recibos de venta en entornos de restauración de alto volumen.

### Principio Fundamental de Diseño
> **Regla de Aislamiento Visual**: Ningún componente de la interfaz de usuario (`CajaView`, `CocinaView`, `OrderTicket`, etc.) genera secuencias de bytes ESC/POS ni interactúa directamente con dispositivos o APIs del navegador o sistema nativo. 
> Toda solicitud de impresión debe canalizarse obligatoriamente a través del motor central `PrintEngineService`.

---

## 2. SEPARACIÓN DE RESPONSABILIDADES POR CAPAS

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CAPA DE INTERFAZ DE USUARIO (UI Layer)                   │
│    - Botones de cobro, impresión de comanda, modal de config │
│    - Invoca ÚNICAMENTE PrintEngineService.submitJob()       │
└──────────────────────────────┬──────────────────────────────┘
                               │ (SubmitPrintRequestInput)
┌──────────────────────────────▼──────────────────────────────┐
│ 2. MOTOR CENTRAL DE IMPRESIÓN (PrintEngineService)           │
│    - Orquestación de cola idempotente                        │
│    - Enrutamiento por rol de impresora (Caja vs Cocina)     │
│    - Gestión de reintentos, backoff y ciclo de vida         │
└──────────────────────────────┬──────────────────────────────┘
                               │ (PrintJob + PrinterProfile)
┌──────────────────────────────▼──────────────────────────────┐
│ 3. FORMATEADOR & ENGINE ESC/POS (EscPosFormatter)           │
│    - Generación de comandos binarios (corte, gaveta, texto) │
│    - Renderizado responsivo para papel de 58mm y 80mm        │
└──────────────────────────────┬──────────────────────────────┘
                               │ (PrintTransportPayload: Uint8Array)
┌──────────────────────────────▼──────────────────────────────┐
│ 4. ADAPTADORES DE TRANSPORTE (PrinterAdapters)               │
│    ├─ WebBluetoothAdapter (Web Bluetooth API)               │
│    ├─ AndroidBluetoothAdapter (Capacitor Native Serial)     │
│    ├─ NetworkTcpAdapter (LAN/IP Socket TCP 9100)            │
│    ├─ WebUsbSerialAdapter (WebUSB / Web Serial API)         │
│    └─ RawBtIntentAdapter (App RawBT Android Intent)         │
└─────────────────────────────────────────────────────────────┘
```

### Tabla de Responsabilidades

| Capa | Componentes | Responsabilidad Exclusiva |
| :--- | :--- | :--- |
| **UI** | `CajaView`, `CocinaView`, `PrinterSettingsModal` | Capturar acciones del usuario, mostrar estados (`queued`, `printing`, `failed`) y disparar solicitudes abstractas. Prohibido manipular bytes. |
| **Servicios Core** | `PrintEngineService`, `PrintQueueManager` | Gestionar la cola persistente, validar la clave de idempotencia (`idempotencyKey`), coordinar reintentos y persistir estados de trabajo. |
| **Formateador** | `EscPosFormatter`, `ReceiptTemplate`, `KitchenTicketTemplate` | Transformar objetos `Order` o reportes en secuencias `Uint8Array` binarias formateadas según las capacidades de la impresora (58mm/80mm). |
| **Repositorios** | `PrinterProfileRepository`, `PrintJobRepository` | Persistir perfiles de impresoras y trabajos en `IndexedDB` / `localStorage` / `Firestore`. |
| **Adaptadores** | `PrinterAdapter` (Bluetooth, LAN, USB, RawBT) | Establecer la conexión física o socket de red y transmitir los bytes binarios al hardware. |
| **Plugins Nativos** | Capacitor Bluetooth Serial Plugin | Proporcionar acceso nativo al hardware Bluetooth SPP en dispositivos Android. |

---

## 3. MODELOS DE DOMINIO

### A. Perfil de Impresora (`PrinterProfile`)
Representa la configuración física y lógica de una impresora en una sucursal.

```typescript
export interface PrinterProfile {
  id: string
  restaurantId: string
  branchId: string
  name: string
  role: 'receipt' | 'kitchen' | 'bar' | 'despacho' | 'general'
  targetCategories?: string[] // Categorías asignadas a esta impresora
  connectionType: 'bluetooth' | 'lan_ip' | 'usb' | 'rawbt' | 'browser' | 'pdf'
  paperWidth: '58mm' | '80mm'
  macAddress?: string
  ipAddress?: string
  ipPort?: number
  copies: number
  autoPrintOnOrderCreated: boolean
  autoPrintOnOrderPaid: boolean
  kickDrawerOnPrint: boolean
  capabilities: PrinterCapability
  isActive: boolean
  createdAt: string
}
```

### B. Capacidades de la Impresora (`PrinterCapability`)
Define las funciones de hardware soportadas por el dispositivo.

```typescript
export interface PrinterCapability {
  supportsCashDrawerKick: boolean
  supportsPaperCut: boolean
  supportsBeep: boolean
  supportsBarcode: boolean
  supportsQrCode: boolean
  supportsImages: boolean
  maxColumns: number // 32 para 58mm, 48 para 80mm
  supportedCodePages: string[]
}
```

### C. Trabajo de Impresión (`PrintJob`)
Entidad persistente que representa la orden de impresión en la cola.

```typescript
export interface PrintJob extends TenantScopedEntity {
  id: string
  jobId: string
  idempotencyKey: string // Clave única de deduplicación
  orderId?: string
  orderDisplayNumber?: string
  targetType: 'receipt' | 'kitchen_ticket' | 'bar_ticket' | 'cash_report' | 'test'
  printerProfileId: string
  printerName: string
  connectionType: PrinterConnectionType
  status: PrintJobStatus
  attempts: number
  maxAttempts: number
  lastError?: string
  rawBytesBase64?: string
  queuedAt: string
  startedAt?: string
  completedAt?: string
  failedAt?: string
}
```

---

## 4. CICLO DE VIDA DE UN TRABAJO DE IMPRESIÓN

```
 [Solicitud UI]
       │
       ▼
  ┌───────────┐       Deduplicación exitosa
  │  QUEUED   ├────────────────────────────────────┐ (Trabajo ya procesado)
  └─────┬─────┘                                    │
        │                                          ▼
        ▼                                   ┌─────────────┐
  ┌───────────┐                             │  COMPLETED  │
  │  ROUTING  │ (Identifica impresora)      └─────────────┘
  └─────┬─────┘                                    ▲
        │                                          │
        ▼                                          │ Transmisión exitosa
  ┌───────────┐                                    │
  │FORMATTING │ (Genera binario ESC/POS)           │
  └─────┬─────┘                                    │
        │                                          │
        ▼                                          │
  ┌───────────┐      Error de Conexión             │
  │CONNECTING ├─────────────────────┐              │
  └─────┬─────┘                     │              │
        │ Conexión OK               ▼              │
        ▼                     ┌───────────┐        │
  ┌───────────┐               │ RETRYING  │        │
  │ PRINTING  ├──────────────►└─────┬─────┘        │
  └─────┬─────┘ Error Transmisión   │              │
        │                           │              │
        │ Transmisión OK            │ Reintento    │
        └───────────────────────────┼──────────────┘
                                    │ Max reintentos superado
                                    ▼
                              ┌───────────┐
                              │  FAILED   │
                              └───────────┘
```

---

## 5. ESTRATEGIA DE IDEMPOTENCIA Y DEDUPLICACIÓN

Para evitar la doble emisión accidental de comandas o recibos en momentos de inestabilidad de red o toques repetidos en pantalla:

1. **Estructura de `idempotencyKey`**:
   - Para recibos de pedido: `receipt:{orderId}:{paymentVersion}`
   - Para comandas de cocina: `kitchen:{orderId}:{itemCount}`
   - Para reportes de caja: `cash_report:{branchId}:{dateKey}`
2. **Evaluación de Idempotencia**:
   - Antes de encolar un trabajo, `PrintQueueManager` consulta en el repositorio persistente si existe un trabajo con la misma `idempotencyKey` en estado `completed` o `printing`.
   - Si ya existe y fue completado, se descarta la duplicidad retornando el trabajo existente sin re-imprimir.

---

## 6. COLA PERSISTENTE Y RECUPERACIÓN TRAS REINICIO

1. **Almacenamiento Local Duradero**:
   - La cola de trabajos se almacena en `IndexedDB` (respaldada en `localStorage` como fallback) mediante `PrintJobRepository`.
2. **Recuperación al Iniciar la App**:
   - Al iniciar la aplicación, `PrintEngineService.bootstrap()` escanea los trabajos almacenados en estado `queued`, `connecting` o `retrying`.
   - Trabajos interrumpidos por un cierre de la app son reanudados automáticamente tras validar la conexión con las impresoras configuradas.

---

## 7. ESTRATEGIA DE REINTENTOS Y MANEJO DE ERRORES

- **Reintentos con Expansión Exponencial (Exponential Backoff)**:
  - Intento 1: Inmediato (0s)
  - Intento 2: Espera 3 segundos
  - Intento 3: Espera 10 segundos
  - MaxIntentos: 3 por defecto (configurable por perfil de impresora).
- **Categorización de Errores**:
  - *Errores Recuperables* (Bluetooth fuera de rango, impresora ocupada): Pasan a estado `retrying`.
  - *Errores No Recuperables* (Servicio Bluetooth no soportado, IP inexistente): Pasan inmediatamente a estado `failed` con mensaje visible para el usuario.

---

## 8. COMPATIBILIDAD PLATAFORMA (ANDROID VS WEB)

| Funcionalidad | Web (Navegador) | Android Nativo (APK Capacitor) |
| :--- | :--- | :--- |
| **Bluetooth SPP** | Web Bluetooth API (`navigator.bluetooth`) | Plugin Nativo Capacitor Serial Bluetooth |
| **Impresión IP / LAN** | Redirección por Proxy Web / App RawBT | Socket TCP directo en Kotlin/Java (Puerto 9100) |
| **Impresión USB** | Web Serial / WebUSB API | USB Host Manager Nativo en Android |
| **Modo Fallback** | Impresión por diálogo del navegador | Envío por Intent de Android a RawBT / Print Service |

---

## 9. MATRIZ DE ESTRUCTURA DE ARCHIVOS PROPUESTA

```
src/
├── types/
│   └── printing.ts                    # Interfaces de dominio del subsistema de impresión
├── services/printing/
│   ├── printEngineService.ts          # Motor central de orquestación y colas
│   ├── printQueueManager.ts           # Gestor de cola persistente e idempotencia
│   ├── escPosFormatter.ts             # Generador binario de comandos ESC/POS
│   └── templates/
│       ├── receiptTemplate.ts         # Plantilla binaria de recibo de caja
│       └── kitchenTicketTemplate.ts   # Plantilla binaria de comanda de cocina
├── adapters/printing/
│   ├── printerAdapter.interface.ts    # Interfaz base de adaptadores
│   ├── webBluetoothAdapter.ts         # Adaptador Web Bluetooth API
│   ├── androidBluetoothAdapter.ts     # Adaptador Nativo Capacitor Android
│   ├── networkTcpAdapter.ts           # Adaptador IP/LAN Socket TCP 9100
│   └── rawBtAdapter.ts                # Adaptador Intent RawBT Android
└── store/
    ├── printerProfileStore.ts         # Almacén de perfiles de impresoras de la sucursal
    └── printJobRepository.ts          # Repositorio de trabajos de impresión
```

---

## 10. JUSTIFICACIÓN DE DECISIONES DE ARQUITECTURA

1. **Desacoplamiento Total de la UI**: La interfaz solo conoce `SubmitPrintRequestInput`. Esto permite cambiar de impresora física, tecnología de comunicación o agregar soporte para nuevas marcas sin tocar una sola línea de código visual.
2. **Cola Asíncrona e Idempotente**: Garantiza que el cobro en caja responda al instante (sub-100ms) sin bloquear la interfaz esperando la transmisión de la impresora.
3. **Arquitectura Plug-and-Play por Adaptadores**: La interfaz `PrinterAdapter` permite alternar entre Web Bluetooth, Bluetooth Nativo Android o Red IP transparente según la plataforma donde se ejecute la aplicación.
