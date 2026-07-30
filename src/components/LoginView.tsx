import { useState } from 'react'
import { LoaderCircle, LogIn, Sparkles, Store, ShieldCheck, HelpCircle } from 'lucide-react'

export function LoginView({
  error,
  isLoading,
  onSubmit,
  onSwitchToRegister,
}: {
  error: string | null
  isLoading: boolean
  onSubmit: (email: string, password: string) => Promise<void>
  onSwitchToRegister?: () => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 overflow-hidden">
      {/* Subtle Mesh Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-md rounded-3xl bg-slate-900/90 border border-slate-800 p-8 sm:p-10 shadow-2xl backdrop-blur-xl">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-sky-500 text-white shadow-xl shadow-indigo-500/20 mb-4">
            <Sparkles size={30} />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[11px] font-bold uppercase tracking-widest text-indigo-400 mb-2">
            PACHAX Flow <Sparkles size={12} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Ingreso al Sistema</h1>
          <p className="text-xs text-slate-400 mt-1">
            Plataforma POS Multi-Restaurante y Comandero en tiempo real
          </p>
        </div>

        {/* Demo Credentials Box */}
        <div className="mb-6 rounded-2xl bg-slate-800/50 border border-slate-700/60 p-3.5 text-xs text-slate-300 flex items-start gap-2.5">
          <HelpCircle size={16} className="text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white block">¿Primera vez usando Pachax Flow?</span>
            <span className="text-slate-400 leading-relaxed block mt-0.5">
              Haz clic abajo en <strong className="text-indigo-400 font-semibold">"Registrar Nuevo Restaurante"</strong> para crear la cuenta de tu negocio en 10 segundos.
            </span>
          </div>
        </div>

        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault()
            await onSubmit(email, password)
          }}
        >
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Correo Electrónico
            </label>
            <input
              required
              className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="admin@mi-restaurante.com"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Contraseña
            </label>
            <input
              required
              className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-400 text-center">
              {error}
            </div>
          ) : null}

          <button
            disabled={isLoading || !email || !password}
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-500 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 hover:opacity-95 transition disabled:opacity-50 mt-2"
          >
            {isLoading ? <LoaderCircle size={18} className="animate-spin" /> : <LogIn size={18} />}
            {isLoading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>

        {onSwitchToRegister && (
          <div className="mt-8 pt-5 border-t border-slate-800/80 text-center">
            <p className="text-xs text-slate-400">
              ¿Quieres registrar un restaurante nuevo?
            </p>
            <button
              onClick={onSwitchToRegister}
              className="mt-2.5 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-300 font-bold text-xs transition"
            >
              <Store size={15} /> Registrar Nuevo Restaurante
            </button>
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck size={14} className="text-indigo-400" /> Sistema Seguro Multi-Inquilino PACHAX
        </div>
      </div>
    </div>
  )
}
