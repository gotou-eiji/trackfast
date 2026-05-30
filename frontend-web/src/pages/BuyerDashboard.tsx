// frontend-web/src/pages/BuyerDashboard.tsx
import { useNavigate } from 'react-router-dom'
import { MOCK_ORDERS, Order } from '../mockData'

const STATUS_LABELS: Record<string, string> = {
  pending:    '⏳ Aguardando coleta',
  collected:  '📦 Coletado',
  in_transit: '🚚 Em trânsito',
  nearby:     '📍 Entregador próximo!',
  delivered:  '✅ Entregue',
  failed:     '⚠️ Tentativa falhou',
}

const STATUS_COLOR: Record<string, string> = {
  pending:    '#f59e0b',
  collected:  '#3b82f6',
  in_transit: '#2563eb',
  nearby:     '#7c3aed',
  delivered:  '#16a34a',
  failed:     '#dc2626',
}

interface Props { token: string; onLogout: () => void }

export default function BuyerDashboard({ onLogout }: Props) {
  const navigate = useNavigate()
  const orders = MOCK_ORDERS

  const formatETA = (order: Order) => {
    const f = new Date(order.eta_from).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const t = new Date(order.eta_to).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const conf = Math.round(order.eta_confidence * 100)
    return `${f} – ${t} (confiança ${conf}%)`
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h2 style={styles.title}>[ TF ] TrackFast</h2>
          <p style={styles.sub}>Painel do Comprador</p>
        </div>
        <button style={styles.logout} onClick={onLogout}>Sair</button>
      </header>

      <div style={styles.list}>
        {orders.map(order => (
          <div key={order.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <strong style={styles.productName}>{order.product_name}</strong>
              <span style={{
                ...styles.badge,
                background: STATUS_COLOR[order.status] + '20',
                color: STATUS_COLOR[order.status],
                border: `1px solid ${STATUS_COLOR[order.status]}40`
              }}>
                {STATUS_LABELS[order.status]}
              </span>
            </div>

            <p style={styles.address}>📍 {order.dest_address}</p>

            {order.status !== 'delivered' && (
              <p style={styles.eta}>
                ⏱ Previsão de entrega: <strong>{formatETA(order)}</strong>
              </p>
            )}

            {order.status === 'delivered' && (
              <p style={{ ...styles.eta, color: '#16a34a' }}>
                ✅ Entregue com sucesso!
              </p>
            )}

            {order.status !== 'delivered' && (
              <button
                style={styles.trackBtn}
                onClick={() => navigate(`/track/${order.id}`)}
              >
                🗺️ Rastrear em tempo real →
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: 700, margin: '0 auto', padding: 20, fontFamily: 'sans-serif', background: '#f8fafc', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, background: '#1A3C6E', borderRadius: 14, padding: '18px 24px' },
  title: { margin: 0, fontSize: 22, color: '#fff', fontFamily: 'monospace' },
  sub: { margin: '4px 0 0', color: '#93c5fd', fontSize: 13 },
  logout: { background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '7px 16px', cursor: 'pointer', color: '#fff', fontSize: 13 },
  list: { display: 'flex', flexDirection: 'column', gap: 16 },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 22, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12, flexWrap: 'wrap' },
  productName: { fontSize: 16, color: '#111827' },
  badge: { padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' },
  address: { margin: '0 0 8px', fontSize: 13, color: '#6b7280' },
  eta: { margin: '0 0 14px', fontSize: 13, color: '#0369a1', background: '#f0f9ff', padding: '8px 12px', borderRadius: 8 },
  trackBtn: { background: '#1A3C6E', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 20px', cursor: 'pointer', fontSize: 13, fontWeight: 500 },
}
