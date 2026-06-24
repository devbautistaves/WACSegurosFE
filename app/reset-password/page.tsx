"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { authAPI } from "@/lib/api"
import { Shield, ArrowLeft, Eye, EyeOff, CheckCircle2 } from "lucide-react"

const WAC_PRIMARY = "#0f2149"

function ResetForm() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get("token") || ""

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    if (!token) { setErr("El enlace es inválido. Pedí uno nuevo desde 'Olvidé mi contraseña'."); return }
    if (password.length < 6) { setErr("La contraseña debe tener al menos 6 caracteres"); return }
    if (password !== confirm) { setErr("Las contraseñas no coinciden"); return }
    setLoading(true)
    try {
      await authAPI.resetPassword(token, password)
      setDone(true)
      setTimeout(() => router.replace("/login"), 2500)
    } catch (e: any) {
      setErr(e?.message || "No se pudo restablecer la contraseña")
    } finally { setLoading(false) }
  }

  if (done) {
    return (
      <div className="text-center py-2">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">¡Listo!</h2>
        <p className="text-sm text-slate-500 mt-2">Tu contraseña se actualizó. Te llevamos al inicio de sesión…</p>
        <Link href="/login" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-800">
          <ArrowLeft className="h-4 w-4" /> Ir al inicio de sesión
        </Link>
      </div>
    )
  }

  return (
    <>
      <form onSubmit={submit} className="space-y-5">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="password" className="text-slate-700">Nueva contraseña</FieldLabel>
            <div className="relative">
              <Input id="password" type={showPass ? "text" : "password"} placeholder="••••••••" value={password}
                onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password"
                className="bg-white border-slate-300 pr-10" />
              <button type="button" onClick={() => setShowPass(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
          <Field>
            <FieldLabel htmlFor="confirm" className="text-slate-700">Repetir contraseña</FieldLabel>
            <Input id="confirm" type={showPass ? "text" : "password"} placeholder="••••••••" value={confirm}
              onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password"
              className="bg-white border-slate-300" />
          </Field>
        </FieldGroup>

        {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}

        <Button type="submit" className="w-full text-white font-semibold py-5" style={{ background: WAC_PRIMARY }} disabled={loading}>
          {loading ? <><Spinner className="mr-2 h-4 w-4" /> Guardando...</> : "Guardar contraseña"}
        </Button>
      </form>

      <div className="mt-6 pt-5 border-t border-slate-200 text-center">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Volver al inicio de sesión
        </Link>
      </div>
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50">
      <Card className="w-full max-w-md border-slate-200 shadow-xl">
        <CardHeader className="space-y-4 text-center pb-2">
          <div className="flex justify-center mb-2">
            <div className="flex items-center gap-3">
              <Shield className="h-9 w-9" style={{ color: WAC_PRIMARY }} />
              <div className="text-left">
                <p className="text-xl font-black" style={{ color: WAC_PRIMARY }}>WAC SEGUROS</p>
                <p className="text-xs text-slate-500 tracking-widest uppercase">CRM</p>
              </div>
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-slate-800">Nueva contraseña</CardTitle>
            <CardDescription className="text-slate-500 mt-1">Elegí una contraseña nueva para tu cuenta.</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <Suspense fallback={<div className="flex justify-center py-8"><Spinner className="h-5 w-5" /></div>}>
            <ResetForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
