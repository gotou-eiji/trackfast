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
  pending: '#f59e0b', collected: '#3b82f6', in_transit: '#2563eb',
  nearby: '#7c3aed', delivered: '#16a34a', failed: '#dc2626',
}

interface Props { token: string; onLogout: () => void }

export default function BuyerDashboard({ onLogout }: Props) {
  const navigate = useNavigate()

  const formatETA = (order: Order) => {
    const f = new Date(order.eta_from).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const t = new Date(order.eta_to).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    return `${f} – ${t} (confiança ${Math.round(order.eta_confidence * 100)}%)`
  }

  return (
    <>
      <style>{`
        .buyer-page {
          min-height: 100vh;
          background-image: url(/bg-dashboard.svg);
          background-size: cover;
          background-position: center;
          background-attachment: fixed;
          font-family: sans-serif;
          padding: 16px;
          box-sizing: border-box;
        }
        .buyer-inner { max-width: 680px; margin: 0 auto; }
        .buyer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(135deg, #1A3C6E, #2E75B6);
          border-radius: 16px;
          padding: 18px 24px;
          margin-bottom: 20px;
          box-shadow: 0 4px 20px rgba(26,60,110,0.2);
        }
        .buyer-title { margin: 0; font-size: 20px; color: #fff; font-family: monospace; }
        .buyer-sub { margin: 4px 0 0; color: #93c5fd; font-size: 12px; }
        .logout-btn {
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 8px;
          padding: 7px 16px;
          cursor: pointer;
          color: #fff;
          font-size: 13px;
          white-space: nowrap;
        }
        .order-list { display: flex; flex-direction: column; gap: 14px; }
        .order-card {
          background: rgba(255,255,255,0.95);
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 2px 12px rgba(26,60,110,0.07);
        }
        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }
        .product-name { font-size: 15px; color: #111827; font-weight: 600; }
        .status-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .order-address { margin: 0 0 8px; font-size: 13px; color: #6b7280; }
        .order-eta {
          margin: 0 0 14px;
          font-size: 13px;
          color: #0369a1;
          background: #f0f9ff;
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #bae6fd;
        }
        .order-delivered {
          margin: 0 0 6px;
          font-size: 13px;
          color: #166534;
          background: #dcfce7;
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #86efac;
        }
        .track-btn {
          background: linear-gradient(135deg, #1A3C6E, #2E75B6);
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: 10px 20px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          width: 100%;
        }
        @media (max-width: 480px) {
          .buyer-header { padding: 14px 16px; }
          .buyer-title { font-size: 17px; }
          .order-card { padding: 16px; }
          .card-top { flex-direction: column; }
        }
      `}</style>

      <div className="buyer-page">
        <div className="buyer-inner">
          <header className="buyer-header">
            <div>
              <h2 className="buyer-title">[ TF ] TrackFast</h2>
              <p className="buyer-sub">Painel do Comprador</p>
            </div>
            <button className="logout-btn" onClick={onLogout}>Sair</button>
          </header>

          <div className="order-list">
            {MOCK_ORDERS.map(order => (
              <div key={order.id} className="order-card">
                <div className="card-top">
                  <span className="product-name">{order.product_name}</span>
                  <span className="status-badge" style={{
                    background: STATUS_COLOR[order.status] + '18',
                    color: STATUS_COLOR[order.status],
                    border: `1px solid ${STATUS_COLOR[order.status]}40`,
                  }}>
                    {STATUS_LABELS[order.status]}
                  </span>
                </div>
                <p className="order-address">📍 {order.dest_address}</p>
                {order.status !== 'delivered'
                  ? <p className="order-eta">⏱ Previsão: <strong>{formatETA(order)}</strong></p>
                  : <p className="order-delivered">✅ Entregue com sucesso!</p>
                }
                {order.status !== 'delivered' && (
                  <button className="track-btn" onClick={() => navigate(`/track/${order.id}`)}>
                    🗺️ Rastrear em tempo real →
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
