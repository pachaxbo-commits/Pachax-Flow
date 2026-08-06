import type { TenantScopedEntity } from '../types'

export interface TenantContext {
  restaurantId: string
  branchId: string
  userUid: string | null
  userRole?: string | null
}

const CURRENT_SCHEMA_VERSION = 1
const DEFAULT_BRANCH_ID = 'main'

let currentContext: TenantContext = {
  restaurantId: 'principal',
  branchId: DEFAULT_BRANCH_ID,
  userUid: null,
}

export const TenantContextService = {
  setContext(restaurantId: string, branchId: string = DEFAULT_BRANCH_ID, userUid: string | null = null, userRole?: string | null): void {
    if (!restaurantId || !restaurantId.trim()) {
      throw new Error('[TenantContextService] restaurantId invalido')
    }

    currentContext = {
      restaurantId: restaurantId.trim(),
      branchId: (branchId && branchId.trim()) || DEFAULT_BRANCH_ID,
      userUid: userUid ? userUid.trim() : null,
      userRole: userRole || null,
    }
  },

  getContext(): TenantContext {
    return { ...currentContext }
  },

  requireValidContext(): TenantContext {
    if (!currentContext.restaurantId || !currentContext.restaurantId.trim()) {
      throw new Error('[TenantContextService] Operacion denegada: Falta contexto de restaurante activo (restaurantId)')
    }
    return { ...currentContext }
  },

  /** Attaches tenant scoping, schema versioning, and timestamp metadata to newly created entities */
  createScopedEntityData<T extends Record<string, unknown>>(data: T, createdByUid?: string): T & TenantScopedEntity {
    const ctx = this.requireValidContext()
    const now = new Date().toISOString()

    return {
      ...data,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      restaurantId: ctx.restaurantId,
      branchId: ctx.branchId,
      createdAt: (data.createdAt as string) || now,
      updatedAt: now,
      createdBy: createdByUid || ctx.userUid || 'system',
      isDeleted: false,
    }
  },

  /** Stamps soft delete metadata onto entity updates */
  createSoftDeleteData(deletedByUid?: string) {
    const ctx = this.requireValidContext()
    const now = new Date().toISOString()

    return {
      isDeleted: true,
      deletedAt: now,
      deletedBy: deletedByUid || ctx.userUid || 'system',
      updatedAt: now,
    }
  },
}
