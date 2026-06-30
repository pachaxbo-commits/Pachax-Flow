import { KeyRound, LoaderCircle, LogIn } from 'lucide-react'
import { useState } from 'react'
import { Button } from './ui/Button'
import { Panel } from './ui/Panel'

export function LoginView({
  error,
  isLoading,
  onSubmit,
}: {
  error: string | null
  isLoading: boolean
  onSubmit: (email: string, password: string) => Promise<void>
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-canvas px-4 py-10 text-ink">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.8),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(197,91,51,0.08),_transparent_25%)]" />
      <Panel className="relative w-full max-w-md border-white/85 bg-white/88 p-7">
        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-accent text-white shadow-lg shadow-accent/20">
          <KeyRound size={24} />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.28em] text-accent">Comandero</p>
        <h1 className="mt-2 font-serif text-4xl text-ink">Ingreso seguro</h1>
        <p className="mt-3 text-sm leading-7 text-muted">
          Accede con tu correo y contrasena asignados en Firebase Authentication. No existe registro publico desde la app.
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault()
            await onSubmit(email, password)
          }}
        >
          <input
            className="w-full rounded-[1.25rem] border border-line bg-canvas/35 px-4 py-3 text-sm text-ink outline-none transition focus:border-accent"
            placeholder="Correo"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <input
            className="w-full rounded-[1.25rem] border border-line bg-canvas/35 px-4 py-3 text-sm text-ink outline-none transition focus:border-accent"
            placeholder="Contrasena"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          {error ? <div className="rounded-[1.15rem] border border-[#f0cfbf] bg-[#fff3ec] px-4 py-3 text-sm text-[#9c4d2a]">{error}</div> : null}

          <Button fullWidth size="lg" className="shadow-xl shadow-accent/20" disabled={isLoading || !email || !password} type="submit">
            {isLoading ? <LoaderCircle size={18} className="animate-spin" /> : <LogIn size={18} />}
            {isLoading ? 'Ingresando...' : 'Entrar'}
          </Button>
        </form>
      </Panel>
    </div>
  )
}
