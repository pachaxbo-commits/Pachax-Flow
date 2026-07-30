import {
  UtensilsCrossed,
  ChefHat,
  History,
  MessageSquare,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Store,
  Sparkles,
} from 'lucide-react'
import { useState } from 'react'
import type { UserRole } from '../types'

export type ViewType = 'caja' | 'cocina' | 'historial' | 'admin' | 'bot'

interface SidebarProps {
  currentView: ViewType
  availableViews: ViewType[]
  onChangeView: (view: ViewType) => void
  userRole: UserRole | 'demo'
  userName: string
  restaurantName: string
  logoUrl?: string
  pendingOrdersCount: number
  onSignOut: () => Promise<void>
  onOpenCustomizer?: () => void
}

export function Sidebar({
  currentView,
  availableViews,
  onChangeView,
  userRole,
  userName,
  restaurantName,
  logoUrl,
  pendingOrdersCount,
  onSignOut,
  onOpenCustomizer,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(true)

  const navItems: { id: ViewType; label: string; icon: typeof UtensilsCrossed; badge?: number }[] = [
    { id: 'caja', label: 'Caja POS', icon: UtensilsCrossed, badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined },
    { id: 'cocina', label: 'Cocina', icon: ChefHat },
    { id: 'historial', label: 'Historial', icon: History },
    { id: 'bot', label: 'WhatsApp', icon: MessageSquare },
    { id: 'admin', label: 'Ajustes', icon: Settings },
  ]

  const filteredItems = navItems.filter((item) => availableViews.includes(item.id))

  return (
    <>
      {/* Desktop & Tablet Sidebar */}
      <aside
        className={`hidden md:flex flex-col justify-between transition-all duration-300 ease-in-out z-30 sticky top-4 h-[calc(100vh-2rem)] rounded-3xl glass-panel border border-panelBorder p-3 shadow-float ${
          isCollapsed ? 'w-[78px]' : 'w-[230px]'
        }`}
      >
        {/* Top Header & Brand Logo */}
        <div>
          <div className="flex items-center justify-between px-2 py-3 border-b border-panelBorder/60 mb-4">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex-shrink-0 h-10 w-10 rounded-2xl bg-gradient-to-br from-pachaxNavy to-pachaxDark border border-pachaxCyan/40 flex items-center justify-center text-pachaxCyan cyan-glow">
                {logoUrl ? (
                  <img src={logoUrl} alt={restaurantName} className="h-8 w-8 object-contain rounded-xl" />
                ) : (
                  <Store size={22} className="text-pachaxCyan" />
                )}
              </div>
              {!isCollapsed && (
                <div className="min-w-0">
                  <div className="text-xs font-bold uppercase tracking-wider text-pachaxCyan flex items-center gap-1">
                    PACHAX <Sparkles size={11} />
                  </div>
                  <div className="text-sm font-extrabold text-ink truncate">{restaurantName}</div>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-7 w-7 rounded-xl bg-pachaxNavy/80 hover:bg-pachaxNavyLight text-muted hover:text-pachaxCyan flex items-center justify-center transition"
              title={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-2">
            {filteredItems.map((item) => {
              const Icon = item.icon
              const isActive = currentView === item.id

              return (
                <button
                  key={item.id}
                  onClick={() => onChangeView(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-200 group relative ${
                    isActive
                      ? 'bg-gradient-to-r from-pachaxNavy to-pachaxNavyLight text-pachaxCyan border border-pachaxCyan/30 shadow-card cyan-border-glow font-bold'
                      : 'text-muted hover:text-ink hover:bg-pachaxNavy/50 font-medium'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <div className="relative flex-shrink-0">
                    <Icon size={22} className={isActive ? 'text-pachaxCyan' : 'group-hover:text-ink'} />
                    {item.badge !== undefined && (
                      <span className="absolute -top-2 -right-2 h-5 min-w-[20px] px-1 rounded-full bg-accent text-pachaxDark text-[11px] font-black flex items-center justify-center animate-pulse">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  {!isCollapsed && <span className="text-sm tracking-wide truncate">{item.label}</span>}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Footer & User Profile */}
        <div className="border-t border-panelBorder/60 pt-3 space-y-2">
          {onOpenCustomizer && !isCollapsed && (
            <button
              onClick={onOpenCustomizer}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-pachaxNavy/60 hover:bg-pachaxNavy text-xs font-semibold text-pachaxCyan border border-pachaxCyan/20 transition"
            >
              <Sparkles size={14} /> Personalizar Marca
            </button>
          )}

          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-1`}>
            {!isCollapsed && (
              <div className="min-w-0 pr-2">
                <div className="text-xs font-bold text-ink truncate">{userName}</div>
                <div className="text-[11px] text-pachaxCyan/80 font-medium uppercase tracking-wider">{userRole}</div>
              </div>
            )}
            <button
              onClick={() => void onSignOut()}
              className="h-9 w-9 rounded-xl bg-dangerSoft hover:bg-danger/20 text-danger flex items-center justify-center transition"
              title="Cerrar sesión"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (Ultra compact for cellphones) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-pachaxDark/95 backdrop-blur-xl border-t border-panelBorder px-3 py-2 flex items-center justify-around">
        {filteredItems.map((item) => {
          const Icon = item.icon
          const isActive = currentView === item.id

          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
                isActive ? 'text-pachaxCyan font-bold scale-105' : 'text-muted hover:text-ink'
              }`}
            >
              <div className="relative">
                <Icon size={22} />
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 h-4 min-w-[16px] px-1 rounded-full bg-accent text-pachaxDark text-[10px] font-black flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}
