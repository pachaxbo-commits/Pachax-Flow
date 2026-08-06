# ADR-001: Estructura y Fundamentos de Arquitectura Multi-Tenant

- **Estado**: Aprobado
- **Fecha**: 2026-08-06
- **Autores**: Equipo de Arquitectura PACHAX Flow

## Contexto
El sistema POS actual opera como una plataforma multi-restaurante básica donde cada restaurante tiene su propia colección en Firestore `/restaurants/{restaurantId}`. Sin embargo, para escalar a una plataforma SaaS profesional completa, se requiere una arquitectura multi-inquilino rígida que soporte sucursales (`branches`), permisos configurables por usuario (`Permission`), límites por plan (`PlanFeature`), y aislamiento garantizado contra accesos no autorizados.

## Problema
- Riesgo de consultas sin filtro `restaurantId` que puedan exponer o mezclar datos de otros restaurantes.
- Ausencia de soporte para múltiples sucursales por restaurante.
- Verificación de permisos rígida basada únicamente en roles de cadena fija (`admin`, `caja`, `cocina`).

## Opciones Evaluadas
1. **Opción A (Reescritura completa)**: Reemplazar todo el sistema y esquema de Firestore. (Descartada por violar la regla de no realizar cambios destructivos y romper la compatibilidad con restaurantes ya registrados).
2. **Opción B (Evolución Progresiva con Capa de Abstracción `TenantContext`)**: Extender el modelo de dominio en `src/types.ts` agregando `Branch`, `Permission` y `PlanFeature`, e introducir un servicio helper centralizado `TenantContext` manteniendo compatibilidad hacia atrás mediante mapeos transparentes. (Opción Elegida).

## Decisión
Adoptar la **Opción B**. Todos los tipos de datos operativos extenderán la interfaz base `TenantScopedEntity` que garantiza las propiedades:
- `restaurantId: string`
- `branchId: string`
- `createdAt: string`
- `updatedAt?: string`
- `createdBy?: string`

## Consecuencias
- **Positivas**:
  - Aislamiento multi-inquilino estricto respaldado por TypeScript.
  - Soporte completo para múltiples sucursales.
  - Compatibilidad 100% preservada para cuentas y colecciones de Firestore existentes.
- **Riesgos**:
  - Requiere asegurar que toda consulta en repositorios consuma `TenantContext`.

## Plan de Reversión
En caso de conflicto, los helper getters en `TenantContext` retornan valores por defecto (`branchId: 'default'`).
