import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import AuthShell from '../../components/layout/AuthShell'
import { Button, Field, Input } from '../../components/ui'
import { resetPassword } from '../../api/authApi'
import { getErrorMessage } from '../../lib/errors'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const email = params.get('email') || ''
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (password !== confirm) return toast.error('Passwords do not match')
    setBusy(true)
    try {
      await resetPassword({ email, password })
      toast.success('Password updated — please sign in')
      navigate('/login', { replace: true })
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Use at least 8 characters."
      footer={<Link to="/login" className="font-semibold text-brand hover:underline">Back to sign in</Link>}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="New password">{(i) => <Input id={i} type="password" autoComplete="new-password" autoFocus required minLength={8} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} />}</Field>
        <Field label="Confirm password">{(i) => <Input id={i} type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />}</Field>
        <Button variant="primary" type="submit" loading={busy} disabled={!email} className="w-full py-2.5">Update password</Button>
      </form>
    </AuthShell>
  )
}
