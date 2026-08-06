# ARQUITECTURA DEL SUBSISTEMA DE IMPRESIÓN TÉRMICA PACHAX FLOW (REVISIÓN 2)

- **Documento de Diseño Técnico Refinado (Etapa 4A)**
- **Versión**: 2.0.0
- **Fecha**: 2026-08-06

---

## 1. MODELO REVISADO DE `PrintJob` Y PAYLOAD INMUTABLE

La UI nunca envía objetos mutables `Order`. Cada trabajo encapsula un payload inmutable versionado con `payloadSchemaVersion` y `templateVersion`.

```typescript
export interface PrintJobPayload {
  payloadSchemaVersion: number // e.g. 1
  templateVersion: string       // e.g. "v1.2-58mm"
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
  isCopy: boolean               // Marca visual de COPIA
  reprintReason?: string
  reprintCount?: number
  customMessage?: string
  copies: number
  createdIso: string
}

export interface PrintJob extends Partial<TenantScopedEntity> {
  id: string
  jobId: string
  idempotencyKey: string       // Clave inmutable por tipo de documento
  restaurantId: string
  branchId: string
  terminalId: string           // Terminal responsable de la emisión
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
  leaseExpiresAtIso?: string   // Evita condiciones de carrera entre pestañas/workers
  lastError?: string
  rawBytesBase64?: string
  queuedAtIso: string
  startedAtIso?: string
  transmittedAtIso?: string
  confirmedAtIso?: string
  failedAtIso?: string
}
```

---

## 2. ESTADOS DEFINITIVOS DEL CICLO DE VIDA DE IMPRESIÓN

Debido a que ESC/POS en hardware térmico Bluetooth/LAN/RawBT opera principalmente con comunicación unidireccional sin ACK físico de papel expulsado, el sistema adopta los siguientes estados explícitos:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. QUEUED        - Encolado en almacenamiento duradero      │
│ 2. ROUTING       - Determinando estación e impresoras        │
│ 3. FORMATTING    - Renderizando bytes binarios ESC/POS      │
│ 4. PROCESSING   - Asignado a la terminal (Lock activo)       │
│ 5. CONNECTING    - Abriendo socket/canal de transporte       │
│ 6. TRANSMITTING  - Transmitiendo paquetes de bytes          │
│ 7. TRANSMITTED   - Bytes enviados al buffer de la impresora │
│ 8. CONFIRMED     - Confirmado solo con ACK real de hardware  │
│ 9. UNKNOWN       - Resultado ambiguo (Cierre app/caida red) │
│10. RETRYING      - Esperando backoff tras fallo temporal    │
│11. FAILED        - Max intentos o error no recuperable      │
│12. CANCELLED     - Anulado manualmente por operador         │
└─────────────────────────────────────────────────────────────┘
```

> **Regla de Estado Ambiguo (`UNKNOWN`)**: Si el canal de transmisión se corta durante `TRANSMITTING` o si la aplicación se reinicia inmediatamente después de `TRANSMITTED` sin poder consultar el hardware, el trabajo entra en estado `UNKNOWN`. **Queda prohibida la reimpresión automática en estado `UNKNOWN`** para evitar la emisión de comprobantes duplicados. La UI desplegará una alerta para resolución manual por el operador.

---

## 3. MODELO DE ALMACENAMIENTO DESACOPLADO (`PrintJobStorage`)

El gestor de cola no depende directamente de `IndexedDB`. Consume una interfaz abstracta:

```typescript
export interface PrintJobStorage {
  save(job: PrintJob): Promise<void>
  get(jobId: string): Promise<PrintJob | null>
  listRecoverable(terminalId: string): Promise<PrintJob[]>
  update(jobId: string, changes: Partial<PrintJob>): Promise<void>
  remove(jobId: string): Promise<void>
  purgeCompletedOlderThan(cutoffIso: string): Promise<number>
}
```

### Implementaciones por Plataforma
- **Web SPA**: `IndexedDbPrintJobStorage` (Almacenamiento en IndexedDB con fallback a localStorage).
- **Android Nativo**: `NativeSqlitePrintJobStorage` (SQLite duradero mediante almacenamiento nativo en Android).

---

## 4. ESTRATEGIA DE BLOQUEO Y PROPIEDAD POR TERMINAL

Para evitar carreras de impresión entre múltiples pestañas del navegador, workers o instancias nativas:

1. **Terminal ID Único**: Cada dispositivo/pestaña genera o lee un `terminalId` persistente (`uuidv4`).
2. **Mecanismo de Arriendo (Lease Locking)**:
   - Al procesar un trabajo en cola, la terminal actualiza:
     - `lockedByTerminalId = currentTerminalId`
     - `lockedAtIso = now()`
     - `leaseExpiresAtIso = now() + 15 segundos`
3. **Liberación por Expiración**: Si una terminal se cuelga durante la transmisión, otra terminal o proceso solo podrá tomar el trabajo si `leaseExpiresAtIso < now()`.

---

## 5. ENRUTAMIENTO CON ESTACIONES E IMPRESORAS DE RESPALDO

El enrutamiento no es estático ni se limita a roles genéricos. Incorpora **Estaciones de Preparación** (`KitchenStation`):

```typescript
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
```

### Algoritmo de Fallback de Impresora
1. El motor consulta la estación asociada a los productos del pedido.
2. Intenta transmitir a la `primaryPrinterId`.
3. Si la impresora principal genera error no recuperable de conexión o agota sus reintentos, el trabajo conmuta automáticamente a la `backupPrinterId` (impresora de respaldo) y registra la incidencia.
4. Si ninguna impresora está disponible, el trabajo se marca como `FAILED` con notificación audible y visual en la pantalla del comandero.

---

## 6. POLÍTICA DE IDEMPOTENCIA Y REIMPRESIONES

### Claves de Idempotencia por Documento
- **Recibo de Venta**: `receipt:{orderId}:{paymentVersion}`
- **Comanda de Cocina**: `kitchen:{orderId}:{stationId}:{batchNumber}`
- **Cancelaciones**: `cancellation:{orderId}:{itemId}:{cancellationVersion}`
- **Reimpresión Autorizada**: `reprint:{originalJobId}:{reprintRequestId}`

### Reglas de Reimpresión
Toda reimpresión genera un **nuevo trabajo de impresión independiente** que no se ve bloqueado por la clave de idempotencia original. Requiere:
1. Permiso explícito de usuario (`orders.viewAll` / `orders.edit`).
2. Usuario solicitante registrado (`requestedByUid`).
3. Motivo obligatorio (`reprintReason`).
4. Indicador visual destacado en la plantilla: **`*** REIMPRESIÓN - COPIA #N ***`**.
5. Registro de auditoría guardado en Firestore.

