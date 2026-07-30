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
    <div className="relative flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 overflow-hidden">
      {/* Subtle Mesh Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-md rounded-3xl bg-slate-900/90 border border-slate-800 p-8 sm:p-10 shadow-2xl backdrop-blur-xl z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-emerald-500 text-white shadow-xl shadow-indigo-500/20 mb-4">
            <Store size={30} />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold uppercase tracking-widest text-emerald-400 mb-2">
            Alta de Negocio <Sparkles size={12} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Registrar Restaurante</h1>
          <p className="text-xs text-slate-400 mt-1">
            Crea la cuenta independiente de tu restaurante en PACHAX Flow
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 p-3.5 text-xs font-semibold text-rose-400 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Nombre del Restaurante
            </label>
            <div className="relative">
              <Store className="absolute left-3.5 top-3.5 text-slate-500" size={18} />
              <input
                type="text"
                required
                placeholder="Ej. PACHAX Central"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-white text-sm placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Tu Nombre Completo
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 text-slate-500" size={18} />
              <input
                type="text"
                required
                placeholder="Ej. Fabri Admin"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-white text-sm placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 text-slate-500" size={18} />
              <input
                type="email"
                required
                placeholder="pachax.bo@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-white text-sm placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Contraseña de Acceso
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 text-slate-500" size={18} />
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-white text-sm placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 hover:opacity-95 transition disabled:opacity-50 mt-3"
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

        <div className="mt-8 pt-5 border-t border-slate-800/80 text-center">
          <p className="text-xs text-slate-400">
            ¿Ya tienes una cuenta registrada?{' '}
            <button
              onClick={onSwitchToLogin}
              className="text-indigo-400 font-bold hover:underline ml-1"
            >
              Iniciar Sesión
            </button>
          </p>
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck size={14} className="text-emerald-400" /> Aislamiento de Datos y Seguridad PACHAX Flow
        </div>
      </div>
    </div>
  )
}
