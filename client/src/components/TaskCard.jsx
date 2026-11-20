import { Draggable } from '@hello-pangea/dnd'
import { Calendar, Tag } from 'lucide-react'
import { Avatar, PriorityIcon } from './ui'
import { dueInfo, taskKey } from '../lib/format'

export default function TaskCard({ task, index, onOpen }) {
  const done = task.status === 'done'
  const due = dueInfo(task.dueDate, done)
  const urgent = task.priority === 'urgent' && !done

  return (
    <Draggable draggableId={task._id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onOpen(task)}
          className={`group relative cursor-pointer rounded-xl border bg-card p-3.5 transition ${
            snapshot.isDragging ? 'rotate-1 border-brand shadow-2xl' : 'border-line hover:border-line-strong'
          } ${urgent ? 'border-l-2 border-l-danger' : ''}`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-muted">{taskKey(task)}</span>
              {urgent && <span className="rounded bg-danger/15 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-danger">URGENT</span>}
            </div>
            <div className="flex items-center gap-2">
              <PriorityIcon priority={task.priority} size={13} />
              <span className="rounded bg-raised px-1.5 py-0.5 font-mono text-[10px] text-muted">{task.points ?? 0} pt</span>
            </div>
          </div>

          <p className={`mt-2 text-[13px] leading-snug font-medium ${done ? 'text-faint line-through' : 'text-fg'}`}>{task.title}</p>

          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              {(task.labels || []).slice(0, 2).map((l) => (
                <span key={l} className="inline-flex items-center gap-1 rounded bg-raised px-1.5 py-0.5 text-[10px] text-muted"><Tag size={9} />{l}</span>
              ))}
              {due && (
                <span className={`inline-flex items-center gap-1 font-mono text-[10px] ${due.tone}`}><Calendar size={10} />{due.label}</span>
              )}
            </div>
            {task.assignedTo ? <Avatar user={task.assignedTo} size={22} /> : <span className="h-[22px] w-[22px] rounded-full border border-dashed border-line-strong" title="Unassigned" />}
          </div>
        </div>
      )}
    </Draggable>
  )
}
