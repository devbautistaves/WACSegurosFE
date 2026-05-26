"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { scoringDniAPI, ScoringResult } from "@/lib/api"
import {
  ShieldCheck, ShieldX, ShieldAlert, Search, User, Calendar,
  BarChart2, RotateCcw, CreditCard, Hash, WifiOff,
} from "lucide-react"

// ── CUIL formatter ────────────────────────────────────────────────────────────
function formatCuil(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`
}
function cuilDigits(f: string) { return f.replace(/\D/g, "") }

// ── Result card ───────────────────────────────────────────────────────────────
function ResultCard({ result, cuil, onReset }: { result: ScoringResult; cuil: string; onReset: () => void }) {
  const { aprobado } = result
  const isSinDatos = aprobado === null

  const badgeColor  = isSinDatos ? "bg-yellow-500/10" : aprobado ? "bg-green-500/10" : "bg-destructive/10"
  const textColor   = isSinDatos ? "text-yellow-600 dark:text-yellow-400" : aprobado ? "text-green-600 dark:text-green-400" : "text-destructive"
  const borderColor = isSinDatos ? "border-yellow-500" : aprobado ? "border-green-500" : "border-destructive"
  const Icon  = isSinDatos ? ShieldAlert : aprobado ? ShieldCheck : ShieldX
  const label = isSinDatos ? "SIN DATOS — CONSULTAR SUPERVISOR" : aprobado ? "ACCEDE A LA PROMOCIÓN" : "NO ACCEDE A LA PROMOCIÓN"

  return (
    <Card className={cn("border-2 transition-colors", borderColor)}>
      <CardContent className="pt-6 space-y-5">

        {/* Estado principal */}
        <div className={cn("flex flex-col items-center gap-2 rounded-xl p-6 text-center", badgeColor)}>
          <Icon className={cn("h-14 w-14", textColor)} />
          <p className={cn("text-2xl font-extrabold tracking-tight", textColor)}>{label}</p>
          <p className="text-sm text-muted-foreground">CUIL consultado: {cuil}</p>
        </div>

        {/* Fila 1: Score | Nombre | Fecha */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border bg-muted/40 p-4 flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold uppercase tracking-wide">
              <BarChart2 className="h-3.5 w-3.5" /> Score crediticio
            </div>
            <p className={cn("text-3xl font-black tabular-nums",
              result.score === null ? "text-muted-foreground"
                : result.score >= 400 ? "text-green-600 dark:text-green-400" : "text-destructive"
            )}>
              {result.score ?? "—"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {result.score !== null
                ? result.score >= 400 ? "≥ 400 — apto" : "< 400 — no apto"
                : "No disponible"}
            </p>
          </div>

          <div className="rounded-lg border bg-muted/40 p-4 flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold uppercase tracking-wide">
              <User className="h-3.5 w-3.5" /> Titular
            </div>
            <p className="text-sm font-semibold text-center leading-snug">{result.nombre ?? "—"}</p>
          </div>

          <div className="rounded-lg border bg-muted/40 p-4 flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold uppercase tracking-wide">
              <Calendar className="h-3.5 w-3.5" /> Fecha de nacimiento
            </div>
            <p className="text-lg font-bold text-center">{result.fechaNacimiento ?? "—"}</p>
          </div>
        </div>

        {/* Fila 2: DNI | CUIT */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border bg-muted/40 p-4 flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold uppercase tracking-wide">
              <Hash className="h-3.5 w-3.5" /> DNI
            </div>
            <p className="text-lg font-bold tabular-nums tracking-wide">
              {result.nroDocumento ? Number(result.nroDocumento).toLocaleString("es-AR") : "—"}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-4 flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold uppercase tracking-wide">
              <CreditCard className="h-3.5 w-3.5" /> CUIT
            </div>
            <p className="text-lg font-bold tabular-nums tracking-wide">
              {result.nroCuit
                ? `${result.nroCuit.slice(0, 2)}-${result.nroCuit.slice(2, 10)}-${result.nroCuit.slice(10)}`
                : cuil}
            </p>
          </div>
        </div>

        <Button variant="outline" className="w-full gap-2" onClick={onReset}>
          <RotateCcw className="h-4 w-4" /> Nueva consulta
        </Button>
      </CardContent>
    </Card>
  )
}

// ── Panel usuario (supervisor / soporte) ──────────────────────────────────────
export function ScoringDniPanelUser() {
  const { toast } = useToast()

  const [disponible, setDisponible] = useState<boolean | null>(null)
  const [cuil, setCuil] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ScoringResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const crmToken = typeof window !== "undefined" ? localStorage.getItem("token") ?? "" : ""

  const checkDisponible = useCallback(async () => {
    try {
      const res = await scoringDniAPI.getDisponible(crmToken)
      setDisponible(res.disponible)
    } catch {
      setDisponible(false)
    }
  }, [crmToken])

  useEffect(() => { checkDisponible() }, [checkDisponible])

  const handleConsultar = async () => {
    const digits = cuilDigits(cuil)
    if (digits.length !== 11) {
      toast({ title: "CUIL inválido", description: "Ingresá los 11 dígitos del CUIL.", variant: "destructive" })
      return
    }
    setLoading(true)
    setResult(null)
    setErrorMsg(null)
    try {
      const res = await scoringDniAPI.consultarUser(crmToken, digits)
      if (!res.success) {
        if (res.tokenExpired) {
          setDisponible(false)
          return
        }
        setErrorMsg(res.message ?? "Error al consultar.")
        return
      }
      setResult(res)
    } catch {
      setErrorMsg("Error de conexión al consultar Equifax.")
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => { setResult(null); setCuil(""); setErrorMsg(null) }

  // ── Cargando disponibilidad ───────────────────────────────────────────────
  if (disponible === null) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
          <div>
            <h1 className="text-xl font-bold leading-tight">Scoring DNI — Prosegur</h1>
            <p className="text-sm text-muted-foreground">Validación crediticia vía Equifax</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
          <Spinner className="h-4 w-4" /> Verificando disponibilidad…
        </div>
      </div>
    )
  }

  // ── Servicio no disponible ────────────────────────────────────────────────
  if (!disponible) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
          <div>
            <h1 className="text-xl font-bold leading-tight">Scoring DNI — Prosegur</h1>
            <p className="text-sm text-muted-foreground">Validación crediticia vía Equifax</p>
          </div>
        </div>
        <Card className="border-dashed">
          <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
            <WifiOff className="h-10 w-10 text-muted-foreground/50" />
            <p className="font-semibold text-muted-foreground">Servicio no disponible</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              El servicio de scoring está temporalmente fuera de línea. Avisale a un administrador para que lo reactive.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Servicio disponible ───────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
        <div>
          <h1 className="text-xl font-bold leading-tight">Scoring DNI — Prosegur</h1>
          <p className="text-sm text-muted-foreground">Validación crediticia vía Equifax</p>
        </div>
      </div>

      {/* Error */}
      {errorMsg && !result && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {errorMsg}
        </div>
      )}

      {result ? (
        <ResultCard result={result} cuil={cuil} onReset={handleReset} />
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" />
              Consultar CUIL
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cuil-input">CUIL del cliente</Label>
              <Input
                id="cuil-input"
                placeholder="20-12345678-9"
                value={cuil}
                onChange={e => setCuil(formatCuil(e.target.value))}
                onKeyDown={e => { if (e.key === "Enter") handleConsultar() }}
                maxLength={13}
                className="font-mono text-base tracking-widest"
                autoFocus
              />
            </div>
            <Button className="w-full gap-2" onClick={handleConsultar}
              disabled={loading || cuilDigits(cuil).length !== 11}>
              {loading
                ? <><Spinner className="h-4 w-4" /> Consultando…</>
                : <><Search className="h-4 w-4" /> Consultar score crediticio</>}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
