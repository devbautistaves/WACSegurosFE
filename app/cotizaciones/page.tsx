"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { 
  ChevronUp, 
  Menu, 
  X, 
  Car, 
  Bike, 
  Home, 
  Store, 
  Handshake, 
  Heart, 
  Smartphone, 
  Plane, 
  ShoppingBag, 
  Laptop, 
  Cpu,
  Shield,
  DollarSign,
  Headphones,
  Zap,
  Phone,
  MessageCircle,
  MapPin,
  Mail,
  Clock
} from "lucide-react"
import { Button } from "@/components/ui/button"

const tabs = [
  { id: "vehiculos", label: "Vehículos" },
  { id: "propiedades", label: "Propiedades" },
  { id: "personales", label: "Personales" },
]

const insuranceCategories = {
  vehiculos: [
    {
      icon: Car,
      title: "Auto",
      description: "Protegé tu vehículo con las mejores coberturas",
      link: "https://ecommerce.atmseguros.com.ar/?sale-center=2y10d7f5dhj7clin0rzowprrodkfelwdjexjnksfka0aau1pytim",
    },
    {
      icon: Bike,
      title: "Moto",
      description: "Asegurá tu moto con la cobertura ideal",
      link: "https://ecommerce.atmseguros.com.ar/?sale-center=2y10d7f5dhj7clin0rzowprrodkfelwdjexjnksfka0aau1pytim",
    },
    {
      icon: Bike,
      title: "Bicicleta",
      description: "Asegurá tu Bici y usala tranqui",
      link: "https://bbvaseguros-api-pub-live.bbvaseguros.com.ar/segrest/api/ext/external/micrositios/accesoParametria.do?legajo=72745&tipoProducto=BIC",
    },
  ],
  propiedades: [
    {
      icon: Home,
      title: "Hogar",
      description: "Protegé tu casa y tus pertenencias",
      link: "https://bbvaseguros-api-pub-live.bbvaseguros.com.ar/segrest/api/ext/external/micrositios/accesoParametria.do?legajo=72745&tipoProducto=HOG",
    },
    {
      icon: Store,
      title: "Comercio",
      description: "Asegurá tu negocio contra todo riesgo",
      link: "https://wa.me/5491171231832",
    },
    {
      icon: Handshake,
      title: "Garantía de alquiler",
      description: "La mejor solución para inquilinos",
      link: "https://www.bbvaseguros.com.ar/webprivada/seguros-personas/seguro-de-caucion/cotizador-seguro-caucion/?legajo=72745",
    },
  ],
  personales: [
    {
      icon: Heart,
      title: "Accidentes personales",
      description: "Protección ante imprevistos",
      link: "https://bbvaseguros-api-pub-live.bbvaseguros.com.ar/segrest/api/ext/external/micrositios/accesoParametria.do?legajo=72745&tipoProducto=AP",
    },
    {
      icon: Smartphone,
      title: "Celular",
      description: "Protegé tu dispositivo móvil",
      link: "https://bbvaseguros-api-pub-live.bbvaseguros.com.ar/segrest/api/ext/external/micrositios/accesoParametria.do?legajo=72745&tipoProducto=POR",
    },
    {
      icon: Plane,
      title: "Viajes",
      description: "Viaja tranquilo y seguro",
      link: "https://www.sistemacnet.com/vendors/grupojv",
    },
    {
      icon: ShoppingBag,
      title: "Bolso",
      description: "Lleva tu bolso donde quieras!",
      link: "https://www.bbvaseguros.com.ar/webprivada/micrositioLandingParametria.action?numeroLegajo=72745",
    },
    {
      icon: Laptop,
      title: "Notebook",
      description: "Protegé tu Notebook",
      link: "https://www.bbvaseguros.com.ar/webprivada/micrositioLandingParametria.action?numeroLegajo=72745",
    },
    {
      icon: Cpu,
      title: "Dispositivos tecnológicos",
      description: "Protegé todos tus dispositivos y mantene segura tu conexión al internet!",
      link: "https://www.bbvaseguros.com.ar/webprivada/micrositioLandingParametria.action?numeroLegajo=72745",
    },
  ],
}

const benefits = [
  {
    icon: Shield,
    title: "Coberturas completas",
    description: "Ofrecemos las coberturas más amplias del mercado para proteger lo que más te importa.",
  },
  {
    icon: DollarSign,
    title: "Precios competitivos",
    description: "Trabajamos con las mejores compañías para ofrecerte el mejor precio sin sacrificar calidad.",
  },
  {
    icon: Headphones,
    title: "Atención personalizada",
    description: "Te acompañamos en todo momento, especialmente cuando más nos necesitás.",
  },
  {
    icon: Zap,
    title: "Respuesta inmediata",
    description: "Gestionamos tus trámites y siniestros con la mayor rapidez y eficiencia.",
  },
]

