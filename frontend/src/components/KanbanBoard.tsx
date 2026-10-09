"use client"

import { useState, useEffect, type ComponentProps } from "react"
import { Badge } from "@/components/reui/badge"
import {
  Kanban,
  KanbanBoard as ReuiKanbanBoard,
  KanbanColumn,
  KanbanColumnContent,
  KanbanColumnHandle,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
} from "@/components/reui/kanban"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { GripVerticalIcon, Plus, GitCommit, Calendar } from "lucide-react"
import type { List, Task as GlobalTask } from "../types"

export interface BoardTask {
  id: string
  title: string
  priority: "low" | "medium" | "high"
  description?: string
  assignee?: string
  assigneeAvatar?: string
  dueDate?: string
  stack?: string
  commitId?: string
  listId?: string
  originalTask: GlobalTask
}

const DEFAULT_COLUMN_TITLES: Record<string, string> = {
  backlog: "Backlog",
  inProgress: "In Progress",
  review: "Review",
  done: "Done",
}

interface TaskCardProps extends Omit<
  ComponentProps<typeof KanbanItem>,
  "value" | "children" | "onSelect"
> {
  task: BoardTask
  asHandle?: boolean
  isOverlay?: boolean
  onSelectTask?: (task: GlobalTask) => void
}

