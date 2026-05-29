// frontend-web/src/pages/LoginPage.tsx
import { useState } from 'react'
import { AuthState } from '../App'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

interface Props {
  onLogin: (auth: AuthState) => void
}

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
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.logo}>[ TF ] TrackFast</h1>
        <p style={styles.subtitle}>Rastreamento logístico em tempo real</p>

        <div style={styles.field}>
          <label style={styles.label}>E-mail</label>
          <input
            style={styles.input}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="seu@email.com"
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Senha</label>
          <input
            style={styles.input}
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Perfil</label>
          <select style={styles.input} value={role} onChange={e => setRole(e.target.value as any)}>
            <option value="buyer">Comprador</option>
            <option value="seller">Vendedor</option>
          </select>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <button style={styles.button} onClick={handleSubmit} disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' },
  card: { background: '#fff', borderRadius: 16, padding: 40, width: 380, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' },
  logo: { margin: '0 0 4px', fontSize: 24, color: '#1A3C6E', fontFamily: 'monospace' },
  subtitle: { margin: '0 0 28px', color: '#64748b', fontSize: 14 },
  field: { marginBottom: 16 },
  label: { display: 'block', marginBottom: 6, fontSize: 13, color: '#374151', fontWeight: 500 },
  input: { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' },
  error: { color: '#ef4444', fontSize: 13, marginBottom: 12 },
  button: { width: '100%', padding: '12px', background: '#1A3C6E', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, cursor: 'pointer', fontWeight: 600 },
}
