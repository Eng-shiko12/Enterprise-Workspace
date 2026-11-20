import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Columns3, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../../components/PageHeader'
import { Button, EmptyState, Field, IconButton, Input, Modal, ProgressBar, Textarea } from '../../components/ui'
import { useConfirm, useWorkspace } from '../../hooks'
import { createBoard, deleteBoard } from '../../api/boardApi'
import { getErrorMessage } from '../../lib/errors'
import { timeAgo } from '../../lib/format'

const GRADIENTS = ['from-indigo-500/30 to-cyan-500/10', 'from-fuchsia-500/25 to-indigo-500/10', 'from-emerald-500/25 to-cyan-500/10', 'from-amber-500/25 to-rose-500/10']

function CreateBoard({ workspaceId, onClose }) {
  const navigate = useNavigate()
  const { reload } = useWorkspace()
  const [form, setForm] = useState({ title: '', description: '' })
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const { board } = await createBoard(workspaceId, { title: form.title.trim(), description: form.description.trim() })
      reload()
      navigate(`/workspaces/${workspaceId}/boards/${board._id}`)
    } catch (err) {
      toast.error(getErrorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Create board" description="New boards start with To Do, In Progress and Done lists." footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" type="submit" form="board-form" loading={busy} disabled={!form.title.trim()}>Create board</Button></>}>
      <form id="board-form" onSubmit={submit} className="space-y-4">
        <Field label="Title">{(i) => <Input id={i} autoFocus maxLength={100} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Product roadmap" />}</Field>
        <Field label="Description (optional)">{(i) => <Textarea id={i} rows={3} maxLength={500} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />}</Field>
      </form>
    </Modal>
  )
}

export default function Boards() {
  const { id, boards, isStaff, isOwner, reload } = useWorkspace()
  const confirm = useConfirm()
  const [creating, setCreating] = useState(false)

  const remove = async (e, board) => {
    e.preventDefault()
    e.stopPropagation()
    if (!(await confirm({ title: `Delete “${board.title}”?`, message: 'All lists and cards on this board will be permanently deleted.', confirmLabel: 'Delete board', danger: true }))) return
    try { await deleteBoard(id, board._id); toast.success('Board deleted'); reload() } catch (err) { toast.error(getErrorMessage(err)) }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-8">
      <PageHeader icon={Columns3} title="Boards" subtitle="Free-form kanban boards for roadmaps, ideas and cross-team work." actions={isStaff && <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>New board</Button>} />

      {boards.length === 0 ? (
        <EmptyState icon={Columns3} title="No boards yet" message={isStaff ? 'Create a board to organise work into lists and cards.' : 'An admin can create the first board.'} action={isStaff && <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>Create board</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((b, i) => (
            <Link key={b._id} to={`/workspaces/${id}/boards/${b._id}`} className="card group overflow-hidden transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow)]">
              <div className={`h-20 bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]}`} />
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="truncate text-[15px] font-semibold text-fg">{b.title}</h3>
                  {isOwner && <IconButton label="Delete board" onClick={(e) => remove(e, b)} className="-mt-1 -mr-2 opacity-0 group-hover:opacity-100"><Trash2 size={14} /></IconButton>}
                </div>
                <p className="mt-1 line-clamp-2 min-h-[2rem] text-xs text-muted">{b.description || 'No description'}</p>
                <ProgressBar className="mt-3" value={b.cardCount ? (b.doneCount / b.cardCount) * 100 : 0} />
                <p className="mt-2 flex justify-between text-[11px] text-faint"><span>{b.cardCount} card{b.cardCount === 1 ? '' : 's'}</span><span>Updated {timeAgo(b.updatedAt)}</span></p>
              </div>
            </Link>
          ))}
        </div>
      )}
      {creating && <CreateBoard workspaceId={id} onClose={() => setCreating(false)} />}
    </div>
  )
}
