'use client'

import { useRouter, usePathname } from "next/navigation"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search } from "lucide-react"

type Department = {
  id: string
  name: string
}

type Props = {
  departments: Department[]
  defaultQuery: string
  defaultDept: string
}

export const MemberFilters = ({ departments, defaultQuery, defaultDept }: Props) => {
  const router = useRouter()
  const pathname = usePathname()

  const updateParams = (key: string, value: string) => {
    const params = new URLSearchParams(window.location.search)
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          className="pl-9"
          placeholder="名前・メールアドレスで検索..."
          defaultValue={defaultQuery}
          onChange={(e) => updateParams("q", e.target.value)}
        />
      </div>

      <Select
        defaultValue={defaultDept || "__all__"}
        onValueChange={(val) => updateParams("dept", val === "__all__" ? "" : val)}
      >
        <SelectTrigger className="w-full sm:w-52">
          <SelectValue placeholder="部署で絞り込む" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">すべての部署</SelectItem>
          {departments.map((dept) => (
            <SelectItem key={dept.id} value={dept.id}>
              {dept.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
