import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import AuthShell from '../../components/layout/AuthShell'
import { Button, Field, Input } from '../../components/ui'
import { registerUser } from '../../api/authApi'
import { getErrorMessage } from '../../lib/errors'

const strength = (p) => [p.length >= 8, /[A-Z]/.test(p), /[0-9]/.test(p), /[^A-Za-z0-9]/.test(p)].filter(Boolean).length

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const score = strength(form.password)
  const mismatch = form.confirm && form.confirm !== form.password

  const submit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) return toast.error('Passwords do not match')
    setBusy(true)
    try {
      await registerUser({ name: form.name.trim(), email: form.email.trim(), password: form.password })
      toast.success('Account created — check your email for the code')
      navigate(`/verify-email?email=${encodeURIComponent(form.email.trim())}`)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start planning sprints with your team in minutes."
      footer={<>Already have an account? <Link to="/login" className="font-semibold text-brand hover:underline">Sign in</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Full name">{(i) => <Input id={i} autoComplete="name" autoFocus required minLength={2} maxLength={60} value={form.name} onChange={set('name')} placeholder="Ada Lovelace" />}</Field>
        <Field label="Work email">{(i) => <Input id={i} type="email" autoComplete="email" required value={form.email} onChange={set('email')} placeholder="you@company.com" />}</Field>
        <Field label="Password" hint="At least 8 characters.">
          {(i) => (
            <>
              <Input id={i} type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={form.password} onChange={set('password')} placeholder="••••••••" />
              <div className="mt-2 flex gap-1" aria-hidden>
                {[0, 1, 2, 3].map((n) => (
                  <span key={n} className={`h-1 flex-1 rounded-full ${n < score ? (score < 3 ? 'bg-warn' : 'bg-ok') : 'bg-raised'}`} />
                ))}
              </div>
            </>
          )}
        </Field>
        <Field label="Confirm password" error={mismatch ? 'Passwords do not match' : undefined}>
          {(i) => <Input id={i} type="password" autoComplete="new-password" required value={form.confirm} onChange={set('confirm')} placeholder="••••••••" />}
        </Field>
        <Button variant="primary" type="submit" loading={busy} className="w-full py-2.5">Create account</Button>
      </form>
    </AuthShell>
  )
}
