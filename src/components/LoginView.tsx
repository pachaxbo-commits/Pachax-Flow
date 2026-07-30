import { KeyRound, LoaderCircle, LogIn, Sparkles, Store } from 'lucide-react'
import { useState } from 'react'

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
    <div className="relative flex min-h-screen items-center justify-center bg-pachaxDark px-4 py-10 text-ink overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-pachaxCyan/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-md rounded-3xl glass-panel border border-pachaxCyan/30 p-8 shadow-float cyan-border-glow">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pachaxNavy to-pachaxNavyLight border border-pachaxCyan/40 text-pachaxCyan cyan-glow">
          <KeyRound size={26} />
        </div>
        <p className="mt-5 text-xs font-bold uppercase tracking-widest text-pachaxCyan flex items-center gap-1.5">
          PACHAX Comandero <Sparkles size={14} />
        </p>
        <h1 className="mt-1 text-2xl font-black text-ink">Ingreso al Sistema</h1>
        <p className="mt-1 text-xs text-muted">
          Plataforma Multi-Restaurante y Posición de Caja en tiempo real.
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault()
            await onSubmit(email, password)
          }}
        >
          <div>
            <label className="block text-xs font-bold text-muted mb-1 uppercase tracking-wider">Correo Electrónico</label>
            <input
              className="w-full rounded-2xl border border-panelBorder bg-pachaxNavy/60 px-4 py-3 text-sm text-ink outline-none transition focus:border-pachaxCyan"
              placeholder="admin@mi-restaurante.com"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted mb-1 uppercase tracking-wider">Contraseña</label>
            <input
              className="w-full rounded-2xl border border-panelBorder bg-pachaxNavy/60 px-4 py-3 text-sm text-ink outline-none transition focus:border-pachaxCyan"
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {error ? (
            <div className="rounded-2xl border border-danger/30 bg-dangerSoft px-4 py-3 text-xs font-semibold text-danger text-center">
              {error}
            </div>
          ) : null}

          <button
            disabled={isLoading || !email || !password}
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pachaxCyanDark to-pachaxCyan text-pachaxDark text-sm font-extrabold flex items-center justify-center gap-2 cyan-glow shadow-card hover:opacity-95 transition disabled:opacity-50"
          >
            {isLoading ? <LoaderCircle size={18} className="animate-spin" /> : <LogIn size={18} />}
            {isLoading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>

        {onSwitchToRegister && (
          <div className="mt-6 pt-4 border-t border-panelBorder text-center">
            <p className="text-xs text-muted">
              ¿No tienes una cuenta para tu restaurante?{' '}
              <button
                onClick={onSwitchToRegister}
                className="text-pachaxCyan font-extrabold hover:underline ml-1 flex items-center justify-center gap-1 mx-auto mt-2"
              >
                <Store size={14} /> Registrar Nuevo Restaurante
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
