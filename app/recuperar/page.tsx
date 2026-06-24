"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { authAPI } from "@/lib/api"
import { Shield, ArrowLeft, CheckCircle2 } from "lucide-react"

const WAC_PRIMARY = "#0f2149"

export default function RecuperarPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    if (!email) { setErr("Ingresá tu email"); return }
    setLoading(true)
    try {
      await authAPI.forgotPassword(email)
      setSent(true)
    } catch (e: any) {
      setErr(e?.message || "No se pudo procesar el pedido")
    } finally { setLoading(false) }
  }

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
          {!sent && (
            <div>
              <CardTitle className="text-2xl font-bold text-slate-800">Recuperá tu cuenta</CardTitle>
              <CardDescription className="text-slate-500 mt-1">Te enviaremos un enlace a tu email para crear una nueva contraseña.</CardDescription>
            </div>
          )}
        </CardHeader>

        <CardContent className="pt-4">
          {sent ? (
            <div className="text-center py-2">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Revisá tu email</h2>
              <p className="text-sm text-slate-500 mt-2">
                Si <strong className="text-slate-700">{email}</strong> está registrado, te enviamos un enlace para restablecer tu contraseña. Vence en 1 hora.
              </p>
              <Link href="/login" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-800">
                <ArrowLeft className="h-4 w-4" /> Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              <form onSubmit={submit} className="space-y-5">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="email" className="text-slate-700">Email</FieldLabel>
                    <Input id="email" type="email" placeholder="tu@email.com" value={email}
                      onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
                      className="bg-white border-slate-300" />
                  </Field>
                </FieldGroup>

                {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}

                <Button type="submit" className="w-full text-white font-semibold py-5" style={{ background: WAC_PRIMARY }} disabled={loading}>
                  {loading ? <><Spinner className="mr-2 h-4 w-4" /> Enviando...</> : "Enviar enlace"}
                </Button>
              </form>

              <div className="mt-6 pt-5 border-t border-slate-200 text-center">
                <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
                  <ArrowLeft className="h-4 w-4" /> Volver al inicio de sesión
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
