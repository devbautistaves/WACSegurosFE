"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Play,
  Check,
  ArrowRight,
  Menu,
  X,
  BarChart3,
  Users,
  DollarSign,
  Target,
  TrendingUp,
  Zap,
  Shield,
  Clock,
  MessageSquare
} from "lucide-react"

const demoFeatures = [
  {
    icon: BarChart3,
    title: "Dashboard en vivo",
    description: "Explora metricas y graficos interactivos"
  },
  {
    icon: Users,
    title: "Gestion de equipos",
    description: "Ve como funciona la estructura jerarquica"
  },
  {
    icon: DollarSign,
    title: "Calculo de comisiones",
    description: "Experimenta el calculo automatico"
  },
  {
    icon: Target,
    title: "Pipeline de leads",
    description: "Arrastra y suelta prospectos"
  },
]

const benefits = [
  "Acceso completo a todas las funciones",
  "Sin necesidad de tarjeta de credito",
  "Datos de ejemplo precargados",
  "Soporte durante la prueba",
  "Sin compromiso de compra",
  "Configuracion en 2 minutos",
]

export default function DemoPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setIsSubmitting(false)
    setSubmitted(true)
  }

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
            <Link href="/caracteristicas" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
              Caracteristicas
            </Link>
            <Link href="/precios" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
              Precios
            </Link>
            <Link href="/demo" className="text-sm font-medium text-white transition-colors">
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
              <Link href="/caracteristicas" className="text-gray-300" onClick={() => setMobileMenuOpen(false)}>Caracteristicas</Link>
              <Link href="/precios" className="text-gray-300" onClick={() => setMobileMenuOpen(false)}>Precios</Link>
              <Link href="/demo" className="text-white" onClick={() => setMobileMenuOpen(false)}>Demo</Link>
              <Link href="https://tusventas.digital" target="_blank">
                <Button className="w-full bg-gradient-to-r from-blue-500 to-cyan-500">Acceder</Button>
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <section className="pt-32 pb-20 relative min-h-screen">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-[128px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[128px]" />
        </div>

        <div className="relative container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Side - Info */}
            <div>
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full text-orange-400 text-sm font-medium mb-6">
                <Play className="h-4 w-4" />
                Demo Gratuita
              </span>

              <h1 className="text-5xl md:text-6xl font-bold mb-6">
                Prueba{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-400">
                  TusVentas
                </span>{" "}
                gratis
              </h1>

              <p className="text-xl text-gray-400 mb-10 leading-relaxed">
                Accede a una demo completa y experimenta como TusVentas puede transformar la gestion de tu equipo comercial.
              </p>

              {/* Demo Features */}
              <div className="grid grid-cols-2 gap-4 mb-10">
                {demoFeatures.map((feature, index) => (
                  <div 
                    key={index}
                    className="bg-slate-800/30 rounded-xl p-4 border border-white/10"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mb-3">
                      <feature.icon className="h-5 w-5 text-blue-400" />
                    </div>
                    <h3 className="font-medium text-white text-sm mb-1">{feature.title}</h3>
                    <p className="text-xs text-gray-500">{feature.description}</p>
                  </div>
                ))}
              </div>

              {/* Benefits List */}
              <div className="grid grid-cols-2 gap-3">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-gray-400">
                    <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
                    {benefit}
                  </div>
                ))}
              </div>
            </div>

            {/* Right Side - Form */}
            <div>
              <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 md:p-10 border border-white/10 backdrop-blur-xl shadow-2xl">
                {submitted ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                      <Check className="h-10 w-10 text-green-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-4">
                      Solicitud enviada
                    </h3>
                    <p className="text-gray-400 mb-8">
                      Te contactaremos en breve con los datos de acceso a tu demo.
                    </p>
                    <Link href="https://tusventas.digital" target="_blank">
                      <Button className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600">
                        Ir a TusVentas
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="text-center mb-8">
                      <h2 className="text-2xl font-bold text-white mb-2">
                        Solicita tu Demo
                      </h2>
                      <p className="text-gray-400 text-sm">
                        Completa el formulario y te contactaremos en menos de 24 horas
                      </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div>
                        <Label htmlFor="name" className="text-gray-300 text-sm mb-2 block">
                          Nombre completo *
                        </Label>
                        <Input
                          id="name"
                          type="text"
                          placeholder="Tu nombre"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="bg-slate-800/50 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <Label htmlFor="email" className="text-gray-300 text-sm mb-2 block">
                          Email corporativo *
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="tu@empresa.com"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="bg-slate-800/50 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <Label htmlFor="company" className="text-gray-300 text-sm mb-2 block">
                          Empresa *
                        </Label>
                        <Input
                          id="company"
                          type="text"
                          placeholder="Nombre de tu empresa"
                          required
                          value={formData.company}
                          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                          className="bg-slate-800/50 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <Label htmlFor="phone" className="text-gray-300 text-sm mb-2 block">
                          Telefono (opcional)
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+54 11 1234 5678"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="bg-slate-800/50 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-semibold py-6 text-lg shadow-xl shadow-orange-500/30"
                      >
                        {isSubmitting ? (
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Enviando...
                          </div>
                        ) : (
                          <>
                            Solicitar Demo Gratis
                            <ArrowRight className="ml-2 h-5 w-5" />
                          </>
                        )}
                      </Button>

                      <p className="text-xs text-gray-500 text-center">
                        Al enviar aceptas nuestros terminos de servicio y politica de privacidad.
                      </p>
                    </form>
                  </>
                )}
              </div>

              {/* Trust Signals */}
              <div className="flex items-center justify-center gap-6 mt-8 text-gray-500 text-sm">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span>Datos seguros</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Respuesta en 24h</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>Soporte incluido</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Alternative CTA */}
      <section className="py-20 border-t border-white/10">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Prefieres hablar directamente?
          </h2>
          <p className="text-gray-400 mb-8">
            Contacta con nuestro equipo por WhatsApp y te ayudaremos de inmediato.
          </p>
          <Link href="https://wa.me/5491171570893?text=Hola!%20Quiero%20una%20demo%20de%20TusVentas" target="_blank">
            <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10">
              <MessageSquare className="mr-2 h-5 w-5" />
              Contactar por WhatsApp
            </Button>
          </Link>
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
