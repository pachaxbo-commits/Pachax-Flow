# ARQUITECTURA DEL SUBSISTEMA DE IMPRESIÓN TÉRMICA PACHAX FLOW (REVISIÓN 3)

- **Documento de Diseño Técnico Refinado (Etapa 4A)**
- **Versión**: 3.0.0
- **Fecha**: 2026-08-06

---

## 1. ESTADOS DEFINITIVOS Y RESOLUCIÓN MANUAL (`PrintJobStatus`)

Los estados del trabajo de impresión quedan divididos formalmente en estados de procesamiento y **estados terminales**:

```
┌─────────────────────────────────────────────────────────────┐
│ ESTADOS DE PROCESAMIENTO:                                   │
│  - queued       - Encolado duradero                         │
│  - routing      - Determinando estación e impresoras        │
│  - formatting   - Generando bytes binarios ESC/POS          │
│  - processing   - Asignado con lease lock a una instancia   │
│  - connecting   - Abriendo canal/socket de hardware          │
│  - transmitting - Escribiendo bytes al buffer de salida     │
│  - retrying     - En espera de reintento por backoff        │
│  - unknown      - Estado ambiguo (Desconexión/Cierre)       │
├─────────────────────────────────────────────────────────────┤
│ ESTADOS TERMINALES DEFINITIVOS:                             │
│  - transmitted  - Transmisión exitosa sin ACK físico        │
│  - confirmed    - Confirmación devuelta por ACK real HW     │
│  - resolved     - Resuelto manualmente tras estar en unknown│
│  - failed       - Fallo permanente tras max intentos        │
│  - cancelled    - Anulado manualmente por operador          │
└─────────────────────────────────────────────────────────────┘
```

### Estructura de Resolución Manual (`PrintJobResolution`)
Cuando un trabajo cae en estado `unknown`, el operador debe resolver el estado ambiguo mediante la UI, registrando:
```typescript
export interface PrintJobResolution {
  type: 'printed' | 'not_printed' | 'reprint_requested'
  resolvedByUid: string
  resolvedAtIso: string
  reason?: string
}
```
Al resolverlo manualmente, el trabajo pasa a estado terminal **`resolved`** con su objeto `resolution` adjunto para auditoría.

---

## 2. CLASIFICACIÓN DE ERRORES Y REGLAS DE REINTENTO / FAILOVER SEGURO

Los errores se clasifican en tres categorías estrictas (`ErrorClassification`):

1. **`safeToRetry`**: Ocurre **antes** de comenzar la transmisión de bytes (socket no abierto, impresora no encontrada, permiso denegado en SO).
   - **Regla**: Es seguro ejecutar un reintento automático o hacer failover automático a la impresora de respaldo (`backupPrinterId`).
2. **`unsafeToRetry`**: Ocurre **durante** la escritura de bytes (conexión perdida en medio de la transmisión de la comanda).
   - **Regla**: **Queda prohibido el failover automático o reintento automático silencioso** para evitar duplicados o impresión parcial. El trabajo pasa inmediatamente al estado `unknown`.
3. **`requiresOperatorDecision`**: Respuesta ambigua del sistema o del controlador de hardware.
   - **Regla**: Pasa a estado `unknown` requiriendo intervención y confirmación visual del operador.

---

## 3. POLÍTICA REVISADA DE PAYLOAD Y REIMPRESIONES OFFLINE

Para permitir reimpresiones inmediatas en caso de pérdida de conexión a internet o falla temporal del servidor backend:

1. **Minimización de Datos Sensibles**:
   - `rawBytesBase64`: Se purga poco después de completar la transmisión para liberar almacenamiento (puede re-generarse en cualquier momento).
   - Datos personales PII (teléfono o dirección): Se conservan sanitizados en la terminal local durante el periodo de retención.
2. **Retención Local del Payload**:
   - El payload inmutable `PrintJobPayload` se almacena localmente en `IndexedDbPrintJobStorage` / `NativeSqlitePrintJobStorage` durante **7 días**.
