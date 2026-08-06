import type { Permission, UserRole } from '../types'

/** Role permissions matrix defining default permissions assigned to each role */
export const ROLE_PERMISSIONS_MAP: Record<UserRole, Permission[]> = {
  superadmin: [
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
  owner: [
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
  admin: [
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
  manager: [
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
    'inventory.view',
    'reports.view',
    'printers.manage',
  ],
  caja: [
    'orders.create',
    'orders.edit',
    'orders.cancel',
    'orders.applyDiscount',
    'orders.viewAll',
    'payments.create',
    'cash.open',
    'cash.close',
    'printers.manage',
  ],
  cocina: ['orders.viewAll'],
  pedidos: ['orders.create', 'orders.edit', 'orders.viewAll'],
  delivery: ['orders.viewAll'],
  accountant: ['reports.view', 'cash.open', 'cash.close'],
  readonly: ['reports.view'],
}

export function getRoleDefaultPermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS_MAP[role] || []
}

export function hasPermission(
  role: UserRole | null | undefined,
  permission: Permission,
  customPermissions?: Permission[]
): boolean {
  if (!role) return false
  if (role === 'superadmin' || role === 'owner' || role === 'admin') return true

  const permissions = customPermissions && customPermissions.length > 0
    ? customPermissions
    : getRoleDefaultPermissions(role)

  return permissions.includes(permission)
}
