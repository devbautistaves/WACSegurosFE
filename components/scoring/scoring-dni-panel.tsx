"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { scoringDniAPI, ScoringResult, ScoringTokenStatus } from "@/lib/api"
import {
  ShieldCheck, ShieldX, ShieldAlert, Key, Search,
  RefreshCw, AlertTriangle, CheckCircle2, XCircle, User, Calendar,
  BarChart2, RotateCcw, ChevronDown, CreditCard, Hash, Zap,
} from "lucide-react"

// ── CUIL formatter ────────────────────────────────────────────────────────────
function formatCuil(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`
}
function cuilDigits(f: string) { return f.replace(/\D/g, "") }

// ── Token status badge ────────────────────────────────────────────────────────
function TokenStatusBadge({ status, onUpdate }: { status: ScoringTokenStatus | null; onUpdate: () => void }) {
  if (!status) return null

  if (!status.hasToken) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
        <div className="flex items-center gap-2 text-destructive text-sm font-medium">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Sin token configurado — pegá el Bearer del portal para empezar
        </div>
        <Button size="sm" variant="destructive" onClick={onUpdate} className="shrink-0">
          <Key className="h-3.5 w-3.5 mr-1.5" /> Configurar
        </Button>
      </div>
    )
  }

  if (status.autoRefresh) {
    // Tiene refresh token — auto-renovación activa
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
          <Zap className="h-4 w-4 shrink-0" />
          Auto-renovación activa — el token se renueva automáticamente
        </div>
        <Button size="sm" variant="outline" onClick={onUpdate} className="shrink-0 h-7 text-xs gap-1.5">
          <Key className="h-3 w-3" /> Reconfigurar
        </Button>
      </div>
    )
  }

  // Tiene Bearer directo — puede expirar
  const expiry = status.accessTokenExpiresAt ? new Date(status.accessTokenExpiresAt) : null
  const expired = expiry ? expiry.getTime() < Date.now() : false

  return (
    <div className={cn(
      "flex items-center justify-between gap-3 rounded-lg border px-4 py-3",
      expired ? "border-destructive/40 bg-destructive/5" : "border-yellow-500/30 bg-yellow-500/5"
    )}>
      <div className={cn("flex items-center gap-2 text-sm font-medium",
        expired ? "text-destructive" : "text-yellow-600 dark:text-yellow-400"
      )}>
        <Key className="h-4 w-4 shrink-0" />
        {expired
          ? "Bearer expirado — pegá uno nuevo desde el portal"
          : `Bearer activo${expiry ? ` · expira ${expiry.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}` : ""}`
        }
      </div>
      <Button size="sm" variant="outline" onClick={onUpdate} className="shrink-0 h-7 text-xs gap-1.5">
        <Key className="h-3 w-3" /> Actualizar
      </Button>
    </div>
  )
}

// ── Raw response viewer ───────────────────────────────────────────────────────
function RawResponseViewer({ result }: { result: ScoringResult }) {
  const [open, setOpen] = useState(false)
  const hasSinDatos = result.score === null || result.fechaNacimiento === null || result.nombre === null
  if (!hasSinDatos && !result.debugInfo) return null

  const df = result.debugInfo?.camposEncontrados
  const resumenCampos = df
    ? `score=${df.indScoreCard}, nacimiento=${df.nomNacido}, nombre=${df.nombreValidado}, dni=${df.nroDocumento}`
    : "campos no mapeados"

  return (
    <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/5">
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-yellow-700 dark:text-yellow-400"
        onClick={() => setOpen(o => !o)}
      >
        <span className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {`Campos encontrados: ${resumenCampos}`}
        </span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-t border-yellow-500/20 px-4 pb-4 pt-3 space-y-2">
          {result.debugInfo && (
            <p className="text-xs text-muted-foreground">
              Claves de primer nivel: <code className="bg-muted px-1 rounded">{result.debugInfo.topLevelKeys.join(", ") || "(vacío)"}</code>
            </p>
          )}
          <p className="text-xs text-muted-foreground font-medium">Respuesta completa de Equifax:</p>
          <pre className="text-[10px] bg-muted rounded p-3 overflow-auto max-h-72 leading-relaxed">
            {JSON.stringify(result.rawData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

// ── Result card ───────────────────────────────────────────────────────────────
function ResultCard({ result, cuil, onReset }: { result: ScoringResult; cuil: string; onReset: () => void }) {
  const { aprobado } = result
  const isSinDatos = aprobado === null

  const badgeColor  = isSinDatos ? "bg-yellow-500/10" : aprobado ? "bg-green-500/10" : "bg-destructive/10"
  const textColor   = isSinDatos ? "text-yellow-600 dark:text-yellow-400" : aprobado ? "text-green-600 dark:text-green-400" : "text-destructive"
  const borderColor = isSinDatos ? "border-yellow-500" : aprobado ? "border-green-500" : "border-destructive"
  const Icon  = isSinDatos ? ShieldAlert : aprobado ? ShieldCheck : ShieldX
  const label = isSinDatos ? "SIN DATOS — REVISAR RESPUESTA" : aprobado ? "ACCEDE A LA PROMOCIÓN" : "NO ACCEDE A LA PROMOCIÓN"

  return (
    <div className="space-y-3">
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
                  : "No encontrado en respuesta"}
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
      <RawResponseViewer result={result} />
    </div>
  )
}

// ── Panel principal ───────────────────────────────────────────────────────────
export function ScoringDniPanel() {
  const { toast } = useToast()

  const [tokenStatus, setTokenStatus] = useState<ScoringTokenStatus | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [cuil, setCuil] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ScoringResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [showTokenModal, setShowTokenModal] = useState(false)
  const [newToken, setNewToken] = useState("")
  const [savingToken, setSavingToken] = useState(false)

  const token = typeof window !== "undefined" ? localStorage.getItem("token") ?? "" : ""

  const refreshTokenStatus = useCallback(async () => {
    try {
      const st = await scoringDniAPI.getTokenStatus(token)
      setTokenStatus(st)
    } catch { /* silencioso */ } finally { setLoadingStatus(false) }
  }, [token])

  useEffect(() => { refreshTokenStatus() }, [refreshTokenStatus])

  const handleSaveToken = async () => {
    if (!newToken.trim()) return
    setSavingToken(true)
    try {
      const res = await scoringDniAPI.updateToken(token, newToken.trim())
      if (res.success) {
        toast({ title: "Refresh token configurado", description: "Auto-renovación activa. No necesitás actualizarlo manualmente." })
        setShowTokenModal(false)
        setNewToken("")
        await refreshTokenStatus()
      }
    } catch {
      toast({ title: "Error", description: "No se pudo guardar el refresh token.", variant: "destructive" })
    } finally { setSavingToken(false) }
  }

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
      const res = await scoringDniAPI.consultar(token, digits)
      if (!res.success) {
        if (res.tokenExpired) {
          toast({ title: "Refresh token expirado", description: "Necesitás reconfigurar el refresh token del portal.", variant: "destructive" })
          setShowTokenModal(true)
          await refreshTokenStatus()
          return
        }
        setErrorMsg(res.message ?? "Error desconocido al consultar Equifax.")
        return
      }
      setResult(res)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error de red al consultar Equifax"
      setErrorMsg(msg)
    } finally { setLoading(false) }
  }

  const handleReset = () => { setResult(null); setCuil(""); setErrorMsg(null) }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
        <div>
          <h1 className="text-xl font-bold leading-tight">Scoring DNI — Prosegur</h1>
          <p className="text-sm text-muted-foreground">Validación crediticia vía Equifax INTREPOR</p>
        </div>
        <Button variant="ghost" size="icon" className="ml-auto h-8 w-8 text-muted-foreground"
          onClick={refreshTokenStatus} title="Actualizar estado">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Token status */}
      {loadingStatus
        ? <div className="flex items-center gap-2 text-sm text-muted-foreground px-1"><Spinner className="h-4 w-4" /> Verificando estado…</div>
        : <TokenStatusBadge status={tokenStatus} onUpdate={() => setShowTokenModal(true)} />
      }

      {/* Error de API */}
      {errorMsg && !result && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
          <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium text-destructive">Error al consultar Equifax</p>
            <p className="text-xs text-muted-foreground break-all">{errorMsg}</p>
            {errorMsg.toLowerCase().includes("token") && (
              <Button size="sm" variant="outline" className="mt-2 h-7 text-xs gap-1.5"
                onClick={() => setShowTokenModal(true)}>
                <Key className="h-3 w-3" /> Reconfigurar refresh token
              </Button>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setErrorMsg(null)}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Formulario o resultado */}
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
              <p className="text-xs text-muted-foreground">Ingresá el CUIL de 11 dígitos. Se formatea automáticamente.</p>
            </div>
            <Button className="w-full gap-2" onClick={handleConsultar}
              disabled={loading || cuilDigits(cuil).length !== 11 || !tokenStatus?.hasToken}>
              {loading
                ? <><Spinner className="h-4 w-4" /> Consultando Equifax…</>
                : <><Search className="h-4 w-4" /> Consultar score crediticio</>}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modal token */}
      <Dialog open={showTokenModal} onOpenChange={setShowTokenModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" /> Configurar token Equifax
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                {/* Opción rápida */}
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
                  <p className="font-semibold text-foreground text-xs uppercase tracking-wide">⚡ Opción rápida — Bearer token</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Abrí <a href="https://interactivereports.equifax.com" target="_blank" rel="noopener noreferrer" className="underline text-primary">interactivereports.equifax.com</a> e iniciá sesión</li>
                    <li>F12 → <strong>Network</strong> → buscá el request a <code className="bg-muted px-1 rounded text-[10px]">/products</code></li>
                    <li>Click → <strong>Headers</strong> → copiá el valor de <code className="bg-muted px-1 rounded text-[10px]">authorization</code> (sin el "Bearer ")</li>
                    <li>Pegalo abajo — funciona de inmediato</li>
                  </ol>
                  <p className="text-[10px] text-yellow-600 dark:text-yellow-400">⚠ Expira en ~10 min — habrá que actualizarlo</p>
                </div>
                {/* Opción auto-renovación */}
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
                  <p className="font-semibold text-foreground text-xs uppercase tracking-wide">🔄 Auto-renovación — Refresh token</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>En el portal, F12 → <strong>Network</strong> → filtrá por <code className="bg-muted px-1 rounded text-[10px]">token</code></li>
                    <li>Esperá el heartbeat a <code className="bg-muted px-1 rounded text-[10px]">/v1/token</code> (hasta 10 min)</li>
                    <li>Apenas aparezca → <strong>cerrá la pestaña</strong> del portal</li>
                    <li>Click en ese request → <strong>Payload</strong> → copiá el <code className="bg-muted px-1 rounded text-[10px]">refresh_token</code></li>
                    <li>Pegalo — el sistema se renueva solo</li>
                  </ol>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <Label htmlFor="new-token">Bearer token o Refresh token</Label>
            <textarea
              id="new-token"
              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="eyJraWQ... (Bearer)  ó  W4htQlCOq... (Refresh)"
              value={newToken}
              onChange={e => setNewToken(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">
              El sistema detecta automáticamente si pegaste un Bearer o un Refresh token.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setShowTokenModal(false); setNewToken("") }}>Cancelar</Button>
            <Button onClick={handleSaveToken} disabled={savingToken || newToken.trim().length < 20} className="gap-2">
              {savingToken ? <Spinner className="h-4 w-4" /> : <Key className="h-4 w-4" />}
              {savingToken ? "Guardando…" : "Guardar token"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
