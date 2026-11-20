import { useCallback, useMemo, useRef, useState } from 'react'
import { ConfirmContext } from './contexts'
import { Button, Modal } from '../components/ui'

/** Promise based confirmation dialog:  if (await confirm({ title, message, danger })) { ... } */
export default function ConfirmProvider({ children }) {
  const [options, setOptions] = useState(null)
  const resolver = useRef(null)

  const confirm = useCallback(
    (opts) =>
      new Promise((resolve) => {
        resolver.current = resolve
        setOptions(opts)
      }),
    [],
  )

  const close = (answer) => {
    resolver.current?.(answer)
    resolver.current = null
    setOptions(null)
  }

  const value = useMemo(() => confirm, [confirm])

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Modal
        open={Boolean(options)}
        onClose={() => close(false)}
        title={options?.title || 'Are you sure?'}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button variant={options?.danger ? 'danger' : 'primary'} onClick={() => close(true)}>
              {options?.confirmLabel || 'Confirm'}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-muted">{options?.message}</p>
      </Modal>
    </ConfirmContext.Provider>
  )
}
