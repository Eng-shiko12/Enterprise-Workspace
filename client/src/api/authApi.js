import api, { unwrap } from './client'

export const registerUser = (body) => unwrap(api.post('/auth/register', body))
export const resendOtp = (email) => unwrap(api.post('/auth/resend-otp', { email }))
export const verifyEmailOtp = (body) => unwrap(api.post('/auth/verify-email', body))
export const loginUser = (body) => unwrap(api.post('/auth/login', body))
export const logoutUser = () => unwrap(api.post('/auth/logout'))
export const forgetPassword = (email) => unwrap(api.post('/auth/forget-password', { email }))
export const verifyResetOtp = (body) => unwrap(api.post('/auth/verify-reset-otp', body))
export const resetPassword = (body) => unwrap(api.post('/auth/reset-password', body))
export const getMyProfile = () => unwrap(api.get('/users/profile'))
