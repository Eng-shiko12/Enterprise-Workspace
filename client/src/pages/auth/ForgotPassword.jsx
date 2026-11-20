import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import AuthShell from '../../components/layout/AuthShell'
import { Button, Field, Input } from '../../components/ui'
import { forgetPassword } from '../../api/authApi'
import { getErrorMessage } from '../../lib/errors'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await forgetPassword(email.trim())
      toast.success('If that account exists, a code was sent')
      navigate(`/verify-reset-otp?email=${encodeURIComponent(email.trim())}`)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we’ll send you a 6-digit reset code."
      footer={<Link to="/login" className="font-semibold text-brand hover:underline">Back to sign in</Link>}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">{(i) => <Input id={i} type="email" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />}</Field>
        <Button variant="primary" type="submit" loading={busy} className="w-full py-2.5">Send reset code</Button>
      </form>
    </AuthShell>
  )
}
