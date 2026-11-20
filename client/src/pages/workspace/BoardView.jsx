import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd'
import { ArrowLeft, Calendar, Check, CheckCircle2, Plus, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { Avatar, AvatarStack, Button, ErrorState, Field, IconButton, Input, Modal, PageLoader, PriorityIcon, Select, Textarea } from '../../components/ui'
import { useApi, useAuth, useConfirm, useSocketEvent, useWorkspace } from '../../hooks'
import { createCard, createList, deleteCard, deleteList, getBoard, moveCard, reorderLists, updateCard, updateList } from '../../api/boardApi'
import { joinBoard, leaveBoard } from '../../lib/socket'
import { getErrorMessage } from '../../lib/errors'
import { PRIORITIES } from '../../lib/constants'
import { dueInfo, toInputDate } from '../../lib/format'

function CardModal({ card, workspaceId, members, onClose, onChanged }) {
  const confirm = useConfirm()
  const [form, setForm] = useState({ title: card.title, description: card.description || '', priority: card.priority || 'medium', dueDate: toInputDate(card.dueDate), assignee: card.assignedTo?.[0]?._id || '', isCompleted: Boolean(card.isCompleted) })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await updateCard(workspaceId, card.list, card._id, { title: form.title.trim(), description: form.description.trim(), priority: form.priority, dueDate: form.dueDate || null, assignedTo: form.assignee ? [form.assignee] : [], isCompleted: form.isCompleted })
      toast.success('Card saved')
      onChanged()
      onClose()
    } catch (err) {
      toast.error(getErrorMessage(err))
      setBusy(false)
    }
  }
  const remove = async () => {
    if (!(await confirm({ title: 'Delete card?', message: `“${card.title}” will be permanently deleted.`, confirmLabel: 'Delete card', danger: true }))) return
    try { await deleteCard(workspaceId, card.list, card._id); onChanged(); onClose() } catch (err) { toast.error(getErrorMessage(err)) }
  }

  return (
    <Modal open onClose={onClose} title="Edit card" footer={<><Button variant="danger" icon={Trash2} onClick={remove} className="mr-auto">Delete</Button><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" type="submit" form="card-form" loading={busy} disabled={!form.title.trim()}>Save</Button></>}>
      <form id="card-form" onSubmit={save} className="grid grid-cols-2 gap-4">
        <Field label="Title" className="col-span-2">{(i) => <Input id={i} value={form.title} maxLength={200} onChange={set('title')} autoFocus />}</Field>
        <Field label="Description" className="col-span-2">{(i) => <Textarea id={i} rows={4} value={form.description} maxLength={5000} onChange={set('description')} />}</Field>
        <Field label="Priority">{(i) => <Select id={i} value={form.priority} onChange={set('priority')}>{PRIORITIES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}</Select>}</Field>
        <Field label="Due date">{(i) => <Input id={i} type="date" value={form.dueDate} onChange={set('dueDate')} />}</Field>
        <Field label="Assignee">{(i) => <Select id={i} value={form.assignee} onChange={set('assignee')}><option value="">Unassigned</option>{members.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}</Select>}</Field>
        <label className="flex items-end gap-2.5 pb-2 text-[13px] text-fg"><input type="checkbox" checked={form.isCompleted} onChange={(e) => setForm({ ...form, isCompleted: e.target.checked })} className="h-4 w-4 accent-[var(--brand)]" /> Mark as complete</label>
      </form>
    </Modal>
  )
}

function AddCard({ onAdd }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  if (!open) return <button onClick={() => setOpen(true)} className="mt-2 flex w-full items-center gap-1.5 rounded-lg px-2 py-2 text-xs text-muted transition hover:bg-raised hover:text-fg"><Plus size={14} /> Add a card</button>
  const submit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    await onAdd(title.trim())
    setTitle('')
  }
  return (
    <form onSubmit={submit} className="mt-2 space-y-2">
      <Textarea rows={2} autoFocus value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) submit(e); if (e.key === 'Escape') setOpen(false) }} placeholder="What needs to be done?" />
      <div className="flex gap-2"><Button size="sm" variant="primary" type="submit">Add card</Button><Button size="sm" variant="ghost" type="button" onClick={() => setOpen(false)}>Cancel</Button></div>
    </form>
  )
}

