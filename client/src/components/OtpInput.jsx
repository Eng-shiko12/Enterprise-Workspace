import { useRef } from 'react'

/** Six single-digit boxes with paste + backspace support. value is a string of up to 6 digits. */
export default function OtpInput({ value, onChange, disabled }) {
  const refs = useRef([])
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '')

  const focus = (i) => refs.current[Math.min(Math.max(i, 0), 5)]?.focus()

  const handleChange = (i, raw) => {
    const d = raw.replace(/\D/g, '')
    if (!d) return
    const next = digits.slice()
    d.split('').slice(0, 6 - i).forEach((ch, k) => { next[i + k] = ch })
    onChange(next.join(''))
    focus(i + d.length)
  }

  const handleKey = (i, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const next = digits.slice()
      if (next[i]) next[i] = ''
      else if (i > 0) { next[i - 1] = ''; focus(i - 1) }
      onChange(next.join(''))
    } else if (e.key === 'ArrowLeft') focus(i - 1)
    else if (e.key === 'ArrowRight') focus(i + 1)
  }

  return (
    <div className="flex justify-between gap-2">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          value={d}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          onFocus={(e) => e.target.select()}
          className="input h-12 w-full text-center font-mono text-lg font-semibold"
        />
      ))}
    </div>
  )
}
