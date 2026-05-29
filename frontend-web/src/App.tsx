// frontend-web/src/App.tsx
import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import BuyerDashboard from './pages/BuyerDashboard'
import SellerDashboard from './pages/SellerDashboard'
import TrackingPage from './pages/TrackingPage'

export type UserRole = 'buyer' | 'seller' | 'driver'

export interface AuthState {
  token: string
  role: UserRole
}

export default function App() {
  const [auth, setAuth] = useState<AuthState | null>(() => {
    const saved = localStorage.getItem('trackfast_auth')
    return saved ? JSON.parse(saved) : null
  })

  const login = (authData: AuthState) => {
    localStorage.setItem('trackfast_auth', JSON.stringify(authData))
    setAuth(authData)
  }

  const logout = () => {
    localStorage.removeItem('trackfast_auth')
    setAuth(null)
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          auth ? <Navigate to="/" /> : <LoginPage onLogin={login} />
        } />

        <Route path="/" element={
          !auth ? <Navigate to="/login" /> :
          auth.role === 'seller' ? <SellerDashboard token={auth.token} onLogout={logout} /> :
          <BuyerDashboard token={auth.token} onLogout={logout} />
        } />

        <Route path="/track/:orderId" element={
          !auth ? <Navigate to="/login" /> :
          <TrackingPage token={auth.token} />
        } />
      </Routes>
    </BrowserRouter>
  )
}
