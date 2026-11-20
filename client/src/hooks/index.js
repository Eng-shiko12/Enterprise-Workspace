import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { AuthContext, ConfirmContext, ThemeContext, WorkspaceContext } from '../context/contexts'
import { socket } from '../lib/socket'

const need = (ctx, name) => {
  if (!ctx) throw new Error(`${name} must be used inside its provider`)
  return ctx
}

export const useAuth = () => need(useContext(AuthContext), 'useAuth')
export const useTheme = () => need(useContext(ThemeContext), 'useTheme')
export const useConfirm = () => need(useContext(ConfirmContext), 'useConfirm')
// May be used outside a workspace route: `id` is then null
export const useWorkspace = () => need(useContext(WorkspaceContext), 'useWorkspace')

/**
 * Tiny data-loading hook.
 *   const { data, loading, error, reload, mutate } = useApi(() => getThing(id), [id])
 * `loading` is true only when the dependencies change; `reload()` refreshes silently.
 */
export function useApi(fn, deps = [], { enabled = true } = {}) {
  const depsKey = JSON.stringify(deps)
  const [tick, setTick] = useState(0)
  const [state, setState] = useState({ depsKey: null, data: null, error: null })
  const fnRef = useRef(fn)
  useEffect(() => {
    fnRef.current = fn
  })

  useEffect(() => {
    if (!enabled) return undefined
    let alive = true
    fnRef
      .current()
      .then((data) => alive && setState({ depsKey, data, error: null }))
      .catch((error) => alive && setState((s) => ({ depsKey, data: s.depsKey === depsKey ? s.data : null, error })))
    return () => {
      alive = false
    }
  }, [depsKey, tick, enabled])

  const fresh = state.depsKey === depsKey
  const reload = useCallback(() => setTick((t) => t + 1), [])
  const mutate = useCallback((updater) => setState((s) => ({ ...s, data: updater(s.data) })), [])

  return {
    data: fresh ? state.data : null,
    error: fresh ? state.error : null,
    loading: enabled && !fresh,
    reload,
    mutate,
  }
}

/** Subscribe to a socket event for the lifetime of the component. */
export function useSocketEvent(event, handler) {
  const ref = useRef(handler)
  useEffect(() => {
    ref.current = handler
  })
  useEffect(() => {
    const listener = (...args) => ref.current(...args)
    socket.on(event, listener)
    return () => socket.off(event, listener)
  }, [event])
}

export function useDebounced(value, delay = 250) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}
