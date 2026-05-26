"use client"

import { useState, useEffect } from "react"
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
  ChevronRight,
  Play,
  Check,
  ArrowRight,
  Menu,
  X,
  Zap,
  Star
} from "lucide-react"

const features = [
  {
    icon: BarChart3,
    title: "Dashboard Inteligente",
    description: "Visualiza el rendimiento de tu equipo en tiempo real con metricas clave y graficos interactivos.",
  },
  {
    icon: Users,
    title: "Gestion de Equipos",
    description: "Administra vendedores, supervisores y estructuras comerciales de forma jerarquica.",
  },
  {
    icon: DollarSign,
    title: "Comisiones Automaticas",
    description: "Calculo automatico de comisiones con reglas personalizables por producto y vendedor.",
  },
  {
    icon: Target,
    title: "Seguimiento de Leads",
    description: "Captura, asigna y da seguimiento a prospectos con pipeline visual.",
  },
  {
    icon: TrendingUp,
    title: "Reportes Avanzados",
    description: "Genera reportes detallados de ventas, comisiones y rendimiento del equipo.",
  },
  {
    icon: Bell,
    title: "Notificaciones",
    description: "Alertas en tiempo real sobre ventas, metas alcanzadas y actividad del equipo.",
  },
]

const stats = [
  { value: "10,000+", label: "Ventas Gestionadas" },
  { value: "500+", label: "Equipos Activos" },
  { value: "98%", label: "Satisfaccion" },
  { value: "45%", label: "Mas Productividad" },
]

const testimonials = [
  {
    quote: "TusVentas transformo completamente la forma en que gestionamos nuestro equipo comercial. Las comisiones se calculan solas y los reportes son increibles.",
    author: "Maria Garcia",
    role: "Directora Comercial",
    company: "Seguros Premium",
  },
  {
    quote: "Antes perdiamos horas calculando comisiones. Ahora todo es automatico y transparente para nuestros vendedores.",
    author: "Carlos Rodriguez",
    role: "Gerente de Ventas",
    company: "Broker Asociados",
  },
  {
    quote: "La visibilidad que tenemos ahora del pipeline de ventas nos permite tomar decisiones mas rapidas y acertadas.",
    author: "Laura Martinez",
    role: "CEO",
    company: "Multiasesores SA",
  },
]

