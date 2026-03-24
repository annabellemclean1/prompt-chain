import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// middleware.ts (or proxy.ts)

export function middleware(request: any) {
  return proxy(request);
}

export function proxy(request: any) {
  // Your actual logic goes here
  console.log("Pathname:", request.nextUrl.pathname);
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }