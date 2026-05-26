import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

export function StatCard({ title, value, description, icon: Icon, trend, className }: StatCardProps) {
  return (
    <Card className={cn("border-slate-200 bg-white shadow-sm", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="text-3xl font-bold text-slate-800">{value}</p>
            {description && (
              <p className="text-xs text-slate-500">{description}</p>
            )}
            {trend && (
              <p
                className={cn(
                  "text-xs font-medium",
                  trend.isPositive ? "text-green-600" : "text-red-600"
                )}
              >
                {trend.isPositive ? "+" : "-"}
                {Math.abs(trend.value)}% vs mes anterior
              </p>
            )}
          </div>
          <div className="h-12 w-12 rounded-lg bg-[#1a3a5c]/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-[#1a3a5c]" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
