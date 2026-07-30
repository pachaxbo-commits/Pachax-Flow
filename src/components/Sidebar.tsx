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
  Printer,
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
  onOpenPrinterSettings?: () => void
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
  onOpenPrinterSettings,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(true)

  const navItems: { id: ViewType; label: string; icon: typeof UtensilsCrossed; badge?: number }[] = [
    { id: 'caja', label: 'Caja POS', icon: UtensilsCrossed, badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined },
    { id: 'cocina', label: 'Cocina', icon: ChefHat },
    { id: 'historial', label: 'Historial', icon: History },
    { id: 'bot', label: 'WhatsApp', icon: MessageSquare },
    { id: 'admin', label: 'Menú & Admin', icon: Settings },
  ]

  const filteredItems = navItems.filter((item) => availableViews.includes(item.id))

  return (
    <>
      {/* Desktop & Tablet Sidebar */}
      <aside
        className={`hidden md:flex flex-col justify-between transition-all duration-300 ease-in-out z-30 sticky top-4 h-[calc(100vh-2rem)] rounded-3xl bg-slate-900/90 border border-slate-800/80 p-3 shadow-2xl backdrop-blur-xl ${
          isCollapsed ? 'w-[78px]' : 'w-[230px]'
        }`}
      >
        {/* Top Header & Brand Logo */}
        <div>
          <div className="flex items-center justify-between px-2 py-3 border-b border-slate-800/80 mb-4">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex-shrink-0 h-10 w-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                {logoUrl ? (
                  <img src={logoUrl} alt={restaurantName} className="h-8 w-8 object-contain rounded-xl" />
                ) : (
                  <Store size={20} className="text-indigo-400" />
                )}
              </div>
              {!isCollapsed && (
                <div className="min-w-0">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                    PACHAX Flow <Sparkles size={10} />
                  </div>
                  <div className="text-xs font-bold text-white truncate">{restaurantName}</div>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-7 w-7 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
              title={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1.5">
            {filteredItems.map((item) => {
              const Icon = item.icon
              const isActive = currentView === item.id

              return (
                <button
                  key={item.id}
                  onClick={() => onChangeView(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200 group relative ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-sky-500 text-white font-bold shadow-lg shadow-indigo-600/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60 font-medium'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <div className="relative flex-shrink-0">
                    <Icon size={20} className={isActive ? 'text-white' : 'group-hover:text-white'} />
                    {item.badge !== undefined && (
                      <span className="absolute -top-2 -right-2 h-4 min-w-[18px] px-1 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black flex items-center justify-center animate-pulse">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  {!isCollapsed && <span className="text-xs tracking-wide truncate">{item.label}</span>}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Footer & User Profile */}
        <div className="border-t border-slate-800/80 pt-3 space-y-2">
          {onOpenPrinterSettings && (
            <button
              onClick={onOpenPrinterSettings}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-start gap-2.5 px-3'} py-2 rounded-xl bg-slate-800/70 hover:bg-slate-800 text-xs font-semibold text-indigo-300 border border-indigo-500/20 transition`}
              title="Ajustes de Impresora Térmica"
            >
              <Printer size={16} className="text-indigo-400 shrink-0" />
              {!isCollapsed && <span>Impresoras</span>}
            </button>
          )}

          {onOpenCustomizer && !isCollapsed && (
            <button
              onClick={onOpenCustomizer}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800/40 hover:bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-700/50 transition"
            >
              <Sparkles size={14} className="text-emerald-400" /> Personalizar Marca
            </button>
          )}

          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-1 pt-1`}>
            {!isCollapsed && (
              <div className="min-w-0 pr-2">
                <div className="text-xs font-bold text-white truncate">{userName}</div>
                <div className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider">{userRole}</div>
              </div>
            )}
            <button
              onClick={() => void onSignOut()}
              className="h-8 w-8 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 flex items-center justify-center transition"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 px-2 py-1.5 flex items-center justify-around">
        {filteredItems.map((item) => {
          const Icon = item.icon
          const isActive = currentView === item.id

          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition ${
                isActive ? 'text-indigo-400 font-bold scale-105' : 'text-slate-400 hover:text-white'
              }`}
            >
              <div className="relative">
                <Icon size={20} />
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 h-4 min-w-[16px] px-1 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </button>
          );
        })}
        {onOpenPrinterSettings && (
          <button
            onClick={onOpenPrinterSettings}
            className="flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-slate-400 hover:text-white transition"
          >
            <Printer size={20} />
            <span className="text-[10px] tracking-tight">Impresora</span>
          </button>
        )}
      </div>
    </>
  )
}
