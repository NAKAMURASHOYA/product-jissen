"use client"

import { useState, useTransition } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Trash2, Pencil } from "lucide-react"
import { deleteSkillAction, updateSkillOrderAction } from "@/actions/skill"
import { toast } from "sonner"
import { SkillForm } from "./skill-form"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type Skill = {
  id: string
  name: string
  category: string
  score: number
  display_order: number
}

const categoryLabels: Record<string, string> = {
  frontend: 'フロントエンド',
  backend: 'バックエンド',
  design: 'デザイン',
  sales: '営業',
  marketing: 'マーケティング',
  'office work': 'オフィス業務',
  other: 'その他',
}

function ScoreDots({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`h-2 w-2 rounded-full ${i < score ? 'bg-primary' : 'bg-muted'}`}
        />
      ))}
    </div>
  )
}

function SortableSkillItem({
  skill,
  orgSlug,
  onDelete,
}: {
  skill: Skill
  orgSlug: string
  onDelete: (id: string) => void
}) {
  const [isPending, startTransition] = useTransition()

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: skill.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleDelete = () => {
    startTransition(async () => {
      const res = await deleteSkillAction(skill.id, orgSlug)
      if (res.success) {
        toast.success(res.message)
        onDelete(skill.id)
      } else {
        toast.error(res.message)
      }
    })
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border bg-card p-3"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label="並び替え"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex flex-1 items-center gap-3 min-w-0">
        <span className="font-medium truncate">{skill.name}</span>
        <Badge variant="secondary" className="shrink-0">
          {categoryLabels[skill.category] ?? skill.category}
        </Badge>
        <ScoreDots score={skill.score} />
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <SkillForm
          orgSlug={orgSlug}
          skill={skill}
          trigger={
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Pencil className="h-4 w-4" />
              <span className="sr-only">編集</span>
            </Button>
          }
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={handleDelete}
          disabled={isPending}
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">削除</span>
        </Button>
      </div>
    </div>
  )
}

type Props = {
  initialSkills: Skill[]
  orgSlug: string
}

export function SkillList({ initialSkills, orgSlug }: Props) {
  const [skills, setSkills] = useState<Skill[]>(initialSkills)
  const [, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = skills.findIndex((s) => s.id === active.id)
    const newIndex = skills.findIndex((s) => s.id === over.id)
    const reordered = arrayMove(skills, oldIndex, newIndex).map((s, i) => ({
      ...s,
      display_order: i,
    }))

    setSkills(reordered)

    startTransition(async () => {
      const res = await updateSkillOrderAction(
        reordered.map(({ id, display_order }) => ({ id, display_order })),
        orgSlug
      )
      if (!res.success) {
        toast.error(res.message)
        // ロールバック
        setSkills(skills)
      }
    })
  }

  const handleDelete = (id: string) => {
    setSkills((prev) => prev.filter((s) => s.id !== id))
  }

  if (skills.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        スキルがまだ登録されていません。「スキルを追加」から登録してください。
      </p>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={skills.map((s) => s.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {skills.map((skill) => (
            <SortableSkillItem
              key={skill.id}
              skill={skill}
              orgSlug={orgSlug}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
