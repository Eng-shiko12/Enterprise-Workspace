import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import AuthShell from '../../components/layout/AuthShell'
import { Button, Field, Input } from '../../components/ui'
import { useAuth } from '../../hooks'
import { getErrorMessage } from '../../lib/errors'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const user = await login({ email: form.email.trim(), password: form.password })
      toast.success(`Welcome back, ${user.name.split(' ')[0]}`)
      navigate('/workspaces', { replace: true })
    } catch (err) {
      const message = getErrorMessage(err)
      toast.error(message)
      if (err?.response?.status === 403 && /verify/i.test(message)) {
        navigate(`/verify-email?email=${encodeURIComponent(form.email.trim())}`)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue to your workspaces."
      footer={<>New to Vortex? <Link to="/register" className="font-semibold text-brand hover:underline">Create an account</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          {(i) => <Input id={i} type="email" autoComplete="email" autoFocus required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@company.com" />}
        </Field>
        <Field label="Password">
          {(i) => (
            <div className="relative">
              <Input id={i} type={show ? 'text' : 'password'} autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" className="pr-10" />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute top-1/2 right-3 -translate-y-1/2 text-faint hover:text-fg" aria-label={show ? 'Hide password' : 'Show password'}>
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          )}
        </Field>
        <div className="text-right">
          <Link to="/forgot-password" className="text-xs text-muted hover:text-brand">Forgot password?</Link>
        </div>
        <Button variant="primary" type="submit" loading={busy} className="w-full py-2.5">Sign in</Button>
      </form>
    </AuthShell>
  )
}
