import { useState, type FormEvent } from 'react'
import { useAuth } from './hooks/useAuth'
import { Button } from '../../shared/ui/Button'
import { BrandMark } from '../../shared/ui/BrandMark'
import { errorMessage } from '../../shared/api/http'
export function AccessPage() {
  const auth = useAuth(),
    setup = auth.session?.setupRequired
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget),
      username = String(data.get('username')).trim().toLowerCase(),
      password = String(data.get('password'))
    setBusy(true)
    setError('')
    try {
      if (setup)
        await auth.setup({
          username,
          password,
          displayName: String(data.get('displayName')).trim(),
        })
      await auth.login(username, password)
    } catch (e) {
      setError(errorMessage(e))
      await auth.refresh()
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="flex min-h-dvh items-center justify-center p-5">
      <section className="w-full max-w-md rounded-3xl border border-line bg-white p-7 shadow-sm sm:p-10">
        <BrandMark className="size-12 text-brand-700" />
        <p className="mt-5 text-xs font-semibold tracking-widest text-muted">ODONTOCARE</p>
        <h1 className="mt-2 text-2xl font-semibold">
          {setup ? 'Tu consultorio empieza aquí' : 'Bienvenido de nuevo'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          {setup
            ? 'Crea tu cuenta administradora para configurar el consultorio.'
            : 'Accede a tu espacio de trabajo con tu cuenta.'}
        </p>
        {auth.loading ? (
          <p role="status" className="mt-6">
            Comprobando acceso…
          </p>
        ) : auth.error ? (
          <div className="mt-6">
            <p role="alert">{auth.error}</p>
            <Button onClick={() => void auth.refresh()} className="mt-4">
              Reintentar conexión
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-5">
            {setup && (
              <label className="field-label">
                Nombre completo
                <input
                  name="displayName"
                  required
                  maxLength={120}
                  autoComplete="name"
                  className="field"
                />
              </label>
            )}
            <label className="field-label">
              Usuario
              <input
                name="username"
                aria-label="Usuario"
                required
                minLength={3}
                maxLength={60}
                pattern="[a-zA-Z0-9._-]+"
                autoComplete="username"
                autoCapitalize="none"
                className="field"
              />
              <span className="field-help">Letras, números, puntos, guiones y guion bajo.</span>
            </label>
            <label className="field-label">
              Contraseña
              <input
                name="password"
                aria-label="Contraseña"
                type="password"
                required
                minLength={setup ? 10 : undefined}
                maxLength={72}
                autoComplete={setup ? 'new-password' : 'current-password'}
                className="field"
              />
              {setup && (
                <span className="field-help">
                  Al menos 10 caracteres. Usa una contraseña propia.
                </span>
              )}
            </label>
            {error && (
              <p role="alert" className="error-box">
                {error}
              </p>
            )}
            <Button disabled={busy} className="w-full">
              {busy ? 'Un momento…' : setup ? 'Crear cuenta y acceder' : 'Iniciar sesión'}
            </Button>
          </form>
        )}
        <p className="mt-7 text-xs leading-5 text-muted">
          Una instalación para tu consultorio. Una experiencia para todo tu equipo.
        </p>
      </section>
    </main>
  )
}
