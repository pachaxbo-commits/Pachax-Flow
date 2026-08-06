import { useSyncExternalStore } from 'react'
import { TenantContextService } from '../services/tenantService'
import type { Branch, Permission, UserRole } from '../types'

interface TenantState {
  activeRestaurantId: string
  activeBranchId: string
  activeBranchName: string
  availableBranches: Branch[]
  userPermissions: Permission[]
}

const defaultMainBranch: Branch = {
  id: 'main',
  restaurantId: 'principal',
  name: 'Sucursal Principal',
  code: 'SUC-01',
  isActive: true,
  isMain: true,
  createdAt: new Date().toISOString(),
}

let state: TenantState = {
  activeRestaurantId: 'principal',
  activeBranchId: 'main',
  activeBranchName: 'Sucursal Principal',
  availableBranches: [defaultMainBranch],
  userPermissions: [
    'orders.create',
    'orders.edit',
    'orders.cancel',
    'orders.applyDiscount',
    'orders.reopen',
    'orders.viewAll',
    'payments.create',
    'payments.refund',
    'cash.open',
    'cash.close',
    'catalog.create',
    'catalog.edit',
    'catalog.delete',
    'inventory.view',
    'reports.view',
    'users.create',
    'settings.manage',
    'printers.manage',
    'branches.manage',
  ],
}

const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return state
}

export function useTenantStore() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  return {
    ...current,
    setTenant(restaurantId: string, branchId: string = 'main', userUid: string | null = null, userRole?: UserRole) {
      TenantContextService.setContext(restaurantId, branchId, userUid, userRole)
      state = {
        ...state,
        activeRestaurantId: restaurantId,
        activeBranchId: branchId,
      }
      emit()
    },
    switchBranch(branchId: string) {
      const branch = state.availableBranches.find((b) => b.id === branchId)
      if (branch) {
        TenantContextService.setContext(state.activeRestaurantId, branch.id)
        state = {
          ...state,
          activeBranchId: branch.id,
          activeBranchName: branch.name,
        }
        emit()
      }
    },
    hasPermission(permission: Permission): boolean {
      return state.userPermissions.includes(permission)
    },
  }
}