---

## 7. APERTURA INDEPENDIENTE DE GAVETA DE DINERO

La apertura de la gaveta de dinero (pulso electromagnético `ESC p 0 25 250`) puede ejecutarse de dos formas:
1. **Asociada al Pago**: Gatillada automáticamente por el perfil de la impresora principal si `kickDrawerOnPrint === true`.
2. **Acción Independiente**: Invocada vía `kickCashDrawer({ userUid, terminalId, reason })`. Requiere permiso `cash.open`, registra el motivo y la hora en el registro de caja sin emitir papel.

---

## 8. PRIVACIDAD, RETENCIÓN DE DATOS Y LIMPIEZA

Para proteger la privacidad de los clientes (datos PII como teléfono y dirección) y evitar el crecimiento desmedido del almacenamiento local:

1. **Minimización**: Al completar exitosamente un trabajo (`TRANSMITTED` / `CONFIRMED`), los bytes binarios `rawBytesBase64` son eliminados inmediatamente de la cola local.
2. **Purga Automática**: `purgeCompletedOlderThan(cutoffIso)` purga diariamente trabajos completados o cancelados con más de 7 días de antigüedad.
3. **Auditoría Liviana en Firestore**: Solo se sincroniza el registro meta del trabajo (`jobId`, `status`, `targetType`, `terminalId`, `completedAt`) sin retener información de clientes ni datos sensibles.

---

## 9. ADAPTADORES SEPARADOS POR PLATAFORMA Y PROTOCOLO

```
                     ┌───────────────────────────────┐
                     │     PrinterAdapter Interface  │
                     └───────────────┬───────────────┘
                                     │
     ┌──────────────────┬────────────┴───────┬──────────────────┐
     ▼                  ▼                    ▼                  ▼
┌──────────────┐ ┌──────────────┐ ┌────────────────────┐ ┌──────────────┐
│WebBluetooth  │ │AndroidSpp    │ │AndroidTcpSocket    │ │RawBtIntent   │
│Adapter       │ │Adapter       │ │Adapter             │ │Adapter       │
│(Web Bluetooth│ │(Bluetooth    │ │(Socket TCP Direct  │ │(Intent Android│
│API Chrome)   │ │Classic SPP)  │ │Puerto 9100 Java)   │ │App External) │
└──────────────┘ └──────────────┘ └────────────────────┘ └──────────────┘
```

---

## 10. RIESGOS TÉCNICOS RESIDUALES

1. **Limitaciones del Navegador Web en Vercel para Sockets TCP**: Los navegadores web estándar no permiten abrir conexiones Socket TCP raw (puerto 9100) directamente a impresoras de red por restricciones de sandbox. En entorno Web, la impresión LAN requiere un agente proxy local o el uso de la app Android Nativa/RawBT.
2. **Perdida de Conexión Bluetooth SPP durante Transmisión**: Si el celular se aleja de la impresora Bluetooth durante la transmisión, el estado quedará en `UNKNOWN`. La UI solicitará confirmación visual al operador antes de re-emitir.
