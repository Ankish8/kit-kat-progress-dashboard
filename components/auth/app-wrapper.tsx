'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import AuthOverlay from './auth-overlay'

export default function AppWrapper({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setIsAuthenticated(!!user)
      setLoading(false)
    }
    checkUser()
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session)
    })
    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [supabase.auth])

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  return (
    <div className="relative">
      {children}
      {!isAuthenticated && (
        <AuthOverlay onAuthSuccess={() => setIsAuthenticated(true)} />
      )}
    </div>
  )
}