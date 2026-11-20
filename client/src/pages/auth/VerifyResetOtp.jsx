import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import AuthShell from '../../components/layout/AuthShell'
import OtpInput from '../../components/OtpInput'
import { Button } from '../../components/ui'
import { verifyResetOtp } from '../../api/authApi'
import { getErrorMessage } from '../../lib/errors'

export default function VerifyResetOtp() {
  const [params] = useSearchParams()
  const email = params.get('email') || ''
  const navigate = useNavigate()
  const [otp, setOtp] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await verifyResetOtp({ email, otp })
      navigate(`/reset-password?email=${encodeURIComponent(email)}`, { replace: true })
    } catch (err) {
      toast.error(getErrorMessage(err))
      setOtp('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Enter reset code"
      subtitle={email ? <>Code sent to <b className="text-fg">{email}</b>. It expires in 10 minutes.</> : 'Enter the 6-digit code from your email.'}
      footer={<Link to="/forgot-password" className="font-semibold text-brand hover:underline">Use a different email</Link>}
    >
      <form onSubmit={submit} className="space-y-5">
        <OtpInput value={otp} onChange={setOtp} disabled={busy} />
        <Button variant="primary" type="submit" loading={busy} disabled={otp.length !== 6 || !email} className="w-full py-2.5">Verify code</Button>
      </form>
    </AuthShell>
  )
}
