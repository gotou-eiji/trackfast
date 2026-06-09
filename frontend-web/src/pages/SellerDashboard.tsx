// frontend-web/src/pages/SellerDashboard.tsx
import { useNavigate } from 'react-router-dom'
import { MOCK_ORDERS, Order } from '../mockData'

const STATUS_LABELS: Record<string, string> = {
  pending: '⏳ Aguardando', collected: '📦 Coletado',
  in_transit: '🚚 Em trânsito', nearby: '📍 Próximo',
  delivered: '✅ Entregue', failed: '⚠️ Falhou',
}
const STATUS_COLOR: Record<string, string> = {
  pending: '#f59e0b', collected: '#3b82f6', in_transit: '#2563eb',
  nearby: '#7c3aed', delivered: '#16a34a', failed: '#dc2626',
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
    <>
      <style>{`
        .seller-page {
          min-height: 100vh;
          background-image: url(/bg-dashboard.svg);
          background-size: cover;
          background-position: center;
          background-attachment: fixed;
          font-family: sans-serif;
          padding: 16px;
          box-sizing: border-box;
        }
        .seller-inner { max-width: 960px; margin: 0 auto; }
        .seller-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(135deg, #1A3C6E, #2E75B6);
          border-radius: 16px;
          padding: 18px 24px;
          margin-bottom: 20px;
          box-shadow: 0 4px 20px rgba(26,60,110,0.2);
        }
        .seller-title { margin: 0; font-size: 20px; color: #fff; font-family: monospace; }
        .seller-sub { margin: 4px 0 0; color: #93c5fd; font-size: 12px; }
        .logout-btn2 {
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 8px;
          padding: 7px 16px;
          cursor: pointer;
          color: #fff;
          font-size: 13px;
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 20px;
        }
        .metric-card {
          background: rgba(255,255,255,0.95);
          border-radius: 14px;
          padding: 16px 18px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 2px 10px rgba(26,60,110,0.06);
        }
        .metric-label { display: block; font-size: 11px; color: #6b7280; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
        .metric-value { font-size: 30px; font-weight: 700; }
        .table-wrap {
          background: rgba(255,255,255,0.95);
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid #e5e7eb;
          box-shadow: 0 2px 12px rgba(26,60,110,0.07);
        }
        .orders-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .orders-table thead tr { background: linear-gradient(135deg, #1A3C6E, #2E75B6); }
        .orders-table th { padding: 13px 16px; color: #fff; text-align: left; font-weight: 500; font-size: 13px; }
        .orders-table td { padding: 12px 16px; border-bottom: 1px solid #f3f4f6; }
        .orders-table tr:last-child td { border-bottom: none; }
        .orders-table tr:nth-child(even) td { background: #f9fafb; }
        .sbadge { padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; white-space: nowrap; }
        .track-btn2 {
          background: linear-gradient(135deg, #1A3C6E, #2E75B6);
          color: #fff;
          border: none;
          border-radius: 7px;
          padding: 6px 14px;
          cursor: pointer;
          font-size: 12px;
          white-space: nowrap;
        }
        /* Mobile: esconde colunas menos importantes */
        @media (max-width: 700px) {
          .metrics-grid { grid-template-columns: repeat(2, 1fr); }
          .col-hide { display: none; }
          .seller-header { padding: 14px 16px; }
          .seller-title { font-size: 17px; }
        }
        @media (max-width: 420px) {
          .metrics-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .metric-value { font-size: 24px; }
          .orders-table th, .orders-table td { padding: 10px 10px; font-size: 12px; }
        }
      `}</style>

      <div className="seller-page">
        <div className="seller-inner">
          <header className="seller-header">
            <div>
              <h2 className="seller-title">[ TF ] TrackFast</h2>
              <p className="seller-sub">Dashboard do Vendedor</p>
            </div>
            <button className="logout-btn2" onClick={onLogout}>Sair</button>
          </header>

          <div className="metrics-grid">
            {[
              { label: 'Total de Pedidos', value: total,           color: '#1A3C6E' },
              { label: 'Em Trânsito',      value: inTransit,       color: '#2563eb' },
              { label: 'Entregues',         value: delivered,       color: '#16a34a' },
              { label: 'Taxa no Prazo',     value: `${onTimeRate}%`,color: '#0891b2' },
            ].map(m => (
              <div key={m.label} className="metric-card">
                <span className="metric-label">{m.label}</span>
                <span className="metric-value" style={{ color: m.color }}>{m.value}</span>
              </div>
            ))}
          </div>

          <div className="table-wrap">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Status</th>
                  <th className="col-hide">Previsão</th>
                  <th className="col-hide">Destino</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td><strong>{order.product_name}</strong></td>
                    <td>
                      <span className="sbadge" style={{
                        background: STATUS_COLOR[order.status] + '18',
                        color: STATUS_COLOR[order.status],
                        border: `1px solid ${STATUS_COLOR[order.status]}40`,
                      }}>
                        {STATUS_LABELS[order.status]}
                      </span>
                    </td>
                    <td className="col-hide" style={{ fontSize: 12, color: '#0369a1' }}>{formatETA(order)}</td>
                    <td className="col-hide" style={{ fontSize: 12, color: '#6b7280' }}>{order.dest_address}</td>
                    <td>
                      {order.status !== 'delivered' && (
                        <button className="track-btn2" onClick={() => navigate(`/track/${order.id}`)}>
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
      </div>
    </>
  )
}
