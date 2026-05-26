"use client"

import { useEffect, useRef } from "react"

// ─── Variant types ────────────────────────────────────────────────────────────
export type BGVariant =
  | "aurora"       // Dashboard         — drifting aurora gradient blobs
  | "soundwaves"   // Cobranzas         — expanding concentric rings
  | "hexgrid"      // Pólizas           — hex grid with pulsing cells
  | "radar"        // Seguimiento       — rotating radar sweep
  | "electric"     // Siniestros        — electric grid + lightning bolts
  | "nodes"        // Clients (TPY)     — canvas network nodes
  | "particles"    // Login / Seller    — floating upward particles
  | "dna"          // Misc              — double helix ribbon
  | "topography"   // Misc              — topographic contour lines

export function BackgroundEffect({ variant }: { variant: BGVariant }) {
  const wrap = "absolute inset-0 overflow-hidden pointer-events-none select-none"
  if (variant === "aurora")     return <div className={wrap}><AuroraEffect /></div>
  if (variant === "soundwaves") return <div className={wrap}><SoundwavesEffect /></div>
  if (variant === "hexgrid")    return <div className={wrap}><HexgridEffect /></div>
  if (variant === "radar")      return <div className={wrap}><RadarEffect /></div>
  if (variant === "electric")   return <div className={wrap}><ElectricEffect /></div>
  if (variant === "nodes")      return <div className={wrap}><NodesEffect /></div>
  if (variant === "particles")  return <div className={wrap}><ParticlesEffect /></div>
  if (variant === "dna")        return <div className={wrap}><DnaEffect /></div>
  if (variant === "topography") return <div className={wrap}><TopographyEffect /></div>
  return null
}

/* ═══════════════════════════════════════════════════════════════════════════════
   AURORA — drifting radial gradient blobs (Dashboard)
   ═════════════════════════════════════════════════════════════════════════════*/