3. **Reimpresión Offline**:
   - Una reimpresión solicitada durante el periodo de retención se procesa directamente utilizando el payload local sanitizado, **sin depender de internet**.
   - Transcurrido el periodo de retención local, las reimpresiones históricas se reconstruirán directamente desde el snapshot inmutable del pedido guardado en la base de datos central.

---

## 4. ALMACENAMIENTO TRANSPARENTE SIN FALLBACK SILENCIOSO EN `localStorage`

- **En Entorno Web (SPA)**:
  - `IndexedDB` es el almacenamiento obligatorio para la cola duradera.
  - Si `IndexedDB` no está disponible (ej. navegador ultra-restringido en modo privado), **NO se utiliza `localStorage` como fallback silencioso**.
  - La aplicación despliega una advertencia gráfica de degradación: *"Persistencia de impresión no disponible. Las comandas no se recuperarán al reiniciar el navegador"*, permitiendo únicamente impresión inmediata en vivo.
- **En Entorno Android Nativo (APK)**:
  - La meta de producción es `NativeSqlitePrintJobStorage` (SQLite duradero nativo).
  - `IndexedDB` opera únicamente como puente documentado durante la fase inicial de desarrollo.

---

## 5. LEASE LOCKING RENOVABLE Y SEPARACIÓN TERMINAL VS INSTANCIA

Para gestionar el procesamiento exclusivo sin carreras entre pestañas o workers:

- **`terminalId`**: Identificador persistente del dispositivo físico registrado (ej. `POS-CAJA-01`).
- **`processorInstanceId`**: Identificador de la pestaña o worker actual (ej. `tab-uuid-8812`).
- **`lockedByInstanceId`**: Instancia que posee el control del trabajo.
- **Renovación Dinámica (Heartbeat)**:
  - El arriendo inicial se fija en 15 segundos.
  - Durante la renderización o transmisión de archivos grandes, la instancia renueva periódicamente el arriendo (`renewLease()`).
  - Al completar la transmisión, la instancia libera explícitamente el trabajo.
  - **Expiración de Lease**: Si una instancia colapsa y el lease expira, otra instancia solo podrá tomar el trabajo si este **no ha entrado en fase de transmisión** (`transmitting`).

---

## 6. PERMISOS ESPECÍFICOS DE IMPRESIÓN

Se introducen permisos granulares dedicados para auditoría y control de acceso:

- `printing.manage`: Configuración de perfiles de impresoras y estaciones de cocina.
- `printing.reprint`: Autorización general de reimpresiones.
- `printing.reprintReceipt`: Autorización para reimprimir comprobantes de venta.
- `printing.reprintKitchen`: Autorización para reimprimir comandas de cocina/bar.
- `cash.openDrawer`: Permiso para accionar la apertura independiente de la gaveta de dinero.

---

## 7. CONFIGURACIÓN PERSONALIZADA DE GAVETA DE DINERO

El pulso electromagnético es configurable por cada perfil de impresora (`PrinterCapability`):

- **Pin de Salida**: `drawerPin: 'pin2' | 'pin5'` (Pin 2 o Pin 5 del conector RJ11/RJ12).
- **Tiempos de Pulso**: `drawerOnTimeMs` ($t_1$) y `drawerOffTimeMs` ($t_2$).
- **Secuencia Hexadecimal Personalizada**: `customDrawerSequenceHex` opcional para impresoras no estándar.
- **Acción Independiente**: `kickCashDrawer()` registra `userUid`, `terminalId` y `reason`, activando el pulso sin gastar ni emitir papel.

---

## 8. CONSOLIDACIÓN FINAL Y AUSENCIA DE CONTRADICCIONES

- Todos los contratos en `src/types/printing.ts` coinciden con los estados terminales (`transmitted`, `confirmed`, `resolved`, `failed`, `cancelled`).
- Se ha eliminado cualquier mención informal a estados inexistentes.
- La conmutación por error (`backupPrinterId`) está condicionada a `safeToRetry`.
- La retención local del payload garantiza la operabilidad offline sin depender de la nube.
