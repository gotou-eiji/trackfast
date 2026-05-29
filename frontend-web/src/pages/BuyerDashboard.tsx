// frontend-web/src/pages/BuyerDashboard.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const STATUS_LABELS: Record<string, string> = {
  pending:    '⏳ Aguardando coleta',
  collected:  '📦 Coletado',
  in_transit: '🚚 Em trânsito',
  nearby:     '📍 Próximo',
  delivered:  '✅ Entregue',
  failed:     '⚠️ Falhou',
}

interface Order {
  id: string
  product_name: string
  status: string
  dest_address: string
  eta_from?: string
  eta_to?: string
  created_at: string
}

interface Props { token: string; onLogout: () => void }

export default function BuyerDashboard({ token, onLogout }: Props) {
  const [orders, setOrders] = useState<Order[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    fetch(`${API_URL}/api/orders/buyer/user-123`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => Array.isArray(data) ? setOrders(data) : setOrders([]))
  }, [token])

  const formatETA = (order: Order) => {
    if (!order.eta_from || !order.eta_to) return '—'
    const f = new Date(order.eta_from).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const t = new Date(order.eta_to).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    return `${f} – ${t}`
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h2 style={styles.title}>[ TF ] Meus Pedidos</h2>
        <button style={styles.logout} onClick={onLogout}>Sair</button>
      </header>

      {orders.length === 0 && (
        <p style={{ color: '#6b7280', textAlign: 'center', marginTop: 40 }}>
          Nenhum pedido encontrado.
        </p>
      )}

      <div style={styles.list}>
        {orders.map(order => (
          <div key={order.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <strong style={styles.productName}>{order.product_name}</strong>
              <span style={styles.badge}>{STATUS_LABELS[order.status] || order.status}</span>
            </div>
            <p style={styles.address}>📍 {order.dest_address}</p>
            {order.eta_from && (
              <p style={styles.eta}>⏱ Previsão: <strong>{formatETA(order)}</strong></p>
            )}
            <button
              style={styles.trackBtn}
              onClick={() => navigate(`/track/${order.id}`)}
            >
              Rastrear em tempo real →
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: 700, margin: '0 auto', padding: 20, fontFamily: 'sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { margin: 0, fontSize: 22, color: '#1A3C6E', fontFamily: 'monospace' },
  logout: { background: 'none', border: '1px solid #d1d5db', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', color: '#6b7280' },
  list: { display: 'flex', flexDirection: 'column', gap: 16 },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  productName: { fontSize: 16, color: '#111827' },
  badge: { background: '#dbeafe', color: '#1e40af', padding: '3px 10px', borderRadius: 20, fontSize: 12 },
  address: { margin: '4px 0', fontSize: 13, color: '#6b7280' },
  eta: { margin: '4px 0', fontSize: 13, color: '#166534' },
  trackBtn: { marginTop: 12, background: '#1A3C6E', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontSize: 13 },
}
