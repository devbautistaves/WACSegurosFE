import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_API_URL || "https://vps-5905394-x.dattaweb.com/wacseguros"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyRequest(request, path, "GET")
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyRequest(request, path, "POST")
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyRequest(request, path, "PUT")
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyRequest(request, path, "DELETE")
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyRequest(request, path, "PATCH")
}

async function proxyRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
  const targetPath = `/api/${pathSegments.join("/")}`
  const targetUrl = `${BACKEND_URL}${targetPath}${request.nextUrl.search}`

  // Build headers
  const headers: Record<string, string> = {}
  
  // Forward important headers
  const authHeader = request.headers.get("authorization")
  if (authHeader) {
    headers["Authorization"] = authHeader
  }

  const contentType = request.headers.get("content-type")
  if (contentType) {
    headers["Content-Type"] = contentType
  }

  const companyId = request.headers.get("x-company-id")
  if (companyId) {
    headers["X-Company-ID"] = companyId
  }

  // Forward cookies (refresh token) — necesario para /auth/refresh (cookie httpOnly `rt` del BE)
  const cookieHeader = request.headers.get("cookie")
  if (cookieHeader) {
    headers["Cookie"] = cookieHeader
  }

  // Get request body for methods that support it
  let body: BodyInit | undefined
  if (method !== "GET" && method !== "DELETE") {
    const contentTypeHeader = request.headers.get("content-type") || ""
    
    if (contentTypeHeader.includes("multipart/form-data")) {
      // For file uploads, pass FormData directly
      body = await request.formData()
      // Remove Content-Type header so fetch can set it with boundary
      delete headers["Content-Type"]
    } else {
      try {
        body = await request.text()
      } catch {
        body = undefined
      }
    }
  }

  try {
    const response = await fetch(targetUrl, {
      method,
      headers,
      body,
    })

    // Get response data
    const responseData = await response.text()

    // Return response with CORS headers + Set-Cookie forward (refresh flow)
    const resHeaders = new Headers({
      "Content-Type": response.headers.get("Content-Type") || "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Company-ID, Cookie",
    })
    const sc = (response.headers as any).getSetCookie?.() ?? null
    if (Array.isArray(sc)) {
      for (const c of sc) resHeaders.append("set-cookie", c)
    } else {
      const single = response.headers.get("set-cookie")
      if (single) resHeaders.append("set-cookie", single)
    }
    return new NextResponse(responseData, {
      status: response.status,
      headers: resHeaders,
    })
  } catch (error) {
    console.error("Proxy error:", error)
    return NextResponse.json(
      { success: false, message: "Error de conexion con el servidor" },
      { 
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
        }
      }
    )
  }
}

// Handle OPTIONS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Company-ID",
      "Access-Control-Max-Age": "86400",
    },
  })
}