export default function CotizacionesPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [activeTab, setActiveTab] = useState("vehiculos")

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex-shrink-0">
            <Image
              src="/images/grupojv/logo2.png"
              alt="Grupo JV Logo"
              width={180}
              height={60}
              className="h-12 w-auto"
            />
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">
              Inicio
            </Link>
            <Link href="#cotizaciones" className="text-sm font-medium text-blue-600">
              Cotizaciones
            </Link>
            <Link href="/#nosotros" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">
              Nosotros
            </Link>
            <Link href="/#contacto">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                Contacto
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="sm">
                Iniciar Sesión
              </Button>
            </Link>
          </nav>

          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t">
            <nav className="container mx-auto px-4 py-4 flex flex-col gap-4">
              <Link href="/" className="text-sm font-medium text-gray-700" onClick={() => setMobileMenuOpen(false)}>
                Inicio
              </Link>
              <Link href="#cotizaciones" className="text-sm font-medium text-blue-600" onClick={() => setMobileMenuOpen(false)}>
                Cotizaciones
              </Link>
              <Link href="/#nosotros" className="text-sm font-medium text-gray-700" onClick={() => setMobileMenuOpen(false)}>
                Nosotros
              </Link>
              <Link href="/#contacto" onClick={() => setMobileMenuOpen(false)}>
                <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700">
                  Contacto
                </Button>
              </Link>
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" size="sm" className="w-full">
                  Iniciar Sesión
                </Button>
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400 rounded-full filter blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-500 rounded-full filter blur-3xl" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center text-white max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Cotizá tu seguro en <span className="text-blue-400">minutos</span>
            </h1>
            <p className="text-xl text-blue-100 mb-10 leading-relaxed">
              Protegé lo que más te importa con las mejores coberturas del mercado
            </p>

            <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold">10+</div>
                <div className="text-sm text-blue-200">Años de experiencia</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold">10k+</div>
                <div className="text-sm text-blue-200">Clientes satisfechos</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold">24/7</div>
                <div className="text-sm text-blue-200">Asistencias Premium</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quote Categories Section */}
      <section id="cotizaciones" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              ¿Qué querés cotizar hoy?
            </h2>
            <p className="text-xl text-gray-600">
              Seleccioná la categoría que necesitás y obtené tu cotización al instante
            </p>
          </div>

          {/* Tabs */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex bg-gray-100 rounded-xl p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-3 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Categories Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {insuranceCategories[activeTab as keyof typeof insuranceCategories].map((category, index) => (
              <div
                key={index}
                className="group bg-white border border-gray-200 rounded-2xl p-6 hover:border-blue-300 hover:shadow-xl transition-all duration-300"
              >
                <div className="w-16 h-16 bg-blue-100 group-hover:bg-blue-600 rounded-2xl flex items-center justify-center mb-4 transition-colors">
                  <category.icon className="h-8 w-8 text-blue-600 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{category.title}</h3>
                <p className="text-gray-600 mb-6">{category.description}</p>
                <Link href={category.link} target="_blank">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    COTIZA AHORA
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              ¿Por qué elegirnos?
            </h2>
            <p className="text-xl text-gray-600">
              Más de 10 años brindando tranquilidad a nuestros clientes
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-shadow"
              >
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                  <benefit.icon className="h-7 w-7 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              ¿Necesitás asesoramiento personalizado?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Nuestro equipo de expertos está listo para ayudarte a encontrar la mejor cobertura para tus necesidades.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="tel:+5491171231832">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
                  <Phone className="mr-2 h-5 w-5" />
                  Llamanos
                </Button>
              </Link>
              <Link href="https://wa.me/5491171231832" target="_blank">
                <Button size="lg" className="bg-green-500 hover:bg-green-600 text-white">
                  <MessageCircle className="mr-2 h-5 w-5" />
                  WhatsApp
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            <div>
              <Image
                src="/images/grupojv/logo23.png"
                alt="Grupo JV"
                width={150}
                height={60}
                className="h-12 w-auto mb-4"
              />
              <p className="text-gray-400">
                Soluciones en seguros para particulares y empresas.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Enlaces Rápidos</h3>
              <ul className="space-y-2">
                <li><Link href="/" className="text-gray-400 hover:text-white transition-colors">Inicio</Link></li>
                <li><Link href="/#nosotros" className="text-gray-400 hover:text-white transition-colors">Nosotros</Link></li>
                <li><Link href="/#servicios" className="text-gray-400 hover:text-white transition-colors">Servicios</Link></li>
                <li><Link href="/#contacto" className="text-gray-400 hover:text-white transition-colors">Contacto</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Nuestros Servicios</h3>
              <ul className="space-y-2">
                <li><Link href="#cotizaciones" className="text-gray-400 hover:text-white transition-colors">Seguros de Auto</Link></li>
                <li><Link href="#cotizaciones" className="text-gray-400 hover:text-white transition-colors">Seguros de Hogar</Link></li>
                <li><Link href="#cotizaciones" className="text-gray-400 hover:text-white transition-colors">Seguros de Vida</Link></li>
                <li><Link href="#cotizaciones" className="text-gray-400 hover:text-white transition-colors">Seguros para Empresas</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Contacto</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Av Hipolito Irigoyen 20912, Glew, Bs As.</span>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Dr. Kellertas 575, Longchamps, Bs As.</span>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Av. San Martin 1285, Lanus, Bs As.</span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 flex-shrink-0" />
                  <span>+54 11 7123-1832</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 flex-shrink-0" />
                  <span>Hola@grupojv.com.ar</span>
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span>Lun-Vie: 10:00 - 18:00</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-400 text-sm">
              &copy; 2025 Grupo JV. Todos los derechos reservados.
            </p>
            <div className="flex gap-4 text-sm">
              <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                Términos y Condiciones
              </Link>
              <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                Política de Privacidad
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition-all z-50"
          aria-label="Back to top"
        >
          <ChevronUp className="h-6 w-6" />
        </button>
      )}
    </div>
  )
}
