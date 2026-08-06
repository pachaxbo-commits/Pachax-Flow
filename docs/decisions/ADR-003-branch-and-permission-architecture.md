# ADR-003: Arquitectura de Sucursales Dinámicas y Permisos Granulares

- **Estado**: Aprobado
- **Fecha**: 2026-08-06
- **Autores**: Equipo de Arquitectura PACHAX Flow

## Contexto
En la Etapa 2 se implementó el modelo de Sucursales (`Branch`) y Permisos Granulares (`Permission`), así como la integración del selector de sucursal en el encabezado de navegación.

## Decisiones Adoptadas

### 1. Sucursales Dinámicas (`isMain` / `isPrimary`)
- Se prohíbe el uso de cadenas mágicas como `if (branchId === "main")`.
- Cada sucursal es una entidad real (`Branch`) almacenada en `/restaurants/{restaurantId}/branches/{branchId}`.
- La sucursal principal del restaurante se identifica mediante la propiedad booleana `isMain: true` (o `isPrimary: true`).
- La función helper `TenantContextService.resolvePrimaryBranch(branches)` resuelve dinámicamente la sucursal principal activa sin depender de cadenas rígidas.

### 2. Matriz de Permisos Granulares (`permissionService.ts`)
- Se creó `src/services/permissionService.ts` desacoplando las autorizaciones de las cadenas fijas de rol.
- Soporta roles extendidos (`superadmin`, `owner`, `admin`, `manager`, `caja`, `cocina`, `pedidos`, `delivery`, `accountant`, `readonly`).
- Función `hasPermission(userRole, permission, customPermissions)` para evaluar permisos granulares en el frontend y backend.

### 3. Reglas de Seguridad en Firestore (`firestore.rules`)
- Se agregaron reglas de seguridad para la subcolección `/restaurants/{restaurantId}/branches/{branchId}`, requiriendo ser miembro activo (`isActiveMember`) para lectura y rol administrativo para gestión.

## Consecuencias
- Cero dependencias rígidas de nombres o IDs de sucursal.
- Control de acceso granular por acción (`orders.create`, `cash.open`, `reports.view`, etc.).
- Experiencia de usuario limpia con indicador de sucursal activa en tiempo real.
