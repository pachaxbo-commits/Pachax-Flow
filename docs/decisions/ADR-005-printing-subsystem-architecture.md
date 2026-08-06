# ADR-005: Arquitectura del Motor Central de Impresión, Estados Terminales, Leases Renovables y Permisos Específicos (Revisión 3)

- **Estado**: Aprobado
- **Fecha**: 2026-08-06
- **Autores**: Equipo de Arquitectura PACHAX Flow

## Contexto
Se completó la tercera revisión del Subsistema de Impresión Térmica para corregir inconsistencias de contrato, definir estados terminales precisos, establecer la clasificación de errores para failover seguro y proteger la operación en modo offline.

## Decisiones Adoptadas

### 1. Estados Terminales y Resolución Manual (`PrintJobResolution`)
- Estados terminales formales: `transmitted`, `confirmed`, `resolved`, `failed`, `cancelled`.
- En estado ambiguo `unknown`, el operador resuelve manualmente mediante la UI pasando el trabajo a `resolved` con su registro `resolution` (`printed` | `not_printed` | `reprint_requested`).

### 2. Clasificación de Errores (`ErrorClassification`)
- Se definen `safeToRetry`, `unsafeToRetry` y `requiresOperatorDecision`.
- El failover automático a la impresora de respaldo solo se permite si el error fue clasificado como `safeToRetry` (antes de comenzar a escribir bytes).

### 3. Payload Local Sanitizado para Reimpresión Offline
- El payload inmutable `PrintJobPayload` se conserva localmente por 7 días en la terminal para permitir reimpresiones autorizadas sin conexión a internet. Los bytes binarios crudos `rawBytesBase64` se eliminan al transmitir.

### 4. Transparencia en Almacenamiento
- No existe fallback silencioso en `localStorage`. Si `IndexedDB` no está disponible en la web, se despliega una degradación visible en la UI.
- En Android, la meta final es `NativeSqlitePrintJobStorage`.

### 5. Lease Locking Renovable e Instancias
- Se separan `terminalId` (dispositivo) de `processorInstanceId` (pestaña/worker).
- El lease de procesamiento es renovable periódicamente (`renewLease()`).

### 6. Permisos Específicos de Impresión
- Nuevos permisos dedicados: `printing.manage`, `printing.reprint`, `printing.reprintReceipt`, `printing.reprintKitchen`, `cash.openDrawer`.

### 7. Configuración Flexible de Gaveta
- El pulso de gaveta permite configurar pin (`pin2`/`pin5`), tiempos de disparo $t_1$/$t_2$ o secuencias binarias personalizadas por perfil de impresora.

## Consecuencias
- Ausencia de contradicciones en el ciclo de vida.
- Eliminación total de reimpresiones físicas duplicadas por conmutación errónea.
- Operatividad offline completa para reimpresiones inmediatas.
