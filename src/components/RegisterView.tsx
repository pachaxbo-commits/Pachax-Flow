import { useState } from 'react'
import { Sparkles, Store, Mail, Lock, User, ArrowRight, ShieldCheck } from 'lucide-react'
import { createNewRestaurantAccount } from '../lib/firebase'

interface RegisterViewProps {
  onSuccess: () => void
  onSwitchToLogin: () => void
}

export function RegisterView({ onSuccess, onSwitchToLogin }: RegisterViewProps) {
  const [restaurantName, setRestaurantName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await createNewRestaurantAccount({
        restaurantName,
        ownerName,
        email,
        password,
      })
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar el restaurante.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-pachaxDark px-4 py-8 relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-pachaxCyan/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md rounded-3xl glass-panel border border-pachaxCyan/30 p-8 shadow-float cyan-border-glow relative z-10">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-pachaxNavy to-pachaxNavyLight border border-pachaxCyan/40 flex items-center justify-center text-pachaxCyan cyan-glow mb-3">
            <Sparkles size={28} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-ink">Registrar Restaurante</h1>
          <p className="text-xs text-muted mt-1">Crea la cuenta de tu restaurante en PACHAX Comandero</p>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl bg-dangerSoft border border-danger/30 p-3 text-xs font-semibold text-danger text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-muted mb-1 uppercase tracking-wider">Nombre del Restaurante</label>
            <div className="relative">
              <Store className="absolute left-3 top-3 text-muted" size={18} />
              <input
                type="text"
                required
                placeholder="Ej. BurguerLab Downtown"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-pachaxNavy/60 border border-panelBorder text-ink text-sm focus:border-pachaxCyan focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-muted mb-1 uppercase tracking-wider">Tu Nombre Completo</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-muted" size={18} />
              <input
                type="text"
                required
                placeholder="Ej. Juan Pérez"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-pachaxNavy/60 border border-panelBorder text-ink text-sm focus:border-pachaxCyan focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-muted mb-1 uppercase tracking-wider">Correo Electrónico</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-muted" size={18} />
              <input
                type="email"
                required
                placeholder="administracion@minegocio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-pachaxNavy/60 border border-panelBorder text-ink text-sm focus:border-pachaxCyan focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-muted mb-1 uppercase tracking-wider">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-muted" size={18} />
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-pachaxNavy/60 border border-panelBorder text-ink text-sm focus:border-pachaxCyan focus:outline-none transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-pachaxCyanDark to-pachaxCyan text-pachaxDark text-sm font-extrabold flex items-center justify-center gap-2 cyan-glow shadow-card hover:opacity-95 transition mt-2"
          >
            {isLoading ? (
              'Creando Restaurante...'
            ) : (
              <>
                Crear Mi Cuenta <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-panelBorder text-center">
          <p className="text-xs text-muted">
            ¿Ya tienes una cuenta activada?{' '}
            <button
              onClick={onSwitchToLogin}
              className="text-pachaxCyan font-extrabold hover:underline ml-1"
            >
              Iniciar Sesión
            </button>
          </p>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted">
          <ShieldCheck size={14} className="text-pachaxCyan" /> Garantía de Aislamiento y Seguridad PACHAX
        </div>
      </div>
    </div>
  )
}
