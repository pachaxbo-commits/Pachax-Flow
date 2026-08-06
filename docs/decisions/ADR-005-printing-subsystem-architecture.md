# ADR-005: Arquitectura del Motor Central de Impresión y Cola Idempotente

- **Estado**: Aprobado
- **Fecha**: 2026-08-06
- **Autores**: Equipo de Arquitectura PACHAX Flow

## Contexto
Se requiere diseñar la arquitectura técnica base para la emisión de comprobantes de venta y comandas de cocina térmicas (ESC/POS) en múltiples terminales, soportando impresoras Bluetooth, IP/LAN y USB tanto en la web como dentro de la app nativa en Android.

## Decisiones Adoptadas

### 1. Motor Central Único (`PrintEngineService`)
- Se prohíbe terminantemente que los componentes visuales (`CajaView`, `CocinaView`, etc.) generen bytes binarios o invoquen dispositivos nativos.
- Toda solicitud debe pasar por `PrintEngineService.submitJob(request)`.

### 2. Garantía de Idempotencia (`idempotencyKey`)
- Cada trabajo de impresión incluye una clave de deduplicación inmutable (ej. `receipt:{orderId}:{paymentVersion}`).
- El sistema evita la emisión duplicada de comprobantes en casos de toques repetidos o inestabilidad de conexión.

### 3. Adaptadores de Transporte Intercambiables (`PrinterAdapter`)
- El motor interactúa exclusivamente a través de la interfaz abstracta `PrinterAdapter`.
- Las implementaciones concretas (`WebBluetoothAdapter`, `AndroidBluetoothAdapter`, `NetworkTcpAdapter`) encapsulan las especificidades del hardware y sistema operativo.

### 4. Cola Persistente y Recuperación ante Fallos
- Los trabajos se persisten localmente con estados (`queued`, `routing`, `formatting`, `connecting`, `printing`, `completed`, `failed`, `retrying`).
- El servicio escanea y reanuda automáticamente los trabajos pendientes al reiniciar la aplicación.

## Consecuencias
- Cero acoplamiento entre la interfaz gráfica y los comandos de hardware.
- Respuesta instantánea en la caja cobradora sin bloqueo visual.
- Portabilidad garantizada entre el navegador web y el APK ejecutable de Android.
