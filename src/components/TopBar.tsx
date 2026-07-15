import { Archive, ChefHat, CreditCard, LayoutGrid, Menu, ReceiptText, Settings2, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { UserRole } from '../types'

type View = 'caja' | 'cocina' | 'historial' | 'admin'

const items: Array<{ id: View; label: string; subtitle: string; icon: typeof CreditCard }> = [
  { id: 'caja', label: 'Caja', subtitle: 'Cobro y armado', icon: CreditCard },
  { id: 'cocina', label: 'Cocina', subtitle: 'Despacho visual', icon: ChefHat },
  { id: 'historial', label: 'Historial', subtitle: 'Cierre del dia', icon: Archive },
  { id: 'admin', label: 'Administracion', subtitle: 'Menu y productos', icon: Settings2 },
]

export function TopBar({
  availableViews,
  collapsed,
  currentView,
  onChange,
  rightSlot,
  userName,
  userRole,
  onSignOut,
}: {
  availableViews: View[]
  collapsed: boolean
  currentView: View
  onChange: (view: View) => void
  rightSlot?: ReactNode
  userName: string
  userRole: UserRole | 'demo'
  mode: 'firebase' | 'local'
  onSignOut: () => Promise<void>
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <aside
      className={`sticky top-5 z-40 flex flex-col rounded-[2rem] border border-white/80 bg-white/75 p-4 shadow-card backdrop-blur xl:h-full xl:sticky xl:top-5 ${
        collapsed ? 'xl:px-3 xl:py-4' : ''
      }`}
    >
      {/* Cabecera Móvil (sólo visible por debajo de xl) */}
      <div className="flex items-center justify-between xl:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-white shadow-lg shadow-accent/20">
            <LayoutGrid size={20} />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-accent">Comandero</p>
            <h1 className="font-serif text-lg text-ink">Pachax POS</h1>
          </div>
        </div>
        <button
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/80 bg-panel/80 text-muted transition hover:bg-white hover:text-ink"
          onClick={() => setMobileMenuOpen((open) => !open)}
          title={mobileMenuOpen ? 'Cerrar menu' : 'Abrir menu'}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Cuerpo del menú (visible en desktop, y en móvil si está abierto) */}
      <div className={`${mobileMenuOpen ? 'mt-4 flex flex-col gap-4' : 'hidden'} xl:flex xl:flex-col xl:flex-1`}>
        {/* Logo de Desktop (oculto en móvil) */}
        <div className={`hidden rounded-[1.3rem] border border-[#f1caca] bg-white shadow-insetSoft xl:block ${collapsed ? 'p-2.5' : 'p-3'}`}>
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white shadow-lg shadow-accent/20">
              <LayoutGrid size={19} />
            </div>
            <div className={collapsed ? 'hidden' : ''}>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">Comandero</p>
              <h1 className="mt-1 font-serif text-xl text-ink">Burger Lab</h1>
            </div>
          </div>
          {!collapsed ? <p className="mt-3 text-xs leading-5 text-muted">Pedidos, cocina y reportes diarios.</p> : null}
        </div>

        {/* Navegación */}
        <nav className="mt-3 space-y-2">
          {items.filter((item) => availableViews.includes(item.id)).map((item) => {
            const Icon = item.icon
            const isActive = currentView === item.id

            return (
              <button
                key={item.id}
                className={`flex w-full items-center rounded-[1.2rem] border text-left transition duration-150 ${
                  isActive
                    ? 'border-accent/20 bg-ink text-white shadow-lg shadow-black/10'
                    : 'border-transparent bg-white/60 text-muted hover:border-white hover:bg-white hover:text-ink'
                } ${collapsed ? 'justify-center gap-0 px-3 py-3' : 'gap-3 px-3 py-2.5'}`}
                onClick={() => {
                  onChange(item.id)
                  setMobileMenuOpen(false)
                }}
                title={item.label}
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    isActive ? 'bg-white/10 text-white' : 'bg-accentWash text-accent'
                  }`}
                >
                  <Icon size={17} />
                </div>
                <div className={`min-w-0 ${collapsed ? 'hidden' : ''}`}>
                  <div className="text-sm font-semibold">{item.label}</div>
                  <div className={`truncate text-xs ${isActive ? 'text-white/65' : 'text-muted'}`}>{item.subtitle}</div>
                </div>
              </button>
            )
          })}
        </nav>

        {/* Slot derecho */}
        {!collapsed ? <div className="mt-5 flex-1">{rightSlot}</div> : <div className="mt-5 flex-1" />}

        {/* Caja de usuario */}
        <div className={`rounded-[1.5rem] border border-white/80 bg-panel/90 text-sm text-muted shadow-insetSoft ${collapsed ? 'p-3' : 'p-4'}`}>
          <div className="flex items-center gap-2 text-ink">
            <ReceiptText size={16} className="text-accent" />
            <span className={`font-semibold ${collapsed ? 'hidden' : ''}`}>{userName}</span>
          </div>
          <p className={`mt-2 leading-6 ${collapsed ? 'hidden' : ''}`}>
            Rol activo: {userRole}. Gestion diaria de Burger Lab.
          </p>
          <button className={`mt-3 text-sm font-semibold text-accent ${collapsed ? 'w-full text-center' : ''}`} onClick={() => void onSignOut()}>
            {collapsed ? 'Salir' : 'Cerrar sesion'}
          </button>
        </div>
      </div>
    </aside>
  )
}
