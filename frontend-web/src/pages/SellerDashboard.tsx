// frontend-web/src/pages/SellerDashboard.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const STATUS_LABELS: Record<string, string> = {
  pending:    '⏳ Aguardando',
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
  buyer_id: string
  created_at: string
  eta_to?: string
}

interface Props { token: string; onLogout: () => void }

export default function SellerDashboard({ token, onLogout }: Props) {
  const [orders, setOrders] = useState<Order[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    fetch(`${API_URL}/api/orders/seller/seller-456`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => Array.isArray(data) ? setOrders(data) : setOrders([]))
  }, [token])

  // Métricas resumidas
  const total = orders.length
  const delivered = orders.filter(o => o.status === 'delivered').length
  const inTransit = orders.filter(o => ['in_transit', 'nearby', 'collected'].includes(o.status)).length
  const failed = orders.filter(o => o.status === 'failed').length
  const onTimeRate = total > 0 ? Math.round((delivered / total) * 100) : 0

  // Pedidos em atraso: eta_to no passado e não entregue
  const delayed = orders.filter(o =>
    o.eta_to && new Date(o.eta_to) < new Date() && o.status !== 'delivered'
  )

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h2 style={styles.title}>[ TF ] Dashboard Vendedor</h2>
        <button style={styles.logout} onClick={onLogout}>Sair</button>
      </header>

      {/* Métricas */}
      <div style={styles.metrics}>
        {[
          { label: 'Total de pedidos', value: total, color: '#1A3C6E' },
          { label: 'Em trânsito', value: inTransit, color: '#2563eb' },
          { label: 'Entregues', value: delivered, color: '#16a34a' },
          { label: 'Taxa no prazo', value: `${onTimeRate}%`, color: '#0891b2' },
          { label: '⚠️ Em atraso', value: delayed.length, color: '#dc2626' },
          { label: 'Falhas', value: failed, color: '#9333ea' },
        ].map(m => (
          <div key={m.label} style={styles.metric}>
            <span style={styles.metricLabel}>{m.label}</span>
            <span style={{ ...styles.metricValue, color: m.color }}>{m.value}</span>
          </div>
        ))}
      </div>

      {/* Alertas de atraso */}
      {delayed.length > 0 && (
        <div style={styles.alertBox}>
          <strong>⚠️ {delayed.length} pedido(s) em atraso:</strong>
          {delayed.map(o => (
            <p key={o.id} style={styles.alertItem}>
              {o.product_name} — {o.dest_address}
            </p>
          ))}
        </div>
      )}

      {/* Tabela de pedidos */}
      <table style={styles.table}>
        <thead>
          <tr style={styles.thead}>
            <th style={styles.th}>Produto</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Destino</th>
            <th style={styles.th}>Ação</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order, i) => (
            <tr key={order.id} style={{ background: i % 2 === 0 ? '#f9fafb' : '#fff' }}>
              <td style={styles.td}>{order.product_name}</td>
              <td style={styles.td}>{STATUS_LABELS[order.status] || order.status}</td>
              <td style={styles.td}>{order.dest_address}</td>
              <td style={styles.td}>
                <button
                  style={styles.trackBtn}
                  onClick={() => navigate(`/track/${order.id}`)}
                >
                  Rastrear
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {orders.length === 0 && (
        <p style={{ color: '#6b7280', textAlign: 'center', marginTop: 40 }}>
          Nenhum pedido encontrado.
        </p>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: 900, margin: '0 auto', padding: 20, fontFamily: 'sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { margin: 0, fontSize: 22, color: '#1A3C6E', fontFamily: 'monospace' },
  logout: { background: 'none', border: '1px solid #d1d5db', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', color: '#6b7280' },
  metrics: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 },
  metric: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 20px' },
  metricLabel: { display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 6 },
  metricValue: { fontSize: 28, fontWeight: 700 },
  alertBox: { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 16, marginBottom: 20, color: '#991b1b', fontSize: 13 },
  alertItem: { margin: '4px 0 0' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  thead: { background: '#1A3C6E' },
  th: { padding: '10px 14px', color: '#fff', textAlign: 'left', fontWeight: 500 },
  td: { padding: '10px 14px', borderBottom: '1px solid #e5e7eb' },
  trackBtn: { background: '#1A3C6E', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12 },
}
