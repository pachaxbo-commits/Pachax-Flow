# ADR-002: Obligatoriedad de TenantContextService, Versionado de Datos y Borrado Lógico

- **Estado**: Aprobado
- **Fecha**: 2026-08-06
- **Autores**: Equipo de Arquitectura PACHAX Flow

## Contexto
Durante la implementación de la Etapa 1 se requirió estandarizar las reglas de integridad de datos y aislamiento por inquilino (`multi-tenancy`) para todas las entidades operativas del sistema.

## Decisiones Adoptadas

### 1. Versionado de Esquema (`schemaVersion`)
Todas las entidades del dominio deben incluir la propiedad `schemaVersion: number` (versión inicial = `1`) para facilitar migraciones futuras de esquema sin romper retrocompatibilidad.

### 2. Borrado Lógico (`Soft Delete`)
Para preservar la información contable e histórica, ninguna entidad operativa será eliminada físicamente por defecto. Se incorporaron los campos estándar:
- `createdAt: string`
- `updatedAt?: string`
- `deletedAt?: string`
- `deletedBy?: string`
- `isDeleted?: boolean`

### 3. Diferenciación de Identificadores
- **ID Interno**: Cadena única (UUID/Hash) inmutable para referencias de base de datos (`id`).
- **Número Visible**: Identificador formateado comprensible para clientes y cajeros (`displayNumber`, `sequence`), personalizable por restaurante o sucursal.

### 4. Guardián de Inquilino Obligatorio (`TenantContextService`)
Se prohíbe cualquier consulta o mutación a Firestore que no haya sido validada previamente por `TenantContextService`. Todo acceso requiere un contexto válido de `restaurantId`, `branchId` y `userUid`.

### 5. Compatibilidad Transparente
Los repositorios existentes y las llamadas a la base de datos mantienen soporte hacia atrás mapeando entidades previas con valores predeterminados seguros (`schemaVersion: 1`, `branchId: 'main'`).

## Consecuencias
- Cero pérdida accidental de datos por eliminaciones físicas.
- Trazabilidad y auditoría integradas en cada entidad.
- Compilación 100% estricta en TypeScript.
