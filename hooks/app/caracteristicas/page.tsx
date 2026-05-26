"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  Bell, 
  Target, 
  DollarSign,
  MessageSquare,
  FileText,
  Shield,
  Clock,
  Zap,
  ArrowRight,
  Check,
  Menu,
  X,
  Play,
  Settings,
  PieChart,
  Calendar,
  Mail,
  Globe
} from "lucide-react"

const allFeatures = [
  {
    icon: BarChart3,
    title: "Dashboard Inteligente",
    description: "Panel de control con metricas en tiempo real, graficos interactivos y KPIs personalizables para visualizar el rendimiento de tu equipo.",
    details: [
      "Graficos de ventas en tiempo real",
      "Metricas de rendimiento por vendedor",
      "KPIs personalizables",
      "Comparativas de periodos"
    ]
  },
  {
    icon: Users,
    title: "Gestion de Equipos",
    description: "Administra tu estructura comercial completa con jerarquias, permisos y asignacion de territorios de manera eficiente.",
    details: [
      "Estructuras jerarquicas flexibles",
      "Permisos por rol",
      "Asignacion de territorios",
      "Historial de actividad"
    ]
  },
  {
    icon: DollarSign,
    title: "Comisiones Automaticas",
    description: "Sistema inteligente que calcula comisiones automaticamente basado en reglas personalizables por producto, vendedor y periodo.",
    details: [
      "Reglas de comision personalizables",
      "Calculo automatico en tiempo real",
      "Reportes de liquidacion",
      "Historial de pagos"
    ]
  },
  {
    icon: Target,
    title: "Seguimiento de Leads",
    description: "Captura, asigna y da seguimiento a prospectos con un pipeline visual completo y automatizaciones inteligentes.",
    details: [
      "Pipeline visual drag & drop",
      "Asignacion automatica",
      "Recordatorios de seguimiento",
      "Historial de interacciones"
    ]
  },
  {
    icon: TrendingUp,
    title: "Reportes Avanzados",
    description: "Genera reportes detallados y exportables de ventas, comisiones, rendimiento y proyecciones con filtros avanzados.",
    details: [
      "Reportes personalizables",
      "Exportacion a Excel/PDF",
      "Filtros avanzados",
      "Proyecciones de ventas"
    ]
  },
  {
    icon: Bell,
    title: "Notificaciones Inteligentes",
    description: "Sistema de alertas en tiempo real sobre ventas, metas alcanzadas, leads asignados y actividad importante del equipo.",
    details: [
      "Alertas en tiempo real",
      "Notificaciones push",
      "Resumen diario por email",
      "Configuracion personalizable"
    ]
  },
  {
    icon: MessageSquare,
    title: "Chat Interno",
    description: "Comunicacion fluida entre equipos con chat integrado, canales por equipo y compartir documentos.",
    details: [
      "Chat uno a uno y grupal",
      "Canales por equipo",
      "Compartir archivos",
      "Historial de mensajes"
    ]
  },
  {
    icon: FileText,
    title: "Gestion de Documentos",
    description: "Almacena y organiza contratos, polizas y documentos importantes con acceso rapido y seguro.",
    details: [
      "Almacenamiento seguro",
      "Organizacion por carpetas",
      "Busqueda rapida",
      "Versionado de documentos"
    ]
  },
  {
    icon: Calendar,
    title: "Agenda y Recordatorios",
    description: "Planifica reuniones, demos y seguimientos con calendario integrado y recordatorios automaticos.",
    details: [
      "Calendario integrado",
      "Recordatorios automaticos",
      "Sincronizacion con Google",
      "Vista de equipo"
    ]
  },
  {
    icon: PieChart,
    title: "Analisis de Conversion",
    description: "Analiza tu funnel de ventas, identifica cuellos de botella y optimiza tu proceso comercial.",
    details: [
      "Analisis de funnel",
      "Tasas de conversion",
      "Tiempo promedio de cierre",
      "Identificacion de obstaculos"
    ]
  },
  {
    icon: Settings,
    title: "Configuracion Flexible",
    description: "Personaliza la plataforma segun las necesidades de tu negocio con opciones de configuracion avanzadas.",
    details: [
      "Campos personalizados",
      "Flujos de trabajo",
      "Integraciones API",
      "Marca blanca"
    ]
  },
  {
    icon: Shield,
    title: "Seguridad Empresarial",
    description: "Proteccion de datos con encriptacion, backups automaticos y cumplimiento de normativas.",
    details: [
      "Encriptacion SSL",
      "Backups automaticos",
      "Logs de auditoria",
      "Cumplimiento GDPR"
    ]
  },
]

