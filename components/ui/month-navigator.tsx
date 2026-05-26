"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

interface MonthNavigatorProps {
  year: number
  month: number // 0-indexed
  onChange: (year: number, month: number) => void
  className?: string
}

export function MonthNavigator({ year, month, onChange, className }: MonthNavigatorProps) {
  const prev = () => {
    if (month === 0) onChange(year - 1, 11)
    else onChange(year, month - 1)
  }
  const next = () => {
    if (month === 11) onChange(year + 1, 0)
    else onChange(year, month + 1)
  }
  return (
    <div className={`flex items-center justify-center gap-4 ${className ?? ""}`}>
      <Button variant="ghost" size="icon" onClick={prev} className="h-8 w-8">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="text-center min-w-[160px]">
        <p className="text-lg font-bold">{MONTH_NAMES[month]}</p>
        <p className="text-xs text-muted-foreground">{year}</p>
      </div>
      <Button variant="ghost" size="icon" onClick={next} className="h-8 w-8">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
