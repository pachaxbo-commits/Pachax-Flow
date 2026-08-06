import { useState } from 'react'
import { LoaderCircle, LogIn, Store, ShieldCheck } from 'lucide-react'

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
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-6 text-slate-900 font-sans selection:bg-blue-500/20 selection:text-blue-700 overflow-hidden">
      {/* Background Soft Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative w-full max-w-sm rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 shadow-xl backdrop-blur-md transition-all">
        {/* Header con Título Elegante */}
        <div className="text-center mb-6">
          <h1 className="text-4xl sm:text-5xl font-serif italic tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-900 drop-shadow-sm select-none py-1">
            Pachax Flow
          </h1>
        </div>

        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault()
            await onSubmit(email, password)
          }}
        >
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Correo Electrónico
            </label>
            <input
              required
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20"
              placeholder="admin@mi-restaurante.com"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Contraseña
            </label>
            <input
              required
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20"
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-600 text-center">
              {error}
            </div>
          ) : null}

          <button
            disabled={isLoading || !email || !password}
            type="submit"
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-sky-600 transition disabled:opacity-50 mt-2"
          >
            {isLoading ? <LoaderCircle size={18} className="animate-spin" /> : <LogIn size={18} />}
            {isLoading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>

        {onSwitchToRegister && (
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <button
              onClick={onSwitchToRegister}
              className="inline-flex items-center justify-center gap-1.5 text-xs text-blue-600 font-bold hover:underline"
            >
              <Store size={14} /> ¿Registrar un restaurante nuevo?
            </button>
          </div>
        )}

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck size={14} className="text-blue-600" /> PACHAX Flow POS System
        </div>
      </div>
    </div>
  )
}
