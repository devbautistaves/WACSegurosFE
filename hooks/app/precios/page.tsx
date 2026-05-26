"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { 
  Check, 
  X as XIcon,
  Menu,
  X,
  ArrowRight,
  Zap,
  Star,
  Users,
  Building2
} from "lucide-react"

const plans = [
  {
    name: "Starter",
    description: "Ideal para equipos pequenos que recien comienzan",
    icon: Zap,
    color: "from-gray-500 to-gray-600",
    popular: false,
    whatsappMsg: "Hola!%20Quiero%20informacion%20sobre%20el%20plan%20Starter%20de%20TusVentas",
    features: [
      { name: "Hasta 5 usuarios", included: true },
      { name: "Dashboard basico", included: true },
      { name: "Gestion de leads", included: true },
      { name: "Comisiones automaticas", included: true },
      { name: "Reportes basicos", included: true },
      { name: "Soporte por email", included: true },
      { name: "Chat interno", included: false },
      { name: "API access", included: false },
      { name: "Marca blanca", included: false },
      { name: "Soporte prioritario", included: false },
    ]
  },
  {
    name: "Business",
    description: "Para equipos en crecimiento que buscan mas poder",
    icon: Users,
    color: "from-blue-500 to-cyan-500",
    popular: true,
    whatsappMsg: "Hola!%20Quiero%20informacion%20sobre%20el%20plan%20Business%20de%20TusVentas",
    features: [
      { name: "Hasta 25 usuarios", included: true },
      { name: "Dashboard avanzado", included: true },
      { name: "Gestion de leads avanzada", included: true },
      { name: "Comisiones automaticas", included: true },
      { name: "Reportes avanzados", included: true },
      { name: "Soporte por email y chat", included: true },
      { name: "Chat interno", included: true },
      { name: "API access", included: true },
      { name: "Marca blanca", included: false },
      { name: "Soporte prioritario", included: false },
    ]
  },
  {
    name: "Enterprise",
    description: "Solucion completa para grandes organizaciones",
    icon: Building2,
    color: "from-orange-500 to-yellow-500",
    popular: false,
    whatsappMsg: "Hola!%20Quiero%20informacion%20sobre%20el%20plan%20Enterprise%20de%20TusVentas",
    features: [
      { name: "Usuarios ilimitados", included: true },
      { name: "Dashboard personalizado", included: true },
      { name: "Gestion de leads premium", included: true },
      { name: "Comisiones personalizadas", included: true },
      { name: "Reportes personalizados", included: true },
      { name: "Soporte 24/7", included: true },
      { name: "Chat interno", included: true },
      { name: "API access completo", included: true },
      { name: "Marca blanca", included: true },
      { name: "Soporte prioritario", included: true },
    ]
  },
]



export default function PreciosPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
            <Link href="/precios" className="text-sm font-medium text-white transition-colors">
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
              <Link href="/caracteristicas" className="text-gray-300" onClick={() => setMobileMenuOpen(false)}>Caracteristicas</Link>
              <Link href="/precios" className="text-white" onClick={() => setMobileMenuOpen(false)}>Precios</Link>
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
          <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-blue-500/20 rounded-full blur-[128px]" />
          <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-cyan-500/20 rounded-full blur-[128px]" />
        </div>

        <div className="relative container mx-auto px-6 text-center">
          <span className="inline-block px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm font-medium mb-6">
            Precios
          </span>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-8">
            Planes para cada{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              etapa de tu negocio
            </span>
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-12">
            Elige el plan que mejor se adapte a tu equipo. Sin sorpresas, sin costos ocultos.
          </p>

          
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-3xl p-8 border transition-all duration-300 ${
                  plan.popular 
                    ? "border-blue-500 shadow-xl shadow-blue-500/20 scale-105" 
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full text-sm font-medium flex items-center gap-1">
                    <Star className="h-4 w-4" />
                    Mas Popular
                  </div>
                )}

                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-6`}>
                  <plan.icon className="h-7 w-7 text-white" />
                </div>

                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-gray-400 text-sm mb-6">{plan.description}</p>

                <div className="mb-8">
                  <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                    Consultar
                  </div>
                  <p className="text-gray-500 text-sm mt-1">Precio personalizado</p>
                </div>

                <Link href={`https://wa.me/5491171570893?text=${plan.whatsappMsg}`} target="_blank">
                  <Button 
                    className={`w-full mb-8 py-6 ${
                      plan.popular 
                        ? "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600" 
                        : "bg-white/10 hover:bg-white/20"
                    }`}
                  >
                    Consultar por WhatsApp
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>

                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      {feature.included ? (
                        <Check className="h-5 w-5 text-green-400 flex-shrink-0" />
                      ) : (
                        <XIcon className="h-5 w-5 text-gray-600 flex-shrink-0" />
                      )}
                      <span className={feature.included ? "text-gray-300" : "text-gray-600"}>
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      

      {/* CTA */}
      <section className="py-20 border-t border-white/10">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Todavia tienes dudas?
          </h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">
            Contacta con nuestro equipo de ventas y te ayudaremos a elegir el plan perfecto para tu negocio.
          </p>
          <Link href="https://wa.me/5491171570893?text=Hola!%20Quiero%20informacion%20sobre%20los%20planes%20de%20TusVentas" target="_blank">
            <Button size="lg" className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600">
              Hablar con Ventas
              <ArrowRight className="ml-2 h-5 w-5" />
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
