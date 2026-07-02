"use client"

// Multicotizador — entorno de multicotización inteligente (aún no habilitado
// para el broker). Muestra un cartel informativo + botón de WhatsApp para
// solicitar el alta. El mensaje incluye el nombre del negocio (branding
// single-tenant, localStorage "branding").
import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Calculator, MessageCircle, Sparkles } from "lucide-react"

const WA_NUMBER = "5491135767915"

export default function MulticotizadorPage() {
  return (
    <DashboardLayout requiredRole={["admin", "admin_seguros"]}>
      <Multicotizador />
    </DashboardLayout>
  )
}

function Multicotizador() {
  const [negocio, setNegocio] = useState("")

  useEffect(() => {
    try {
      const b = localStorage.getItem("branding")
      if (b) setNegocio(JSON.parse(b)?.nombre || "")
    } catch {}
  }, [])

  const mensaje = `Hola${negocio ? `, soy ${negocio}` : ""}, quiero solicitar información sobre el Multicotizador inteligente.`
  const waUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(mensaje)}`

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-600 text-white">
          <Calculator className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Multicotizador</h1>
          <p className="text-sm text-slate-500">Multicotización inteligente de seguros</p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500" />

        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-blue-50 text-blue-600">
          <Sparkles className="h-7 w-7" />
        </div>

        <h2 className="text-lg font-semibold text-slate-900">Entorno aún no habilitado</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
          Por el momento usted no tiene habilitado el entorno de Multicotización inteligente,
          por favor solicite información por WhatsApp.
        </p>

        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-green-600/25 transition hover:bg-green-700 active:scale-95"
        >
          <MessageCircle className="h-4 w-4" />
          Solicitar información por WhatsApp
        </a>

        <p className="mt-4 text-xs text-slate-400">Te responderemos a la brevedad.</p>
      </div>
    </div>
  )
}
