import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from 'next-auth/middleware'

// Security headers configuration
const securityHeaders = {
  // Content Security Policy - strict policy to prevent XSS
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live", // Note: Remove unsafe-* in production
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.openai.com https://*.supabase.co https://*.upstash.io wss:",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ].join('; '),

  // HTTP Strict Transport Security - force HTTPS
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  // Prevent clickjacking
  'X-Frame-Options': 'DENY',

  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Referrer policy - strict origin when cross-origin
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // XSS Protection (legacy but still useful)
  'X-XSS-Protection': '1; mode=block',

  // Permissions Policy - disable potentially dangerous features
  'Permissions-Policy': [
    'accelerometer=()',
    'ambient-light-sensor=()',
    'autoplay=()',
    'battery=()',
    'camera=()',
    'cross-origin-isolated=()',
    'display-capture=()',
    'document-domain=()',
    'encrypted-media=()',
    'execution-while-not-rendered=()',
    'execution-while-out-of-viewport=()',
    'fullscreen=(self)',
    'geolocation=()',
    'gyroscope=()',
    'keyboard-map=()',
    'magnetometer=()',
    'microphone=()',
    'midi=()',
    'navigation-override=()',
    'payment=()',
    'picture-in-picture=()',
    'publickey-credentials-get=(self)',
    'screen-wake-lock=()',
    'sync-xhr=()',
    'usb=()',
    'web-share=()',
    'xr-spatial-tracking=()',
  ].join(', '),

  // Remove server information
  'X-Powered-By': '',
  'Server': '',

  // Cache control for sensitive pages
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
}

// Routes that require authentication
const protectedRoutes = [
  '/app',
  '/api/vault',
  '/api/share-example',
]

// Routes that should be accessible without auth
const publicRoutes = [
  '/',
  '/signin',
  '/api/auth',
  '/api/signals/ingest', // Anonymous metrics endpoint
]

// API routes that need special handling
const apiRoutes = {
  '/api/vault': {
    methods: ['GET', 'POST', 'DELETE'],
    rateLimit: 'vault',
    authRequired: true,
  },
  '/api/share-example': {
    methods: ['GET', 'POST'],
    rateLimit: 'shareExample',
    authRequired: true,
  },
  '/api/signals/ingest': {
    methods: ['GET', 'POST'],
    rateLimit: 'signals',
    authRequired: false, // Anonymous endpoint
  },
}

/**
 * Apply security headers to response
 */
function applySecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    if (value) {
      response.headers.set(key, value)
    } else {
      response.headers.delete(key)
    }
  })
  return response
}

/**
 * Check if route is protected
 */
function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some(route => pathname.startsWith(route))
}

/**
 * Check if route is public
 */
function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(route => pathname.startsWith(route))
}

/**
 * Validate redirect URLs to prevent open redirects
 */
function isValidRedirectUrl(url: string, origin: string): boolean {
  try {
    const redirectUrl = new URL(url, origin)
    
    // Only allow same-origin redirects
    if (redirectUrl.origin !== origin) {
      return false
    }
    
    // Allowlist of safe paths
    const safePaths = ['/app', '/signin', '/', '/app/settings']
    const isPathSafe = safePaths.some(path => 
      redirectUrl.pathname === path || redirectUrl.pathname.startsWith(path + '/')
    )
    
    return isPathSafe
  } catch {
    return false
  }
}

/**
 * Main middleware function
 */
export default withAuth(
  function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl
    const origin = request.nextUrl.origin

    // Create response
    let response = NextResponse.next()

    // Apply security headers to all responses
    response = applySecurityHeaders(response)

    // Handle API routes with special logic
    if (pathname.startsWith('/api/')) {
      return handleApiRoute(request, response)
    }

    // Handle authentication redirects securely
    const callbackUrl = request.nextUrl.searchParams.get('callbackUrl')
    if (callbackUrl && !isValidRedirectUrl(callbackUrl, origin)) {
      console.warn(`Blocked potentially malicious redirect: ${callbackUrl}`)
      const secureUrl = new URL('/app', origin)
      return NextResponse.redirect(secureUrl)
    }

    // Block access to sensitive files
    if (isSensitiveFile(pathname)) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    // Add cache headers for static assets
    if (isStaticAsset(pathname)) {
      response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    }

    return response
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl

        // Allow public routes
        if (isPublicRoute(pathname)) {
          return true
        }

        // Require authentication for protected routes
        if (isProtectedRoute(pathname)) {
          return !!token
        }

        // Default to allow
        return true
      },
    },
  }
)

/**
 * Handle API routes with specific security measures
 */
function handleApiRoute(request: NextRequest, response: NextResponse): NextResponse {
  const { pathname } = request.nextUrl

  // Add API-specific headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  
  // CORS handling for specific endpoints
  if (pathname.startsWith('/api/signals/ingest')) {
    // Allow CORS for anonymous metrics endpoint
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
  } else {
    // Strict CORS for other API endpoints
    response.headers.set('Access-Control-Allow-Origin', request.nextUrl.origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
  }

  // Validate HTTP methods
  const apiConfig = Object.entries(apiRoutes).find(([route]) => 
    pathname.startsWith(route)
  )?.[1]

  if (apiConfig && !apiConfig.methods.includes(request.method)) {
    return new NextResponse('Method Not Allowed', { status: 405 })
  }

  // Block suspicious User-Agents
  const userAgent = request.headers.get('User-Agent') || ''
  if (isSuspiciousUserAgent(userAgent)) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  return response
}

/**
 * Check if file path is sensitive
 */
function isSensitiveFile(pathname: string): boolean {
  const sensitivePatterns = [
    /\.env/,
    /\.git/,
    /\.log$/,
    /\.key$/,
    /\.pem$/,
    /config\.js$/,
    /config\.json$/,
    /secrets/i,
    /private/i,
  ]
  
  return sensitivePatterns.some(pattern => pattern.test(pathname))
}

/**
 * Check if path is a static asset
 */
function isStaticAsset(pathname: string): boolean {
  return /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/.test(pathname)
}

/**
 * Check for suspicious User-Agents
 */
function isSuspiciousUserAgent(userAgent: string): boolean {
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /scan/i,
    /sqlmap/i,
    /nikto/i,
    /nmap/i,
    /masscan/i,
    /ZmEu/i,
    /libwww/i,
    /python-requests/i,
  ]
  
  // Allow legitimate bots (search engines, monitoring)
  const allowedBots = [
    /googlebot/i,
    /bingbot/i,
    /uptimerobot/i,
    /pingdom/i,
  ]
  
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent))
  const isAllowed = allowedBots.some(pattern => pattern.test(userAgent))
  
  return isSuspicious && !isAllowed
}

// Matcher configuration - apply middleware to specific routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}