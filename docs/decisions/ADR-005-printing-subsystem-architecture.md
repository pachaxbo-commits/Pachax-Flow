# ADR-005: Arquitectura del Motor Central de Impresión, Estados de Transmisión y Almacenamiento Desacoplado (Revisión 2)

- **Estado**: Aprobado
- **Fecha**: 2026-08-06
- **Autores**: Equipo de Arquitectura PACHAX Flow

## Contexto
Se refinó la especificación del Subsistema de Impresión Térmica para atender las limitaciones reales del hardware ESC/POS y garantizar la robustez tanto en entorno Web como en Android Nativo.

## Decisiones Adoptadas

### 1. Manejo de Estados sin Falsa Confirmación
Se distingue explícitamente entre `transmitting`, `transmitted`, `confirmed` y `unknown`. En caso de desconexión o reinicio en estado indeterminado, el trabajo entra en `unknown` y requiere confirmación manual del usuario para evitar reimpresiones físicas duplicadas.

### 2. Payload Inmutable y Versionado (`PrintJobPayload`)
La UI no envía objetos `Order` mutables. El trabajo empaqueta una estructura congelada con `payloadSchemaVersion` y `templateVersion`.

### 3. Almacenamiento Desacoplado (`PrintJobStorage`)
La cola consume la interfaz `PrintJobStorage`. Se soportará `IndexedDbPrintJobStorage` para la web y `NativeSqlitePrintJobStorage` para Android nativo.

### 4. Idempotencia Granular por Documento
Claves diferenciadas:
- Recibos: `receipt:{orderId}:{paymentVersion}`
- Comandas: `kitchen:{orderId}:{stationId}:{batchNumber}`
- Cancelaciones: `cancellation:{orderId}:{itemId}:{version}`
- Reimpresiones: `reprint:{originalJobId}:{reprintRequestId}` (con marca visual `COPIA`).

### 5. Estaciones e Impresoras de Respaldo
Se introducen `KitchenStation` con `primaryPrinterId` y `backupPrinterId` para conmutación automática de fallo.

### 6. Arriendo de Trabajos por Terminal (`lockedByTerminalId`)
Evita condiciones de carrera entre múltiples pestañas web o workers mediante bloqueos temporales (`leaseExpiresAtIso`).

### 7. Apertura Independiente de Gaveta
Acción autorizada `kickCashDrawer()` desacoplada de la emisión de comprobantes de venta con registro de auditoría.

## Consecuencias
- Cero impresiones físicas duplicadas por fallos de confirmación.
- Soporte duradero y nativo en Android.
- Privacidad protegida mediante minimización y purga automática de PII.
