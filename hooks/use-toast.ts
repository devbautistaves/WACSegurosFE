"use client"

import { useEffect, useState } from "react"

interface Toast {
  id: string
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

const TOAST_LIMIT = 3
const TOAST_REMOVE_DELAY = 5000

type ToastActionType = 
  | { type: "ADD_TOAST"; toast: Toast }
  | { type: "DISMISS_TOAST"; toastId?: string }
  | { type: "REMOVE_TOAST"; toastId?: string }

let count = 0
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

let memoryState: { toasts: Toast[] } = { toasts: [] }
const listeners: Array<(state: { toasts: Toast[] }) => void> = []

function dispatch(action: ToastActionType) {
  switch (action.type) {
    case "ADD_TOAST":
      memoryState = {
        toasts: [action.toast, ...memoryState.toasts].slice(0, TOAST_LIMIT),
      }
      break
    case "DISMISS_TOAST": {
      const toastId = action.toastId
      if (toastId) {
        if (toastTimeouts.has(toastId)) {
          return
        }
        const timeout = setTimeout(() => {
          toastTimeouts.delete(toastId)
          dispatch({ type: "REMOVE_TOAST", toastId })
        }, 300)
        toastTimeouts.set(toastId, timeout)
      } else {
        memoryState.toasts.forEach((toast) => {
          dispatch({ type: "DISMISS_TOAST", toastId: toast.id })
        })
      }
      break
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        memoryState = { toasts: [] }
      } else {
        memoryState = {
          toasts: memoryState.toasts.filter((t) => t.id !== action.toastId),
        }
      }
      break
  }
  listeners.forEach((listener) => listener(memoryState))
}

function toast({ title, description, variant = "default" }: Omit<Toast, "id">) {
  const id = genId()
  dispatch({
    type: "ADD_TOAST",
    toast: { id, title, description, variant },
  })

  setTimeout(() => {
    dispatch({ type: "DISMISS_TOAST", toastId: id })
  }, TOAST_REMOVE_DELAY)

  return id
}

function dismiss(toastId?: string) {
  dispatch({ type: "DISMISS_TOAST", toastId })
}

export function useToast() {
  const [state, setState] = useState(memoryState)

  useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [])

  return {
    toasts: state.toasts,
    toast,
    dismiss,
  }
}

export { toast }
