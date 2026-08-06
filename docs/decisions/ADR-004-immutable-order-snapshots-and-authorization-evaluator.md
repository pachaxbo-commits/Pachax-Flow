# ADR-004: Snapshots Inmutables de Pedidos y Evaluación Multi-Factor de Autorizaciones

- **Estado**: Aprobado
- **Fecha**: 2026-08-06
- **Autores**: Equipo de Arquitectura PACHAX Flow

## Contexto
En la Etapa 3 se refinó la arquitectura del Núcleo POS para garantizar dos requisitos críticos del sistema SaaS:
1. Las autorizaciones no deben depender únicamente de una relación estática `rol -> permiso`, sino de una tubería o evaluación multi-factorial.
2. Los pedidos históricos deben contener snapshots financieros e ítems completamente inmutables para evitar que cambios futuros en el catálogo distorsionen las ventas pasadas.

## Decisiones Adoptadas

### 1. Evaluador Multi-Factor de Autorización (`permissionService.ts`)
- Se implementó `evaluateAuthorization(query: AuthorizationQuery)` que procesa en cadena:
  1. Estado de la suscripción (`isSubscriptionActive`).
  2. Bypasses de Superadmin y Owner.
  3. Comprobación de funciones del plan contratado (`requiredPlanFeature`).
  4. Overrides específicos del restaurante (`restaurantFeatureOverrides`).
  5. Permisos de usuario (rol y custom permissions).
- Se mantuvo `hasPermission(...)` como envoltorio retrocompatible.

### 2. Snapshots Financieros e Ítems Inmutables (`OrderSnapshot`)
- Cada producto vendido guarda un snapshot de: `name`, `basePrice`, `quantity`, `modifiers`, `extrasTotal`, `unitPriceWithModifiers`, `lineTotal`, `taxAmount`, `discountAmount`.
- Cada pedido generado por `createOrder()` adjunta automáticamente una estructura `financialSnapshot` congelada (`snapshottedAt`, `productSubtotal`, `discountTotal`, `taxTotal`, `deliveryFee`, `grandTotal`, `currency`).
- Modificaciones o borrados futuros en el catálogo de productos o precios jamás alterarán los reportes o pedidos históricos.

## Consecuencias
- Extensibilidad garantizada para planes, feature flags y suscripciones sin reescritura de permisos.
- Integridad contable e histórica 100% protegida contra alteraciones del catálogo.
