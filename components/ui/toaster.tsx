"use client"

import { useToast } from "@/hooks/use-toast"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "rounded-lg border px-4 py-3 shadow-lg transition-all animate-in slide-in-from-bottom-5",
            toast.variant === "destructive"
              ? "border-red-500/50 bg-red-950 text-red-100"
              : "border-border bg-card text-card-foreground"
          )}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1">
              {toast.title && (
                <p className="text-sm font-semibold">{toast.title}</p>
              )}
              {toast.description && (
                <p className="text-sm opacity-90">{toast.description}</p>
              )}
            </div>
            <button
              onClick={() => dismiss(toast.id)}
              className="shrink-0 rounded-md p-1 opacity-70 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
