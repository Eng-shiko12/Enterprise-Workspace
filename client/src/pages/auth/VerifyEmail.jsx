import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import AuthShell from '../../components/layout/AuthShell'
import OtpInput from '../../components/OtpInput'
import { Button } from '../../components/ui'
import { resendOtp, verifyEmailOtp } from '../../api/authApi'
import { getErrorMessage } from '../../lib/errors'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const email = params.get('email') || ''
  const navigate = useNavigate()
  const [otp, setOtp] = useState('')
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(30)

  useEffect(() => {
    if (cooldown <= 0) return undefined
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await verifyEmailOtp({ email, otp })
      toast.success('Email verified — you can sign in now')
      navigate('/login', { replace: true })
    } catch (err) {
      toast.error(getErrorMessage(err))
      setOtp('')
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    try {
      await resendOtp(email)
      toast.success('A new code is on its way')
      setCooldown(60)
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <AuthShell
      title="Verify your email"
      subtitle={email ? <>We sent a 6-digit code to <b className="text-fg">{email}</b>.</> : 'Enter the 6-digit code we emailed you.'}
      footer={<Link to="/login" className="font-semibold text-brand hover:underline">Back to sign in</Link>}
    >
      <form onSubmit={submit} className="space-y-5">
        <OtpInput value={otp} onChange={setOtp} disabled={busy} />
        <Button variant="primary" type="submit" loading={busy} disabled={otp.length !== 6 || !email} className="w-full py-2.5">Verify email</Button>
        <p className="text-center text-xs text-muted">
          Didn’t get it?{' '}
          <button type="button" disabled={cooldown > 0 || !email} onClick={resend} className="font-semibold text-brand disabled:text-faint">
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </button>
        </p>
      </form>
    </AuthShell>
  )
}
