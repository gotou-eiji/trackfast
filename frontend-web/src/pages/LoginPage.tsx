// frontend-web/src/pages/LoginPage.tsx
import { useState } from 'react'
import { AuthState } from '../App'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

interface Props { onLogin: (auth: AuthState) => void }

export default function LoginPage({ onLogin }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao fazer login')
      onLogin({ token: data.token, role: data.role })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-image: url(/bg-login.svg);
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          padding: 16px;
          box-sizing: border-box;
        }
        .login-card {
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(10px);
          border-radius: 18px;
          padding: 40px;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 8px 48px rgba(26, 60, 110, 0.18);
          border: 1px solid rgba(46, 117, 182, 0.12);
          box-sizing: border-box;
        }
        .login-logo {
          margin: 0 0 4px;
          font-size: 26px;
          color: #1A3C6E;
          font-family: monospace;
          letter-spacing: 1px;
        }
        .login-sub {
          margin: 0 0 28px;
          color: #64748b;
          font-size: 13px;
        }
        .login-divider {
          height: 2px;
          background: linear-gradient(to right, #1A3C6E, #2E75B6);
          border-radius: 2px;
          margin-bottom: 24px;
          opacity: 0.15;
        }
        .login-field { margin-bottom: 16px; }
        .login-label {
          display: block;
          margin-bottom: 6px;
          font-size: 13px;
          color: #374151;
          font-weight: 500;
        }
        .login-input {
          width: 100%;
          padding: 11px 14px;
          border-radius: 9px;
          border: 1.5px solid #d1d5db;
          font-size: 14px;
          box-sizing: border-box;
          transition: border-color 0.2s;
          background: #fafbfc;
          outline: none;
        }
        .login-input:focus { border-color: #2E75B6; background: #fff; }
        .login-error {
          color: #ef4444;
          font-size: 13px;
          margin-bottom: 12px;
          background: #fef2f2;
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #fecaca;
        }
        .login-btn {
          width: 100%;
          padding: 13px;
          background: linear-gradient(135deg, #1A3C6E, #2E75B6);
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          cursor: pointer;
          font-weight: 600;
          letter-spacing: 0.3px;
          transition: opacity 0.2s;
        }
        .login-btn:hover { opacity: 0.92; }
        .login-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .login-footer {
          margin-top: 20px;
          text-align: center;
          font-size: 11px;
          color: #9ca3af;
        }
        @media (max-width: 480px) {
          .login-card { padding: 28px 20px; border-radius: 14px; }
          .login-logo { font-size: 22px; }
        }
      `}</style>

      <div className="login-container">
        <div className="login-card">
          <h1 className="login-logo">[ TF ] TrackFast</h1>
          <p className="login-sub">Rastreamento logístico em tempo real</p>
          <div className="login-divider" />

          <div className="login-field">
            <label className="login-label">E-mail</label>
            <input
              className="login-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
            />
          </div>

          <div className="login-field">
            <label className="login-label">Senha</label>
            <input
              className="login-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          <div className="login-field">
            <label className="login-label">Perfil</label>
            <select className="login-input" value={role} onChange={e => setRole(e.target.value as any)}>
              <option value="buyer">🛍️ Comprador</option>
              <option value="seller">🏪 Vendedor</option>
            </select>
          </div>

          {error && <p className="login-error">{error}</p>}

          <button className="login-btn" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <p className="login-footer">TrackFast MVP · Maringá, PR</p>
        </div>
      </div>
    </>
  )
}
