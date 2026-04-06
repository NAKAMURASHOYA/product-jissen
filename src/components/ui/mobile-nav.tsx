"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, Home, Users, Settings, PlusCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

type Org = {
  organization_id: string
  organizations: { name: string; slug: string }
}

type Props = {
  orgName: string
  slug: string
  myOrgs: Org[]
}

export function MobileNav({ orgName, slug, myOrgs }: Props) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  const navItems = [
    { href: `/${slug}`, label: "ホーム", icon: Home },
    { href: `/${slug}/members`, label: "メンバー", icon: Users },
    { href: `/${slug}/settings`, label: "設定", icon: Settings },
  ]

  const isActive = (href: string) =>
    href === `/${slug}` ? pathname === href : pathname.startsWith(href)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">メニューを開く</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="flex h-14 items-center border-b px-4">
          <SheetTitle className="truncate text-left">{orgName}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-1 p-2 pt-4">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Button
              key={href}
              asChild
              variant={isActive(href) ? "secondary" : "ghost"}
              className="justify-start gap-2"
              onClick={() => setOpen(false)}
            >
              <Link href={href}>
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            </Button>
          ))}
        </div>

        <div className="mt-6 px-4">
          <h3 className="mb-2 text-xs font-semibold text-muted-foreground">所属組織</h3>
          <div className="space-y-1">
            {myOrgs?.map((item) => (
              <Link
                key={item.organization_id}
                href={`/${item.organizations.slug}`}
                onClick={() => setOpen(false)}
                className={`block truncate rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent ${
                  item.organizations.slug === slug
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {item.organizations.name}
              </Link>
            ))}
            <Link
              href="/onboarding"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <PlusCircle className="h-3 w-3" />
              組織を追加・参加
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