function AuroraEffect() {
  return (
    <>
      <style>{`
        @keyframes bg-a1{0%,100%{transform:translate(0,0) scale(1)}38%{transform:translate(6%,-5%) scale(1.14)}70%{transform:translate(-4%,7%) scale(0.92)}}
        @keyframes bg-a2{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(-7%,4%) scale(1.12)}67%{transform:translate(5%,-6%) scale(0.88)}}
        @keyframes bg-a3{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(3%,5%) scale(1.07)}}
        @keyframes bg-a4{0%,100%{transform:translate(0,0) scale(1)}45%{transform:translate(-3%,-4%) scale(1.05)}75%{transform:translate(6%,3%) scale(0.96)}}
        .bg-a1{animation:bg-a1 22s ease-in-out infinite}
        .bg-a2{animation:bg-a2 28s ease-in-out infinite}
        .bg-a3{animation:bg-a3 19s ease-in-out infinite}
        .bg-a4{animation:bg-a4 25s ease-in-out 3s infinite}
      `}</style>
      <div className="bg-a1" style={{position:"absolute",top:"-25%",left:"-15%",width:"80%",height:"80%",background:"radial-gradient(ellipse at center,rgba(26,58,92,0.13) 0%,transparent 68%)",filter:"blur(55px)"}}/>
      <div className="bg-a2" style={{position:"absolute",top:"5%",right:"-20%",width:"70%",height:"70%",background:"radial-gradient(ellipse at center,rgba(94,179,228,0.10) 0%,transparent 65%)",filter:"blur(65px)"}}/>
      <div className="bg-a3" style={{position:"absolute",bottom:"-20%",left:"15%",width:"65%",height:"60%",background:"radial-gradient(ellipse at center,rgba(26,58,92,0.11) 0%,transparent 65%)",filter:"blur(50px)"}}/>
      <div className="bg-a4" style={{position:"absolute",top:"40%",left:"30%",width:"50%",height:"50%",background:"radial-gradient(ellipse at center,rgba(94,179,228,0.08) 0%,transparent 60%)",filter:"blur(70px)"}}/>
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SOUNDWAVES — expanding concentric rings from two source points (Cobranzas)
   ═════════════════════════════════════════════════════════════════════════════*/
function SoundwavesEffect() {
  const N = 9
  return (
    <>
      <style>{`
        @keyframes bg-sw{0%{r:3;opacity:0.20}100%{r:70;opacity:0}}
        @keyframes bg-swb{0%{r:2;opacity:0.16}100%{r:55;opacity:0}}
        ${Array.from({length:N},(_,i)=>`
          .bg-swa${i}{animation:bg-sw ${6+i*0.1}s ease-out ${(i*0.65).toFixed(2)}s infinite}
          .bg-swb${i}{animation:bg-swb ${7.5+i*0.15}s ease-out ${(i*0.8+0.4).toFixed(2)}s infinite}
        `).join("")}
      `}</style>
      <svg style={{position:"absolute",inset:0,width:"100%",height:"100%"}} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
        {Array.from({length:N},(_,i)=>(
          <circle key={`a${i}`} cx="30" cy="60" r="3" fill="none" stroke="#1a3a5c" strokeWidth="0.4" className={`bg-swa${i}`}/>
        ))}
        {Array.from({length:N},(_,i)=>(
          <circle key={`b${i}`} cx="72" cy="28" r="2" fill="none" stroke="#5eb3e4" strokeWidth="0.3" className={`bg-swb${i}`}/>
        ))}
        {/* Horizontal bars — like an equalizer on the right edge */}
        {[20,30,40,50,60,70,80].map((y,i)=>(
          <line key={y} x1="88" y1={y} x2={91+Math.sin(i)*3} y2={y} stroke="#1a3a5c" strokeWidth="0.6" opacity="0.07"/>
        ))}
      </svg>
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   HEXGRID — tiling hexagons with random pulsing cells (Pólizas)
   ═════════════════════════════════════════════════════════════════════════════*/
function HexgridEffect() {
  const r = 7
  const hw = Math.sqrt(3) * r
  const hh = 2 * r
  const cols = 14, rows = 10
  type Hex = { x: number; y: number; cls: string }
  const hexes: Hex[] = []
  const glowClasses = ["bg-hx0","bg-hx1","bg-hx2",""]
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * hw + (row % 2 === 1 ? hw / 2 : 0)
      const y = row * hh * 0.75
      const seed = row * cols + col
      const cls = seed % 11 === 0 ? "bg-hx0" : seed % 7 === 0 ? "bg-hx1" : seed % 5 === 0 ? "bg-hx2" : ""
      hexes.push({ x, y, cls })
    }
  }
  const pts = (cx:number, cy:number) =>
    Array.from({length:6},(_,i)=>{
      const a = (Math.PI/3)*i - Math.PI/6
      return `${(cx+r*Math.cos(a)).toFixed(1)},${(cy+r*Math.sin(a)).toFixed(1)}`
    }).join(" ")
  const vw = cols * hw + hw
  const vh = rows * hh * 0.75 + hh * 0.25
  return (
    <>
      <style>{`
        @keyframes bg-hx0{0%,100%{opacity:0.04}50%{opacity:0.15}}
        @keyframes bg-hx1{0%,100%{opacity:0.04}50%{opacity:0.11}}
        @keyframes bg-hx2{0%,100%{opacity:0.04}50%{opacity:0.09}}
        .bg-hx0{animation:bg-hx0 3.5s ease-in-out infinite}
        .bg-hx1{animation:bg-hx1 5.2s ease-in-out 1.3s infinite}
        .bg-hx2{animation:bg-hx2 4.8s ease-in-out 2.7s infinite}
      `}</style>
      <svg style={{position:"absolute",inset:0,width:"100%",height:"100%"}} viewBox={`0 0 ${vw.toFixed(0)} ${vh.toFixed(0)}`} preserveAspectRatio="xMidYMid slice">
        {hexes.map((h,i)=>(
          <polygon key={i} points={pts(h.x,h.y)} fill="none" stroke="#1a3a5c" strokeWidth="0.4" opacity="0.055" className={h.cls}/>
        ))}
      </svg>
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   RADAR — rotating sweep with concentric rings & fading blips (Seguimiento)
   ═════════════════════════════════════════════════════════════════════════════*/
function RadarEffect() {
  return (
    <>
      <style>{`
        @keyframes bg-rsweep{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes bg-rblip{0%{opacity:0.7;r:2}60%{opacity:0.3;r:3}100%{opacity:0;r:3.5}}
        .bg-rsweep{animation:bg-rsweep 5s linear infinite;transform-origin:50px 50px}
        .bg-rblip1{animation:bg-rblip 5s 0.6s linear infinite}
        .bg-rblip2{animation:bg-rblip 5s 1.4s linear infinite}
        .bg-rblip3{animation:bg-rblip 5s 3.1s linear infinite}
        .bg-rblip4{animation:bg-rblip 5s 2.2s linear infinite}
      `}</style>
      <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:0.13}} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="bg-sweepGrad" gradientTransform="rotate(90)">
            <stop offset="0%" stopColor="#5eb3e4" stopOpacity="0.5"/>
            <stop offset="100%" stopColor="#5eb3e4" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {/* Rings */}
        {[10,20,30,40,48].map(rr=>(
          <circle key={rr} cx="50" cy="50" r={rr} fill="none" stroke="#1a3a5c" strokeWidth="0.35"/>
        ))}
        {/* Crosshairs */}
        <line x1="50" y1="1" x2="50" y2="99" stroke="#1a3a5c" strokeWidth="0.2" strokeDasharray="1.5,3"/>
        <line x1="1" y1="50" x2="99" y2="50" stroke="#1a3a5c" strokeWidth="0.2" strokeDasharray="1.5,3"/>
        {/* Sweep */}
        <g className="bg-rsweep">
          <path d="M50,50 L50,10 A40,40 0 0,1 90,57 Z" fill="url(#bg-sweepGrad)" opacity="0.25"/>
          <line x1="50" y1="50" x2="50" y2="10" stroke="#5eb3e4" strokeWidth="0.7"/>
        </g>
        {/* Blips */}
        <circle cx="66" cy="37" r="2" fill="#5eb3e4" className="bg-rblip1"/>
        <circle cx="40" cy="26" r="2" fill="#5eb3e4" className="bg-rblip2"/>
        <circle cx="73" cy="58" r="2" fill="#5eb3e4" className="bg-rblip3"/>
        <circle cx="32" cy="68" r="2" fill="#1a3a5c" className="bg-rblip4"/>
      </svg>
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   ELECTRIC — grid + sparking lightning bolt segments (Siniestros)
   ═════════════════════════════════════════════════════════════════════════════*/
function ElectricEffect() {
  const bolts = [
    "M8,18 L18,32 L13,28 L24,42 L19,38 L30,52",
    "M68,5 L75,22 L70,17 L78,34 L73,29 L82,46",
    "M3,65 L14,50 L9,56 L20,41 L15,47 L26,32",
    "M62,88 L74,72 L68,77 L80,61 L74,66 L87,50",
    "M28,92 L18,76 L23,82 L13,66 L18,72 L8,56",
    "M88,82 L83,67 L86,72 L81,57 L84,62 L79,47",
    "M45,3 L52,18 L47,13 L54,28 L49,23 L56,38",
  ]
  return (
    <>
      <style>{`
        @keyframes bg-bolt{0%,85%,100%{opacity:0.04}88%{opacity:0.22}92%{opacity:0.08}95%{opacity:0.19}}
        @keyframes bg-egrid{0%,100%{opacity:0.03}50%{opacity:0.07}}
        ${bolts.map((_,i)=>`.bg-bolt${i}{animation:bg-bolt ${(2.8+i*0.55).toFixed(1)}s ease-in-out ${(i*0.38).toFixed(2)}s infinite}`).join("\n")}
        .bg-egrid{animation:bg-egrid 4s ease-in-out infinite}
      `}</style>
      <svg style={{position:"absolute",inset:0,width:"100%",height:"100%"}} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
        {/* Grid lines */}
        <g className="bg-egrid">
          {Array.from({length:11},(_,i)=>(
            <line key={`h${i}`} x1="0" y1={i*10} x2="100" y2={i*10} stroke="#1a3a5c" strokeWidth="0.18"/>
          ))}
          {Array.from({length:11},(_,i)=>(
            <line key={`v${i}`} x1={i*10} y1="0" x2={i*10} y2="100" stroke="#1a3a5c" strokeWidth="0.18"/>
          ))}
        </g>
        {/* Lightning bolts */}
        {bolts.map((d,i)=>(
          <path key={i} d={d} fill="none" stroke="#5eb3e4" strokeWidth={0.9+i%2*0.3} strokeLinecap="round" strokeLinejoin="round" className={`bg-bolt${i}`}/>
        ))}
        {/* Static corner sparks */}
        <circle cx="50" cy="50" r="0.8" fill="#5eb3e4" opacity="0.06"/>
      </svg>
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   NODES — canvas network with drifting dots + connecting lines (Clients / TPY)
   ═════════════════════════════════════════════════════════════════════════════*/
function NodesEffect() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const resize = () => {
      const w = canvas.offsetWidth, h = canvas.offsetHeight
      canvas.width  = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    interface Node { x:number; y:number; vx:number; vy:number; r:number }
    const W = () => canvas.offsetWidth
    const H = () => canvas.offsetHeight
    const nodes: Node[] = Array.from({length:32}, () => ({
      x: Math.random() * W(), y: Math.random() * H(),
      vx: (Math.random()-0.5)*0.28, vy: (Math.random()-0.5)*0.28,
      r: Math.random()*1.5+1,
    }))
    const THRESH = () => Math.min(W(), H()) * 0.24
    let raf: number
    const draw = () => {
      ctx.clearRect(0, 0, W(), H())
      const thr = THRESH()
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy
        if (n.x < 0 || n.x > W()) n.vx *= -1
        if (n.y < 0 || n.y > H()) n.vy *= -1
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i+1; j < nodes.length; j++) {
          const dx = nodes[i].x-nodes[j].x, dy = nodes[i].y-nodes[j].y
          const d = Math.sqrt(dx*dx+dy*dy)
          if (d < thr) {
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.strokeStyle = `rgba(26,58,92,${0.09*(1-d/thr)})`
            ctx.lineWidth = 0.7
            ctx.stroke()
          }
        }
      }
      for (const n of nodes) {
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI*2)
        ctx.fillStyle = "rgba(94,179,228,0.22)"
        ctx.fill()
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r+1.5, 0, Math.PI*2)
        ctx.strokeStyle = "rgba(94,179,228,0.06)"
        ctx.lineWidth = 0.5
        ctx.stroke()
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [])
  return <canvas ref={ref} style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>
}

/* ═══════════════════════════════════════════════════════════════════════════════
   PARTICLES — upward-drifting soft dots (Login / Seller)
   ═════════════════════════════════════════════════════════════════════════════*/
function ParticlesEffect() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const resize = () => {
      const w = canvas.offsetWidth, h = canvas.offsetHeight
      canvas.width = w * dpr; canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    const W = () => canvas.offsetWidth
    const H = () => canvas.offsetHeight
    interface P { x:number; y:number; r:number; vy:number; vx:number; op:number; wobble:number; woff:number }
    const ps: P[] = Array.from({length:65}, () => ({
      x: Math.random()*W(), y: Math.random()*H(),
      r: Math.random()*2.2+0.4,
      vy: -(Math.random()*0.28+0.06),
      vx: (Math.random()-0.5)*0.12,
      op: Math.random()*0.13+0.04,
      wobble: Math.random()*0.006+0.002,
      woff: Math.random()*Math.PI*2,
    }))
    let t = 0, raf: number
    const draw = () => {
      ctx.clearRect(0, 0, W(), H())
      t += 0.016
      for (const p of ps) {
        p.y += p.vy
        p.x += p.vx + Math.sin(t*0.5 + p.woff) * p.wobble
        if (p.y < -5) { p.y = H()+5; p.x = Math.random()*W() }
        if (p.x < 0 || p.x > W()) p.vx *= -1
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI*2)
        ctx.fillStyle = `rgba(26,58,92,${p.op})`
        ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [])
  return <canvas ref={ref} style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>
}

/* ═══════════════════════════════════════════════════════════════════════════════
   DNA — double-helix ribbon (Misc / alternate)
   ═════════════════════════════════════════════════════════════════════════════*/
function DnaEffect() {
  const steps = 40
  const pts1 = Array.from({length:steps},(_,i)=>{
    const t = (i/steps)*100
    return `${50+22*Math.sin(i/steps*Math.PI*4)},${t}`
  })
  const pts2 = Array.from({length:steps},(_,i)=>{
    const t = (i/steps)*100
    return `${50-22*Math.sin(i/steps*Math.PI*4)},${t}`
  })
  return (
    <>
      <style>{`
        @keyframes bg-dna-shift{0%{transform:translateY(0)}100%{transform:translateY(-50%)}}
        .bg-dna-wrap{animation:bg-dna-shift 12s linear infinite}
      `}</style>
      <svg style={{position:"absolute",inset:0,width:"100%",height:"200%"}} viewBox="0 0 100 200" preserveAspectRatio="xMidYMid slice" className="bg-dna-wrap">
        <polyline points={pts1.join(" ")} fill="none" stroke="#1a3a5c" strokeWidth="0.5" opacity="0.08"/>
        <polyline points={pts2.join(" ")} fill="none" stroke="#5eb3e4" strokeWidth="0.5" opacity="0.07"/>
        {Array.from({length:steps},(_,i)=>(
          <line key={i} x1={50+22*Math.sin(i/steps*Math.PI*4)} y1={(i/steps)*100}
                        x2={50-22*Math.sin(i/steps*Math.PI*4)} y2={(i/steps)*100}
                        stroke="#1a3a5c" strokeWidth="0.3" opacity={i%2===0?"0.08":"0.04"}/>
        ))}
        {/* Repeat for seamless loop */}
        {Array.from({length:steps},(_,i)=>{
          const t = (i/steps)*100+100
          return [
            <line key={`r${i}`}
                  x1={50+22*Math.sin(i/steps*Math.PI*4)} y1={t}
                  x2={50-22*Math.sin(i/steps*Math.PI*4)} y2={t}
                  stroke="#1a3a5c" strokeWidth="0.3" opacity={i%2===0?"0.08":"0.04"}/>,
          ]
        })}
      </svg>
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   TOPOGRAPHY — contour / topo map lines (Misc / alternate)
   ═════════════════════════════════════════════════════════════════════════════*/
function TopographyEffect() {
  // SVG cubic bezier contour lines — layered like a topographic map
  const contours = [
    "M0,35 C20,28 35,42 55,38 S75,30 100,40",
    "M0,50 C15,42 30,58 50,52 S72,44 100,55",
    "M0,65 C18,56 38,72 58,66 S80,58 100,68",
    "M0,22 C25,15 42,30 60,25 S82,17 100,28",
    "M0,78 C22,70 40,85 60,79 S82,71 100,80",
    "M10,10 C30,4 50,18 68,12 S88,5 100,15",
    "M0,90 C20,83 42,96 62,90 S84,83 100,92",
    "M5,42 C28,35 45,49 65,43 S84,36 100,45",
    "M0,57 C22,50 40,64 60,58 S82,51 100,60",
    "M0,72 C18,65 36,78 56,72 S78,65 100,74",
  ]
  return (
    <>
      <style>{`
        @keyframes bg-topo{0%,100%{opacity:0.04}50%{opacity:0.08}}
        .bg-topo-lines{animation:bg-topo 8s ease-in-out infinite}
      `}</style>
      <svg style={{position:"absolute",inset:0,width:"100%",height:"100%"}} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
        <g className="bg-topo-lines">
          {contours.map((d,i)=>(
            <path key={i} d={d} fill="none" stroke="#1a3a5c" strokeWidth={i%3===0?0.5:0.3} opacity="0.9"/>
          ))}
        </g>
      </svg>
    </>
  )
}
