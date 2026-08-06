# INFORME DE AUDITORÍA TÉCNICA — PACHAX FLOW POS

**Fecha**: 6 de Agosto de 2026  
**Proyecto**: PACHAX Flow POS Multi-Restaurante (`g:\pachax-comandero`)

---

## 1. ESTADO ACTUAL DEL PROYECTO
El proyecto se encuentra en un estado funcional estable y compila correctamente. Ejecuta una aplicación web React con empaquetado nativo Android mediante Capacitor. Cuenta con registro e inicio de sesión en tiempo real mediante Firebase Auth y sincronización en la nube con Cloud Firestore.

---

## 2. RESULTADO DEL BUILD
- **Compilación TypeScript (`tsc -b`)**: Exitosa, sin errores en los archivos fuente de la aplicación.
- **Build de Producción Vite (`vite build`)**: Genera el bundle optimizado en `dist/` en 2.4 segundos.
- **Capacitor Sync (`npx cap sync android`)**: Sincroniza correctamente los activos Web a `android/app/src/main/assets/public`.

---

## 3. ARQUITECTURA ENCONTRADA
- **Frontend**: React 19, TypeScript, TailwindCSS 3, Lucide React.
- **Capa de Datos**: Repositorios abstraídos con patrón de fábrica (`repositoryFactory`, `catalogRepositoryFactory`) que alternan entre datos de Firestore y almacenamiento local (`localStorage`).
- **Autenticación**: `authStore.ts` utilizando Firebase Auth (`signInWithEmail`, `createUserWithEmailAndPassword`, `signOutUser`).

---

## 4. ÁRBOL DE CARPETAS RELEVANTE
```
g:\pachax-comandero\
├── android/                   # Proyecto Nativo Android (Capacitor)
├── firebase/                  # Reglas e índices de Firestore (firestore.rules)
├── docs/                      # Documentación y arquitectura (master-spec.md, architecture-audit.md)
├── src/
│   ├── components/            # Componentes de UI (CajaView, CocinaView, HistorialView, AdminView, etc.)
│   ├── data/                  # Datos semilla del catálogo (catalog.ts)
│   ├── lib/                   # Servicios e integraciones (firebase.ts, escpos.ts, bluetoothPrinter.ts, printerSettings.ts)
│   ├── store/                 # Almacenamiento de estado (authStore.ts, appStore.ts, catalogStore.ts, repositorios)
│   ├── types.ts               # Modelos e interfaces de dominio TypeScript
│   ├── index.css              # Tokens de diseño CSS (PACHAX Light Theme)
│   └── App.tsx / main.tsx     # Punto de entrada de la aplicación
```

---

## 5. LIBRERÍAS PRINCIPALES
- `react` / `react-dom`: v19.2.6
- `firebase`: v12.15.0
- `@capacitor/core`, `@capacitor/android`, `@capacitor/cli`: v8.4.2
- `lucide-react`: v1.21.0
- `tailwindcss`: v3.4.18, `autoprefixer`: v10.4.22, `postcss`: v8.5.6
- `typescript`: v6.0.2, `vite`: v8.0.12

---

## 6. CONFIGURACIÓN DE VITE
`vite.config.ts` utiliza `@vitejs/plugin-react` para la transformación de componentes JSX/TSX. Compila hacia el directorio `dist/`.

---

## 7. CONFIGURACIÓN DE CAPACITOR
`capacitor.config.json`:
- `appId`: `com.pachax.flow`
- `appName`: `PACHAX Flow`
- `webDir`: `dist`
- `androidScheme`: `https`

---

## 8. ESTADO DEL APK ANDROID
- Compilación nativa comprobada exitosamente usando Gradle Wrapper (`assembleDebug`) con el JDK Java 21 JBR.
- Genera el paquete ejecutable `G:\pachax-comandero\Pachax-Flow.apk` (4.9 MB).
- Configuración en Gradle: `minSdkVersion = 24` (Android 7.0+), `targetSdkVersion = 36`.
- Permisos nativos agregados en `AndroidManifest.xml`: Bluetooth (`BLUETOOTH`, `BLUETOOTH_ADMIN`, `BLUETOOTH_CONNECT`, `BLUETOOTH_SCAN`, `ACCESS_FINE_LOCATION`) e Internet.