export default function CaracteristicasPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeFeature, setActiveFeature] = useState(0)

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/images/tusventas-logo.png"
              alt="TusVentas.digital"
              width={280}
              height={70}
              className="h-16 w-auto"
            />
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="/caracteristicas" className="text-sm font-medium text-white transition-colors">
              Caracteristicas
            </Link>
            <Link href="/precios" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
              Precios
            </Link>
            <Link href="/demo" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
              Demo
            </Link>
            <Link href="https://tusventas.digital" target="_blank">
              <Button className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold px-6">
                Acceder
              </Button>
            </Link>
          </nav>

          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-white">
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-t border-white/10">
            <nav className="container mx-auto px-6 py-6 flex flex-col gap-4">
              <Link href="/caracteristicas" className="text-white" onClick={() => setMobileMenuOpen(false)}>Caracteristicas</Link>
              <Link href="/precios" className="text-gray-300" onClick={() => setMobileMenuOpen(false)}>Precios</Link>
              <Link href="/demo" className="text-gray-300" onClick={() => setMobileMenuOpen(false)}>Demo</Link>
              <Link href="https://tusventas.digital" target="_blank">
                <Button className="w-full bg-gradient-to-r from-blue-500 to-cyan-500">Acceder</Button>
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[128px]" />
          <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[128px]" />
        </div>

        <div className="relative container mx-auto px-6 text-center">
          <span className="inline-block px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm font-medium mb-6">
            Caracteristicas
          </span>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-8">
            Todo lo que necesitas{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              en un solo lugar
            </span>
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-12">
            Descubre todas las herramientas que TusVentas pone a tu disposicion para gestionar y potenciar tu equipo comercial.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/demo">
              <Button size="lg" className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 px-8 py-6 text-lg">
                <Play className="mr-2 h-5 w-5" />
                Ver Demo
              </Button>
            </Link>
            <Link href="/precios">
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 px-8 py-6 text-lg">
                Ver Precios
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {allFeatures.map((feature, index) => (
              <div
                key={index}
                className="group bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-8 border border-white/10 hover:border-blue-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 cursor-pointer"
                onClick={() => setActiveFeature(index)}
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mb-6 group-hover:from-blue-500 group-hover:to-cyan-500 transition-all">
                  <feature.icon className="h-7 w-7 text-blue-400 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed mb-4">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.details.map((detail, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-500">
                      <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-cyan-600/20 to-blue-600/20" />
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-[128px]" />
        </div>
        
        <div className="relative container mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Listo para transformar tu{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              gestion de ventas?
            </span>
          </h2>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Prueba TusVentas gratis y descubre como puede ayudarte a vender mas.
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            <Link href="/demo">
              <Button size="lg" className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 px-10 py-7 text-xl shadow-2xl shadow-blue-500/30">
                Comenzar Ahora
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="https://wa.me/5491171570893?text=Hola!%20Quiero%20informacion%20sobre%20TusVentas" target="_blank">
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 px-10 py-7 text-xl">
                Hablar con Ventas
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10 bg-slate-900/50">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Image
              src="/images/tusventas-logo.png"
              alt="TusVentas.digital"
              width={140}
              height={35}
              className="h-8 w-auto"
            />
            <nav className="flex items-center gap-8">
              <Link href="/" className="text-gray-400 hover:text-white text-sm">Inicio</Link>
              <Link href="/caracteristicas" className="text-gray-400 hover:text-white text-sm">Caracteristicas</Link>
              <Link href="/precios" className="text-gray-400 hover:text-white text-sm">Precios</Link>
              <Link href="/demo" className="text-gray-400 hover:text-white text-sm">Demo</Link>
            </nav>
            <p className="text-gray-500 text-sm">&copy; {new Date().getFullYear()} TusVentas.digital</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
