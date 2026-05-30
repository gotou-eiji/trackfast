// frontend-web/src/pages/SellerDashboard.tsx
import { useNavigate } from 'react-router-dom'
import { MOCK_ORDERS, Order } from '../mockData'

const STATUS_LABELS: Record<string, string> = {
  pending:    '⏳ Aguardando',
  collected:  '📦 Coletado',
  in_transit: '🚚 Em trânsito',
  nearby:     '📍 Próximo',
  delivered:  '✅ Entregue',
  failed:     '⚠️ Falhou',
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

export default function SellerDashboard({ onLogout }: Props) {
  const navigate = useNavigate()
  const orders = MOCK_ORDERS

  const total     = orders.length
  const delivered = orders.filter(o => o.status === 'delivered').length
  const inTransit = orders.filter(o => ['in_transit', 'nearby', 'collected'].includes(o.status)).length
  const onTimeRate = Math.round((delivered / total) * 100)

  const formatETA = (order: Order) => {
    if (order.status === 'delivered') return '—'
    const f = new Date(order.eta_from).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const t = new Date(order.eta_to).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    return `${f} – ${t}`
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h2 style={styles.title}>[ TF ] TrackFast</h2>
          <p style={styles.sub}>Dashboard do Vendedor</p>
        </div>
        <button style={styles.logout} onClick={onLogout}>Sair</button>
      </header>

      {/* Métricas */}
      <div style={styles.metrics}>
        {[
          { label: 'Total de Pedidos', value: total,          color: '#1A3C6E', bg: '#eff6ff' },
          { label: 'Em Trânsito',      value: inTransit,      color: '#2563eb', bg: '#dbeafe' },
          { label: 'Entregues',        value: delivered,       color: '#16a34a', bg: '#dcfce7' },
          { label: 'Taxa no Prazo',    value: `${onTimeRate}%`,color: '#0891b2', bg: '#e0f2fe' },
        ].map(m => (
          <div key={m.label} style={{ ...styles.metric, background: m.bg }}>
            <span style={styles.metricLabel}>{m.label}</span>
            <span style={{ ...styles.metricValue, color: m.color }}>{m.value}</span>
          </div>
        ))}
      </div>

      {/* Tabela de pedidos */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thead}>
              <th style={styles.th}>Produto</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Previsão</th>
              <th style={styles.th}>Destino</th>
              <th style={styles.th}>Ação</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, i) => (
              <tr key={order.id} style={{ background: i % 2 === 0 ? '#f9fafb' : '#fff' }}>
                <td style={styles.td}><strong>{order.product_name}</strong></td>
                <td style={styles.td}>
                  <span style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 12,
                    background: STATUS_COLOR[order.status] + '20',
                    color: STATUS_COLOR[order.status],
                    border: `1px solid ${STATUS_COLOR[order.status]}40`
                  }}>
                    {STATUS_LABELS[order.status]}
                  </span>
                </td>
                <td style={{ ...styles.td, fontSize: 12, color: '#0369a1' }}>{formatETA(order)}</td>
                <td style={{ ...styles.td, fontSize: 12, color: '#6b7280' }}>{order.dest_address}</td>
                <td style={styles.td}>
                  {order.status !== 'delivered' && (
                    <button
                      style={styles.trackBtn}
                      onClick={() => navigate(`/track/${order.id}`)}
                    >
                      Rastrear
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: 960, margin: '0 auto', padding: 20, fontFamily: 'sans-serif', background: '#f8fafc', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, background: '#1A3C6E', borderRadius: 14, padding: '18px 24px' },
  title: { margin: 0, fontSize: 22, color: '#fff', fontFamily: 'monospace' },
  sub: { margin: '4px 0 0', color: '#93c5fd', fontSize: 13 },
  logout: { background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '7px 16px', cursor: 'pointer', color: '#fff', fontSize: 13 },
  metrics: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 },
  metric: { borderRadius: 12, padding: '16px 20px', border: '1px solid #e5e7eb' },
  metricLabel: { display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 8 },
  metricValue: { fontSize: 32, fontWeight: 700 },
  tableWrapper: { background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid #e5e7eb' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  thead: { background: '#1A3C6E' },
  th: { padding: '12px 16px', color: '#fff', textAlign: 'left', fontWeight: 500, fontSize: 13 },
  td: { padding: '12px 16px', borderBottom: '1px solid #f3f4f6' },
  trackBtn: { background: '#1A3C6E', color: '#fff', border: 'none', borderRadius: 7, padding: '6px 14px', cursor: 'pointer', fontSize: 12 },
}