---

## 9. ESTADO DEL DESPLIEGUE WEB EN VERCEL
- Repositorio remoto Git: `https://github.com/pachaxbo-commits/Pachax-Flow.git` en rama `main`.
- Despliegue continuo configurado con Vercel.

---

## 10. MODELO ACTUAL DE FIRESTORE
- `/restaurants/{restaurantId}` -> Datos del restaurante.
- `/restaurants/{restaurantId}/members/{uid}` -> Datos de miembros del equipo.
- `/restaurants/{restaurantId}/days/{dayKey}/orders/{orderId}` -> Subcolección de pedidos agrupados por día.
- `/restaurants/{restaurantId}/catalog/state` -> Catálogo completo de categorías y productos.
- `/users/{uid}` -> Documento de perfil de usuario y mapeo a su `defaultRestaurantId`.

---

## 11. REGLAS ACTUALES DE FIRESTORE Y STORAGE
- `firebase/firestore.rules`: 411 líneas con validación multi-inquilino que comprueba pertenencia a `members/{uid}` y roles (`admin`, `caja`, `cocina`).
- Firebase Storage: Integrado con la función `uploadProductImageToFirebase` en `src/lib/firebase.ts` almacenando en `restaurants/{restaurantId}/products/{filename}`.

---

## 12. SISTEMA ACTUAL DE AUTENTICACIÓN
- Gestionado en `src/store/authStore.ts` con Firebase Auth.
- Soporta registro de nuevos restaurantes (`createNewRestaurantAccount`) con inicialización de cuenta aislada.

---

## 13. SISTEMA ACTUAL DE PLANES DESACTIVADOS
- En `src/types.ts` existe la propiedad `plan: 'basic' | 'pro' | 'enterprise'` dentro de `RestaurantAccount`.
- Actualmente la lógica de `PlanFeature` y `Entitlements` no está centralizada en un motor de suscripciones; todos los módulos están accesibles.

---

## 14. FUNCIONES DE PLANES QUE TODAVÍA PUEDEN REUTILIZARSE
- El campo `plan` en `RestaurantAccount`.
- El objeto de personalización de marca `RestaurantBranding` (`name`, `logoUrl`, `primaryColor`, `accentColor`, `receiptHeader`, `receiptFooter`, `tablesCount`).

---

## 15. SISTEMA ACTUAL DE IMPRESIÓN
- Implementado en `src/lib/escpos.ts`, `src/lib/bluetoothPrinter.ts`, `src/lib/printerSettings.ts`, `src/components/PrinterSettingsModal.tsx`.
- Genera cadenas de comandos binarios ESC/POS para papel de 58 mm (32 cols) y 80 mm (48 cols), incluye pulso de gaveta de efectivo (`ESC p 0 25 250`), notas resaltadas y corte de papel.

---

## 16. COMPATIBILIDAD REAL CON BLUETOOTH
- Funciona en la web mediante `Web Bluetooth API` (`navigator.bluetooth.requestDevice`).
- Requiere abstracción en `NativePrinterAdapter` para utilizar un plugin de Capacitor Bluetooth Serial cuando la app se ejecute offline en Android.

---

## 17. COMPATIBILIDAD REAL CON IP/LAN
- Configuración visual de IP y puerto TCP 9100 presente en la UI.
- La transmisión TCP directa desde navegadores Web requiere un proxy de red o plugin nativo Socket de Android.

---

## 18. COMPATIBILIDAD REAL CON USB
- No implementada directamente en el frontend. Se incorporará como adaptador en el subsistema de impresión de la Fase 4.

---

## 19. PERSISTENCIA REAL DE LA COLA DE IMPRESIÓN
- Las impresiones son ejecutadas de manera directa síncrona. Aún no existe la colección persistente `printJobs` con reintentos e idempotencia.

---

## 20. FUNCIONAMIENTO OFFLINE REAL
- Firestore tiene habilitada la memoria caché persistente (`persistentLocalCache`).
- Se requiere estructurar un gestor de cola offline centralizado para operaciones de caja en caso de pérdida prolongada de conexión.

