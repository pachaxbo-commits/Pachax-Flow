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
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-6 text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 overflow-hidden">
      {/* Background Ambient Mesh Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative w-full max-w-sm rounded-3xl bg-slate-900/80 border border-slate-800/80 p-6 sm:p-8 shadow-2xl backdrop-blur-xl transition-all">
        {/* Header con Título Libre Estilo Carta / Elegante con Animación */}
        <div className="text-center mb-6">
          <h1 className="text-4xl sm:text-5xl font-serif italic tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-sky-400 animate-pulse drop-shadow-md select-none py-1">
            Pachax Flow
          </h1>
        </div>

        <form
          className="space-y-3.5"
          onSubmit={async (event) => {
            event.preventDefault()
            await onSubmit(email, password)
          }}
        >
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Correo Electrónico
            </label>
            <input
              required
              className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="admin@mi-restaurante.com"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Contraseña
            </label>
            <input
              required
              className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-400 text-center">
              {error}
            </div>
          ) : null}

          <button
            disabled={isLoading || !email || !password}
            type="submit"
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-500 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 hover:opacity-95 transition disabled:opacity-50 mt-2"
          >
            {isLoading ? <LoaderCircle size={18} className="animate-spin" /> : <LogIn size={18} />}
            {isLoading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>

        {onSwitchToRegister && (
          <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
            <button
              onClick={onSwitchToRegister}
              className="inline-flex items-center justify-center gap-1.5 text-xs text-indigo-400 font-bold hover:underline"
            >
              <Store size={14} /> ¿Registrar un restaurante nuevo?
            </button>
          </div>
        )}

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-slate-500">
          <ShieldCheck size={13} className="text-indigo-400" /> Sistema Seguro PACHAX Flow
        </div>
      </div>
    </div>
  )
}
