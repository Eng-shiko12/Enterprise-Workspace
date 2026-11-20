export const getErrorMessage = (err, fallback = 'Something went wrong. Please try again.') => {
  if (err?.response?.data?.message) return err.response.data.message
  if (err?.code === 'ERR_NETWORK') return 'Cannot reach the server. Check your connection.'
  if (err?.response?.status === 429) return 'Too many requests — please slow down.'
  return err?.message || fallback
}