function ListTitle({ list, canEdit, onRename }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(list.title)
  const commit = () => { setEditing(false); if (value.trim() && value.trim() !== list.title) onRename(list, value.trim()); else setValue(list.title) }
  return editing ? (
    <input autoFocus value={value} maxLength={100} onChange={(e) => setValue(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setValue(list.title); setEditing(false) } }} className="input py-1 text-[13px] font-semibold" />
  ) : (
    <h3 onClick={() => canEdit && setEditing(true)} className={`min-w-0 flex-1 truncate text-[13px] font-semibold text-fg ${canEdit ? 'cursor-text' : ''}`}>{list.title}</h3>
  )
}

export default function BoardView() {
  const { workSpaceId, boardId } = useParams()
  const { members, isStaff } = useWorkspace()
  const { user } = useAuth()
  const confirm = useConfirm()
  const { data, loading, error, reload, mutate } = useApi(() => getBoard(workSpaceId, boardId), [workSpaceId, boardId])
  const [openCard, setOpenCard] = useState(null)
  const [newList, setNewList] = useState('')
  const [addingList, setAddingList] = useState(false)
  const timer = useRef(null)
  const board = data?.board

  useEffect(() => {
    joinBoard(boardId)
    return () => leaveBoard(boardId)
  }, [boardId])

  // Teammates' changes: refetch (debounced), ignoring our own echoes
  useSocketEvent('boardUpdated', (p) => {
    if (p.boardId !== boardId || p.actor === user._id) return
    clearTimeout(timer.current)
    timer.current = setTimeout(reload, 250)
  })
  useEffect(() => () => clearTimeout(timer.current), [])

  const setLists = (fn) => mutate((d) => ({ ...d, board: { ...d.board, lists: fn(d.board.lists) } }))

  const onDragEnd = async ({ type, draggableId, source, destination }) => {
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) return
    try {
      if (type === 'LIST') {
        const next = [...board.lists]
        const [moved] = next.splice(source.index, 1)
        next.splice(destination.index, 0, moved)
        setLists(() => next)
        await reorderLists(workSpaceId, boardId, next.map((l) => l._id))
      } else {
        setLists((lists) => {
          const copy = lists.map((l) => ({ ...l, cards: [...l.cards] }))
          const from = copy.find((l) => l._id === source.droppableId)
          const to = copy.find((l) => l._id === destination.droppableId)
          const [card] = from.cards.splice(source.index, 1)
          to.cards.splice(destination.index, 0, { ...card, list: to._id })
          return copy
        })
        await moveCard(workSpaceId, draggableId, destination.droppableId, destination.index)
      }
    } catch (err) {
      toast.error(getErrorMessage(err))
      reload()
    }
  }

  const addList = async (e) => {
    e.preventDefault()
    if (!newList.trim()) return
    try { await createList(workSpaceId, boardId, newList.trim()); setNewList(''); reload() } catch (err) { toast.error(getErrorMessage(err)) }
  }
  const addCard = async (list, title) => {
    try { await createCard(workSpaceId, list._id, { title }); reload() } catch (err) { toast.error(getErrorMessage(err)) }
  }
  const renameList = async (list, title) => {
    setLists((ls) => ls.map((l) => (l._id === list._id ? { ...l, title } : l)))
    try { await updateList(workSpaceId, boardId, list._id, { title }) } catch (err) { toast.error(getErrorMessage(err)); reload() }
  }
  const removeList = async (list) => {
    if (!(await confirm({ title: `Delete “${list.title}”?`, message: `This list and its ${list.cards.length} card(s) will be permanently deleted.`, confirmLabel: 'Delete list', danger: true }))) return
    try { await deleteList(workSpaceId, boardId, list._id); reload() } catch (err) { toast.error(getErrorMessage(err)) }
  }

  if (loading) return <PageLoader label="Loading board…" />
  if (error || !board) return <div className="mx-auto max-w-lg p-10"><ErrorState message={getErrorMessage(error, 'Board not found')} onRetry={reload} /></div>

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-6">
        <Link to={`/workspaces/${workSpaceId}/boards`} className="rounded-lg p-1.5 text-muted hover:bg-raised hover:text-fg" aria-label="All boards"><ArrowLeft size={16} /></Link>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-fg">{board.title}</h1>
          {board.description && <p className="truncate text-xs text-muted">{board.description}</p>}
        </div>
        <div className="ml-auto hidden sm:block"><AvatarStack users={members} max={5} /></div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="board" type="LIST" direction="horizontal">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="flex flex-1 items-start gap-4 overflow-x-auto p-4 sm:p-6">
              {board.lists.map((list, index) => (
                <Draggable key={list._id} draggableId={`list-${list._id}`} index={index}>
                  {(p, snap) => (
                    <div ref={p.innerRef} {...p.draggableProps} className={`flex max-h-full w-72 shrink-0 flex-col rounded-2xl border bg-panel p-3 ${snap.isDragging ? 'border-brand shadow-2xl' : 'border-line'}`}>
                      <div {...p.dragHandleProps} className="mb-3 flex items-center gap-2 px-1">
                        <ListTitle list={list} canEdit onRename={renameList} />
                        <span className="rounded bg-raised px-1.5 py-0.5 font-mono text-[10px] text-muted">{list.cards.length}</span>
                        {isStaff && <IconButton label="Delete list" onClick={() => removeList(list)} className="h-6 w-6"><Trash2 size={13} /></IconButton>}
                      </div>
                      <Droppable droppableId={list._id} type="CARD">
                        {(dp, ds) => (
                          <div ref={dp.innerRef} {...dp.droppableProps} className={`min-h-10 space-y-2 overflow-y-auto rounded-lg p-0.5 ${ds.isDraggingOver ? 'bg-brand/5' : ''}`}>
                            {list.cards.map((card, i) => {
                              const due = dueInfo(card.dueDate, card.isCompleted)
                              return (
                                <Draggable key={card._id} draggableId={card._id} index={i}>
                                  {(cp, cs) => (
                                    <div ref={cp.innerRef} {...cp.draggableProps} {...cp.dragHandleProps} onClick={() => setOpenCard(card)} className={`cursor-pointer rounded-xl border bg-card p-3 transition ${cs.isDragging ? 'rotate-1 border-brand shadow-2xl' : 'border-line hover:border-line-strong'}`}>
                                      <div className="flex items-start gap-2">
                                        {card.isCompleted && <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-accent" />}
                                        <p className={`flex-1 text-[13px] leading-snug ${card.isCompleted ? 'text-faint line-through' : 'text-fg'}`}>{card.title}</p>
                                      </div>
                                      <div className="mt-2.5 flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                          <PriorityIcon priority={card.priority} size={12} />
                                          {due && <span className={`flex items-center gap-1 font-mono text-[10px] ${due.tone}`}><Calendar size={10} />{due.label}</span>}
                                        </div>
                                        {card.assignedTo?.length > 0 && <div className="flex -space-x-1.5">{card.assignedTo.slice(0, 3).map((u) => <Avatar key={u._id} user={u} size={20} ring />)}</div>}
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              )
                            })}
                            {dp.placeholder}
                          </div>
                        )}
                      </Droppable>
                      <AddCard onAdd={(t) => addCard(list, t)} />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}

              <div className="w-72 shrink-0">
                {addingList ? (
                  <form onSubmit={addList} className="space-y-2 rounded-2xl border border-line bg-panel p-3">
                    <Input autoFocus value={newList} maxLength={100} onChange={(e) => setNewList(e.target.value)} placeholder="List title" />
                    <div className="flex gap-2"><Button size="sm" variant="primary" type="submit" icon={Check}>Add list</Button><Button size="sm" variant="ghost" type="button" icon={X} onClick={() => setAddingList(false)}>Cancel</Button></div>
                  </form>
                ) : (
                  <button onClick={() => setAddingList(true)} className="flex w-full items-center gap-2 rounded-2xl border border-dashed border-line-strong px-4 py-3 text-[13px] text-muted transition hover:border-brand hover:text-brand"><Plus size={15} /> Add another list</button>
                )}
              </div>
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {openCard && <CardModal card={openCard} workspaceId={workSpaceId} members={members} onClose={() => setOpenCard(null)} onChanged={reload} />}
    </div>
  )
}