function TaskCard({ task, asHandle, isOverlay, onSelectTask, ...props }: TaskCardProps) {
  const cardContent = (
    <Card
      onClick={() => !isOverlay && onSelectTask?.(task.originalTask)}
      className="cursor-pointer hover:border-primary/50 transition-colors shadow-xs group/card bg-card border-border"
    >
      <CardContent className="space-y-2.5 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="line-clamp-1 text-sm font-medium text-foreground group-hover/card:text-primary transition-colors">
            {task.title}
          </span>
          <Badge
            variant={
              task.priority === "high"
                ? "destructive-light"
                : task.priority === "medium"
                  ? "primary-light"
                  : "warning-light"
            }
            className="pointer-events-none h-5 shrink-0 rounded-sm px-1.5 text-xs capitalize"
          >
            {task.priority}
          </Badge>
        </div>

        {task.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">
            {task.description}
          </p>
        )}

        <div className="text-muted-foreground flex items-center justify-between text-xs pt-0.5">
          {task.assignee ? (
            <div className="flex items-center gap-1.5">
              <Avatar className="size-4">
                <AvatarImage src={task.assigneeAvatar} />
                <AvatarFallback>{task.assignee.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="line-clamp-1 text-[11px]">{task.assignee}</span>
            </div>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-1.5 ml-auto">
            {task.commitId && (
              <span
                title={`Commit: ${task.commitId}`}
                className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-500/10 px-1 rounded"
              >
                <GitCommit className="size-2.5" />
                {task.commitId.substring(0, 6)}
              </span>
            )}
            {task.dueDate && (
              <time className="text-[10px] whitespace-nowrap tabular-nums flex items-center gap-1 text-muted-foreground/90">
                <Calendar className="size-2.5 opacity-70" />
                {task.dueDate}
              </time>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <KanbanItem value={task.id} {...props}>
      {asHandle && !isOverlay ? (
        <KanbanItemHandle>{cardContent}</KanbanItemHandle>
      ) : (
        cardContent
      )}
    </KanbanItem>
  )
}

interface TaskColumnProps extends Omit<
  ComponentProps<typeof KanbanColumn>,
  "children"
> {
  tasks: BoardTask[]
  isOverlay?: boolean
  columnTitle: string
  onSelectTask?: (task: GlobalTask) => void
  onQuickAddTask?: (listId: string, title: string, priority: "low" | "medium" | "high", dueDate?: string) => void
}

function TaskColumn({
  value,
  tasks,
  isOverlay,
  columnTitle,
  onSelectTask,
  onQuickAddTask,
  ...props
}: TaskColumnProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high">("medium")
  const [newDueDate, setNewDueDate] = useState("")

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    onQuickAddTask?.(value, newTitle.trim(), newPriority, newDueDate.trim() || undefined)
    setNewTitle("")
    setNewDueDate("")
    setIsAdding(false)
  }

  return (
    <KanbanColumn value={value} {...props}>
      <Card className="mb-2.5 bg-muted/40 dark:bg-card/80 border-border flex flex-col max-h-[calc(100vh-140px)] shadow-2xs">
        <CardHeader className="flex items-center justify-between border-b border-border/50 py-2.5 px-3.5 bg-card/60 dark:bg-card/40">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-semibold text-foreground tracking-tight">
              {columnTitle}
            </span>
            <Badge variant="outline" className="font-mono text-[11px] h-5 px-1.5">
              {tasks.length}
            </Badge>
          </div>
          <KanbanColumnHandle
            render={(props) => (
              <Button {...props} size="icon-xs" variant="ghost" className="text-muted-foreground hover:text-foreground">
                <GripVerticalIcon />
              </Button>
            )}
          />
        </CardHeader>
        <CardContent className="p-2.5 overflow-y-auto flex-1 flex flex-col gap-2.5">
          <KanbanColumnContent value={value} className="flex flex-col gap-2.5 min-h-[50px]">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                asHandle={!isOverlay}
                isOverlay={isOverlay}
                onSelectTask={onSelectTask}
              />
            ))}
          </KanbanColumnContent>

          {/* Quick Add Task */}
          {!isOverlay && (
            <div className="pt-1 mt-auto">
              {isAdding ? (
                <form onSubmit={handleCreate} className="rounded-lg border border-border bg-card p-2.5 space-y-2">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Task title..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <div className="flex items-center gap-2 justify-between">
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as "low" | "medium" | "high")}
                      className="rounded border border-input bg-background px-2 py-0.5 text-[11px] text-muted-foreground"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Due: Jan 15"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      className="w-24 rounded border border-input bg-background px-2 py-0.5 text-[11px] text-muted-foreground"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    <Button type="submit" size="sm" className="h-7 text-xs px-2.5">
                      Add
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsAdding(false)}
                      className="h-7 text-xs px-2"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <Button
                  variant="ghost"
                  onClick={() => setIsAdding(true)}
                  className="w-full justify-start text-xs text-muted-foreground hover:text-foreground h-8 border border-dashed border-border/70 hover:border-border"
                >
                  <Plus className="size-3.5 mr-1" />
                  Add task
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </KanbanColumn>
  )
}

interface KanbanBoardProps {
  lists: List[]
  tasks: GlobalTask[]
  onCreateList: (name: string) => void
  onCreateTask: (listId: string, title: string, priority?: string, dueDate?: string) => void
  onMoveTask: (taskId: string, newListId: string, newPosition: number) => void
  onSelectTask: (task: GlobalTask) => void
}

export function KanbanBoard({
  lists,
  tasks,
  onCreateList,
  onCreateTask,
  onMoveTask,
  onSelectTask,
}: KanbanBoardProps) {
  const [columns, setColumns] = useState<Record<string, BoardTask[]>>({})
  const [isAddingList, setIsAddingList] = useState(false)
  const [newListName, setNewListName] = useState("")

  // Convert incoming lists and tasks to Board columns
  useEffect(() => {
    const nextCols: Record<string, BoardTask[]> = {}

    // Ensure all lists exist in columns
    for (const list of lists) {
      nextCols[list.id] = []
    }

    // Populate tasks
    for (const task of tasks) {
      const colId = task.listId
      if (!nextCols[colId]) {
        nextCols[colId] = []
      }

      const priority = (task.priority === "high" || task.priority === "low" || task.priority === "medium")
        ? task.priority
        : "medium"

      const boardTask: BoardTask = {
        id: task.id,
        title: task.title,
        priority,
        description: task.description || undefined,
        assignee: task.assignee?.name || undefined,
        assigneeAvatar: task.assigneeAvatar,
        dueDate: task.dueDate || undefined,
        stack: task.stack || undefined,
        commitId: task.commitId || undefined,
        listId: task.listId,
        originalTask: task,
      }
      nextCols[colId].push(boardTask)
    }

    // Sort each column by position
    for (const key of Object.keys(nextCols)) {
      nextCols[key].sort((a, b) => a.originalTask.position - b.originalTask.position)
    }

    setColumns(nextCols)
  }, [lists, tasks])

  const getColumnTitle = (colId: string) => {
    const foundList = lists.find((l) => l.id === colId)
    if (foundList) return foundList.name
    return DEFAULT_COLUMN_TITLES[colId] || colId
  }

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newListName.trim()) return
    onCreateList(newListName.trim())
    setNewListName("")
    setIsAddingList(false)
  }

  const handleQuickAddTask = (
    listId: string,
    title: string,
    priority: "low" | "medium" | "high",
    dueDate?: string
  ) => {
    onCreateTask(listId, title, priority, dueDate)
  }

  return (
    <div className="flex-1 overflow-x-auto p-6">
      <Kanban
        value={columns}
        onValueChange={setColumns}
        getItemValue={(item) => item.id}
        onValueCommit={(_next, meta) => {
          if (meta.kind === "item") {
            const taskId = String(meta.event.active.id)
            const targetListId = meta.overContainer
            const targetIndex = meta.overIndex
            if (targetListId) {
              onMoveTask(taskId, targetListId, targetIndex)
            }
          }
        }}
      >
        <div className="flex gap-4 items-start min-h-[calc(100vh-140px)]">
          <ReuiKanbanBoard className="flex gap-4 items-start auto-rows-auto grid-cols-none sm:grid-cols-none">
            {Object.entries(columns).map(([columnValue, colTasks]) => (
              <div key={columnValue} className="w-80 shrink-0">
                <TaskColumn
                  value={columnValue}
                  tasks={colTasks}
                  columnTitle={getColumnTitle(columnValue)}
                  onSelectTask={onSelectTask}
                  onQuickAddTask={handleQuickAddTask}
                />
              </div>
            ))}
          </ReuiKanbanBoard>

          {/* Add Column button */}
          <div className="w-80 shrink-0">
            {isAddingList ? (
              <form onSubmit={handleCreateList} className="rounded-xl border border-border bg-card p-3.5 space-y-3">
                <input
                  type="text"
                  autoFocus
                  placeholder="Column name (e.g. In Review)..."
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <div className="flex items-center gap-2">
                  <Button type="submit" size="sm" className="h-7 text-xs">
                    Create Column
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAddingList(false)}
                    className="h-7 text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setIsAddingList(true)}
                className="w-full py-3.5 border-2 border-dashed border-border/80 hover:border-primary/50 hover:bg-card/40 rounded-xl text-muted-foreground hover:text-foreground text-xs font-medium flex items-center justify-center gap-1.5 transition"
              >
                <Plus className="size-4" />
                <span>Add another list</span>
              </button>
            )}
          </div>
        </div>

        <KanbanOverlay className="bg-muted/10 rounded-md border-2 border-dashed">
          {({ value, variant }) => {
            if (variant === "item") {
              let foundTask: BoardTask | undefined
              for (const col of Object.values(columns)) {
                foundTask = col.find((t) => t.id === value)
                if (foundTask) break
              }
              if (foundTask) {
                return <TaskCard task={foundTask} isOverlay />
              }
            }
            return <div className="bg-muted/20 size-full rounded-md" />
          }}
        </KanbanOverlay>
      </Kanban>
    </div>
  )
}