export default function TusVentasLanding() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [currentTestimonial, setCurrentTestimonial] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

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

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/caracteristicas" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
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

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-white"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-t border-white/10">
            <nav className="container mx-auto px-6 py-6 flex flex-col gap-4">
              <Link href="/caracteristicas" className="text-gray-300 hover:text-white" onClick={() => setMobileMenuOpen(false)}>
                Caracteristicas
              </Link>
              <Link href="/precios" className="text-gray-300 hover:text-white" onClick={() => setMobileMenuOpen(false)}>
                Precios
              </Link>
              <Link href="/demo" className="text-gray-300 hover:text-white" onClick={() => setMobileMenuOpen(false)}>
                Demo
              </Link>
              <Link href="https://tusventas.digital" target="_blank">
                <Button className="w-full bg-gradient-to-r from-blue-500 to-cyan-500">
                  Acceder
                </Button>
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/30 rounded-full blur-[128px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-[128px]" />
        </div>

        <div className="relative container mx-auto px-6 py-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full border border-white/20 mb-8">
                <Zap className="h-4 w-4 text-yellow-400" />
                <span className="text-sm text-gray-300">Plataforma de Gestion de Ventas</span>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] mb-8">
                Potencia tus{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-orange-400">
                  ventas
                </span>{" "}
                al maximo
              </h1>

              <p className="text-xl text-gray-400 mb-10 max-w-xl leading-relaxed">
                La plataforma integral para gestionar equipos de ventas, calcular comisiones automaticamente y hacer crecer tu negocio.
              </p>

              <div className="flex flex-wrap gap-4 mb-12">
                <Link href="/demo">
                  <Button size="lg" className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold px-8 py-6 text-lg shadow-2xl shadow-blue-500/30">
                    Ver Demo Gratis
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/caracteristicas">
                  <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 px-8 py-6 text-lg">
                    <Play className="mr-2 h-5 w-5" />
                    Ver Caracteristicas
                  </Button>
                </Link>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center md:text-left">
                    <div className="text-2xl md:text-3xl font-bold text-white">{stat.value}</div>
                    <div className="text-sm text-gray-500">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right - Dashboard Preview */}
            <div className="relative">
              <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-3xl border border-white/10 p-2 shadow-2xl">
                <div className="bg-slate-900 rounded-2xl overflow-hidden">
                  {/* Mock Dashboard */}
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                          <BarChart3 className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">Dashboard</div>
                          <div className="text-xs text-gray-500">Vista general</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                      </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
                        <div className="text-xs text-gray-500 mb-1">Ventas Hoy</div>
                        <div className="text-xl font-bold text-white">$45,231</div>
                        <div className="text-xs text-green-400 flex items-center gap-1 mt-1">
                          <TrendingUp className="h-3 w-3" /> +12.5%
                        </div>
                      </div>
                      <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
                        <div className="text-xs text-gray-500 mb-1">Leads Nuevos</div>
                        <div className="text-xl font-bold text-white">127</div>
                        <div className="text-xs text-green-400 flex items-center gap-1 mt-1">
                          <TrendingUp className="h-3 w-3" /> +8.2%
                        </div>
                      </div>
                      <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
                        <div className="text-xs text-gray-500 mb-1">Conversion</div>
                        <div className="text-xl font-bold text-white">24.8%</div>
                        <div className="text-xs text-green-400 flex items-center gap-1 mt-1">
                          <TrendingUp className="h-3 w-3" /> +3.1%
                        </div>
                      </div>
                    </div>

                    {/* Chart Placeholder */}
                    <div className="bg-slate-800/30 rounded-xl p-4 border border-white/5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-sm font-medium text-white">Ventas por Mes</div>
                        <div className="text-xs text-gray-500">Ultimos 6 meses</div>
                      </div>
                      <div className="flex items-end gap-2 h-32">
                        {[40, 65, 45, 80, 55, 95].map((height, i) => (
                          <div
                            key={i}
                            className="flex-1 bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t-lg transition-all hover:from-blue-400 hover:to-cyan-300"
                            style={{ height: `${height}%` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-6 -right-6 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-4 shadow-xl shadow-orange-500/30 animate-pulse">
                <DollarSign className="h-8 w-8 text-white" />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-4 shadow-xl shadow-blue-500/30">
                <Target className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/50 to-transparent" />
        <div className="relative container mx-auto px-6">
          <div className="text-center mb-20">
            <span className="inline-block px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm font-medium mb-6">
              Caracteristicas
            </span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Todo lo que necesitas para{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                vender mas
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Herramientas poderosas para gestionar tu equipo comercial y maximizar resultados
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-8 border border-white/10 hover:border-blue-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mb-6 group-hover:from-blue-500 group-hover:to-cyan-500 transition-all">
                  <feature.icon className="h-7 w-7 text-blue-400 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/caracteristicas">
              <Button variant="outline" size="lg" className="border-white/20 text-white hover:bg-white/10">
                Ver todas las caracteristicas
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Demo CTA Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-cyan-600/20 to-orange-600/20" />
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-[128px]" />
        </div>
        
        <div className="relative container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full mb-8">
              <Play className="h-4 w-4 text-orange-400" />
              <span className="text-sm text-orange-300">Prueba sin compromiso</span>
            </div>
            
            <h2 className="text-4xl md:text-6xl font-bold mb-8">
              Descubre el poder de{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-400">
                TusVentas
              </span>
            </h2>
            
            <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
              Accede a nuestra demo interactiva y experimenta como TusVentas puede transformar tu gestion comercial.
            </p>

            <div className="flex flex-wrap justify-center gap-6 mb-12">
              <Link href="/demo">
                <Button size="lg" className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-semibold px-10 py-7 text-xl shadow-2xl shadow-orange-500/30">
                  <Play className="mr-3 h-6 w-6" />
                  Iniciar Demo Gratis
                </Button>
              </Link>
              <Link href="/precios">
                <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 px-10 py-7 text-xl">
                  Ver Precios
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap justify-center gap-8 text-gray-400">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-400" />
                <span>Sin tarjeta de credito</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-400" />
                <span>Acceso completo</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-400" />
                <span>Soporte incluido</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-32 relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-white/10 border border-white/20 rounded-full text-gray-300 text-sm font-medium mb-6">
              Testimonios
            </span>
            <h2 className="text-4xl md:text-5xl font-bold">
              Lo que dicen nuestros{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                clientes
              </span>
            </h2>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-3xl p-12 border border-white/10">
              <div className="absolute top-8 left-8 text-6xl text-blue-500/20">{'"'}</div>
              
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className={`transition-all duration-500 ${
                    index === currentTestimonial ? "opacity-100" : "opacity-0 absolute inset-0 p-12"
                  }`}
                >
                  {index === currentTestimonial && (
                    <>
                      <p className="text-2xl text-gray-300 leading-relaxed mb-8 relative z-10">
                        {testimonial.quote}
                      </p>
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xl">
                          {testimonial.author.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-white">{testimonial.author}</div>
                          <div className="text-gray-500">{testimonial.role}, {testimonial.company}</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}

              <div className="flex justify-center gap-2 mt-8">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentTestimonial(index)}
                    className={`h-2 rounded-full transition-all ${
                      index === currentTestimonial ? "bg-blue-500 w-8" : "bg-white/20 w-2"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 border-t border-white/10">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h3 className="text-3xl font-bold text-white mb-2">
                Listo para empezar?
              </h3>
              <p className="text-gray-400">
                Comienza hoy y transforma tu gestion de ventas.
              </p>
            </div>
            <div className="flex gap-4">
              <Link href="/demo">
                <Button size="lg" className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600">
                  Probar Demo
                </Button>
              </Link>
              <Link href="https://wa.me/5491171570893?text=Hola!%20Quiero%20informacion%20sobre%20TusVentas" target="_blank">
                <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  Contactar Ventas
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10 bg-slate-900/50">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <Image
                src="/images/tusventas-logo.png"
                alt="TusVentas.digital"
                width={160}
                height={40}
                className="h-10 w-auto mb-4"
              />
              <p className="text-gray-500 text-sm">
                La plataforma integral para gestionar equipos de ventas y maximizar resultados.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Producto</h4>
              <ul className="space-y-2">
                <li><Link href="/caracteristicas" className="text-gray-400 hover:text-white transition-colors text-sm">Caracteristicas</Link></li>
                <li><Link href="/precios" className="text-gray-400 hover:text-white transition-colors text-sm">Precios</Link></li>
                <li><Link href="/demo" className="text-gray-400 hover:text-white transition-colors text-sm">Demo</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Empresa</h4>
              <ul className="space-y-2">
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Sobre Nosotros</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Contacto</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Blog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Terminos de Servicio</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Politica de Privacidad</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 text-center text-gray-500 text-sm">
            <p>&copy; {new Date().getFullYear()} TusVentas.digital. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