---

## 21. MÓDULOS QUE UTILIZAN DATOS SIMULADOS
- `src/data/catalog.ts`: Proporciona datos de demostración predeterminados cuando el restaurante no tiene productos registrados en Firestore.
- `src/lib/botApi.ts`: Simulación del API del Bot de WhatsApp.

---

## 22. PROBLEMAS DE SEGURIDAD
- El bypass de autenticación temporal en `authStore.ts` concede rol `admin` si el documento `members/{uid}` no existe. Se reemplazará en la Fase 2 por verificación estricta respaldada en reglas de Firestore y Custom Claims.
- Los subtotales de pedidos son calculados en el cliente; se agregará verificación en Cloud Functions para validar precios e impuestos.

---

## 23. RIESGOS MULTI-RESTAURANTE
- Si el `restaurantId` almacenado en `localStorage` no coincide con el del usuario autenticado, las consultas a Firestore podrían apuntar a un restaurante equivocado. Se resolverá con el guardián de contexto `TenantContext`.

---

## 24. PROBLEMAS DE CÓDIGO
- Componente `CajaView.tsx` muy extenso (135 KB, >2,500 líneas). Debe modularizarse en componentes más pequeños (`ProductCatalogGrid`, `CartPanel`, `OrderTypeSelector`, `PaymentModal`, `TableSelectorModal`).
- `AdminView.tsx` (48 KB) e `HistorialView.tsx` (30 KB) también requieren dividirse en sub-módulos.

---

## 25. FUNCIONALIDADES DUPLICADAS
- Formateo de modificadores y cálculo de totales repetidos entre `CajaView.tsx`, `OrderTicket.tsx` y `escpos.ts`.

---

## 26. COMPONENTES EXCESIVAMENTE GRANDES
- `src/components/CajaView.tsx` (135 KB)
- `src/components/AdminView.tsx` (48 KB)
- `src/components/HistorialView.tsx` (30 KB)

---

## 27. ARCHIVOS QUE DEBEN MODIFICARSE PRIMERO
1. `src/types.ts`: Ampliar interfaces de multi-tenancy, sucursales, permisos y planes.
2. `src/lib/firebase.ts`: Implementar contexto seguro `TenantContext` y helper centralizado `getTenantRef()`.
3. `src/store/authStore.ts`: Refactorizar el manejo de membresías, sucursales y permisos configurables.
4. `src/store/tenantStore.ts` *(Nuevo)*: Gestor del estado del restaurante activo, sucursal activa y permisos.

---

## 28. PROPUESTA DE ETAPA 1
- **Nombre**: Etapa 1 — Fundamentos de Arquitectura & Modelo de Dominio Multi-Tenant.
- **Alcance**:
  1. Crear la documentación de arquitectura en el directorio `docs/`.
  2. Ampliar `src/types.ts` con interfaces para `Branch`, `RestaurantMember`, `Permission`, `PlanFeature`, `RestaurantEntitlements` y `SubscriptionPlan`.
  3. Crear el servicio `TenantContextService` para aislar `restaurantId` y `branchId` en todas las consultas.
  4. Garantizar que la aplicación siga compilando y funcionando limpiamente sin romper los módulos actuales.

---

## 29. CRITERIOS DE ACEPTACIÓN DE ETAPA 1
1. Documentos `docs/master-spec.md` y `docs/architecture-audit.md` creados y actualizados.
2. Definición estricta de tipos en TypeScript para Sucursales, Permisos, Inquilinos y Planes.
3. Creación del servicio `TenantContext` sin introducir errores en la interfaz existente.
4. Verificación de compilación exitosa (`tsc -b` y `vite build` pasan con 0 errores).

---

## 30. RIESGOS ANTES DE COMENZAR
- Riesgo de romper el inicio de sesión o la lectura de datos existentes si se modifica drásticamente la estructura de `RestaurantAccount` o `RestaurantMember`.
- **Mitigación**: Implementar mapeos de compatibilidad transparente hacia atrás (*fallback mappings*).
