// frontend-web/src/pages/TrackingPage.tsx
import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MOCK_ORDERS, MOCK_DRIVER_START } from '../mockData'

import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'
L.Icon.Default.mergeOptions({ iconUrl, shadowUrl: iconShadow })

const driverIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3097/3097144.png',
  iconSize: [38, 38],
  iconAnchor: [19, 38],
})

const STATUS_STEPS = ['pending', 'collected', 'in_transit', 'nearby', 'delivered']
const STATUS_LABELS: Record<string, string> = {
  pending:    '⏳ Aguardando coleta',
  collected:  '📦 Coletado',
  in_transit: '🚚 Em trânsito',
  nearby:     '📍 Entregador próximo!',
  delivered:  '✅ Entregue',
}

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => { map.panTo([lat, lng], { animate: true }) }, [lat, lng])
  return null
}

interface Props { token: string }

export default function TrackingPage({ token: _ }: Props) {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const order = MOCK_ORDERS.find(o => o.id === orderId)

  const [driverPos, setDriverPos] = useState(MOCK_DRIVER_START)
  const [trail, setTrail] = useState<[number, number][]>([[MOCK_DRIVER_START.lat, MOCK_DRIVER_START.lng]])
  const [status, setStatus] = useState(order?.status || 'in_transit')
  const stepRef = useRef(0)

  useEffect(() => {
    if (!order || status === 'delivered') return
    const destLat = order.dest_lat
    const destLng = order.dest_lng
    const totalSteps = 30
    const interval = setInterval(() => {
      stepRef.current += 1
      const progress = Math.min(stepRef.current / totalSteps, 1)
      const noise = () => (Math.random() - 0.5) * 0.001
      const lat = MOCK_DRIVER_START.lat + (destLat - MOCK_DRIVER_START.lat) * progress + noise()
      const lng = MOCK_DRIVER_START.lng + (destLng - MOCK_DRIVER_START.lng) * progress + noise()
      setDriverPos({ lat, lng })
      setTrail(prev => [...prev, [lat, lng]])
      if (progress >= 0.75) setStatus('nearby')
      if (progress >= 1) { setStatus('delivered'); clearInterval(interval) }
    }, 1500)
    return () => clearInterval(interval)
  }, [order])

  if (!order) return (
    <div className="tf-center">
      <p>Pedido não encontrado.</p>
      <button className="tf-back-btn" onClick={() => navigate('/')}>← Voltar</button>
    </div>
  )

  const formatETA = () => {
    const f = new Date(order.eta_from).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const t = new Date(order.eta_to).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    return `${f} – ${t} (confiança ${Math.round(order.eta_confidence * 100)}%)`
  }

  const currentStep = STATUS_STEPS.indexOf(status)

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }

        .tf-page {
          min-height: 100vh;
          background-image: url(/bg-dashboard.svg);
          background-size: cover;
          background-position: center;
          background-attachment: fixed;
          font-family: sans-serif;
          padding: 16px;
        }

        .tf-inner {
          max-width: 720px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        /* ── Header ── */
        .tf-header {
          display: flex;
          align-items: center;
          gap: 12px;
          background: linear-gradient(135deg, #1A3C6E, #2E75B6);
          border-radius: 16px;
          padding: 16px 20px;
          box-shadow: 0 4px 20px rgba(26,60,110,0.2);
        }
        .tf-back {
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 8px;
          padding: 7px 13px;
          cursor: pointer;
          color: #fff;
          font-size: 13px;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .tf-title {
          margin: 0 0 4px;
          font-size: 15px;
          color: #fff;
          font-weight: 600;
          line-height: 1.3;
        }
        .tf-status-badge {
          background: rgba(255,255,255,0.2);
          color: #fff;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          display: inline-block;
        }
        .tf-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
          transition: all 0.4s;
          margin-left: auto;
        }

        /* ── ETA Bar ── */
        .tf-eta {
          background: rgba(255,255,255,0.95);
          border: 1px solid #bae6fd;
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 13px;
          color: #0369a1;
          box-shadow: 0 2px 8px rgba(26,60,110,0.06);
        }
        .tf-eta-delivered {
          background: rgba(255,255,255,0.95);
          border: 1px solid #86efac;
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 13px;
          color: #166534;
          box-shadow: 0 2px 8px rgba(22,163,74,0.08);
        }

        /* ── Map ── */
        .tf-map-wrap {
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid #e5e7eb;
          box-shadow: 0 4px 20px rgba(26,60,110,0.10);
        }
        .tf-map {
          height: clamp(240px, 44vw, 400px);
          width: 100%;
        }

        /* ── Timeline ── */
        .tf-timeline {
          background: rgba(255,255,255,0.95);
          border-radius: 16px;
          padding: 20px 16px 16px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 2px 10px rgba(26,60,110,0.06);
        }
        .tf-timeline-title {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: #9ca3af;
          margin-bottom: 16px;
          font-weight: 600;
        }
        .tf-steps {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          position: relative;
        }
        /* linha conectora de fundo */
        .tf-steps::before {
          content: '';
          position: absolute;
          top: 14px;
          left: 7%;
          right: 7%;
          height: 3px;
          background: #e5e7eb;
          z-index: 0;
          border-radius: 2px;
        }
        .tf-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          flex: 1;
          position: relative;
          z-index: 1;
        }
        .tf-circle {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          transition: all 0.4s ease;
          border: 3px solid #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
        }
        .tf-circle.done  { background: linear-gradient(135deg, #1A3C6E, #2E75B6); }
        .tf-circle.active { background: linear-gradient(135deg, #1A3C6E, #2E75B6); transform: scale(1.25); }
        .tf-circle.pending-step { background: #e5e7eb; }
        .tf-step-label {
          font-size: 10px;
          text-align: center;
          max-width: 68px;
          line-height: 1.4;
          transition: color 0.4s;
        }

        /* ── Info rodapé ── */
        .tf-info {
          background: rgba(255,255,255,0.95);
          border-radius: 12px;
          padding: 14px 18px;
          border: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: #374151;
          box-shadow: 0 2px 8px rgba(26,60,110,0.05);
        }
        .tf-info-icon {
          font-size: 20px;
          flex-shrink: 0;
        }

        /* ── Not found ── */
        .tf-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          gap: 16px;
          font-family: sans-serif;
        }
        .tf-back-btn {
          background: linear-gradient(135deg, #1A3C6E, #2E75B6);
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 10px 20px;
          cursor: pointer;
          font-size: 14px;
        }

        /* ── Mobile ── */
        @media (max-width: 480px) {
          .tf-page { padding: 10px; }
          .tf-header { padding: 13px 14px; gap: 10px; }
          .tf-title { font-size: 14px; }
          .tf-step-label { font-size: 9px; max-width: 56px; }
          .tf-circle { width: 26px; height: 26px; font-size: 11px; }
          .tf-steps::before { top: 12px; }
          .tf-eta, .tf-eta-delivered { font-size: 12px; padding: 10px 14px; }
          .tf-timeline { padding: 16px 10px 14px; }
        }
      `}</style>

      <div className="tf-page">
        <div className="tf-inner">

          {/* Header */}
          <div className="tf-header">
            <button className="tf-back" onClick={() => navigate('/')}>← Voltar</button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 className="tf-title">{order.product_name}</h2>
              <span className="tf-status-badge">{STATUS_LABELS[status]}</span>
            </div>
            <span className="tf-dot" style={{
              background: status === 'delivered' ? '#16a34a' : '#22c55e',
              boxShadow: status !== 'delivered' ? '0 0 0 4px rgba(34,197,94,0.3)' : 'none',
            }} />
          </div>

          {/* ETA */}
          {status !== 'delivered' ? (
            <div className="tf-eta">
              ⏱ <strong>Previsão de entrega:</strong> {formatETA()}
            </div>
          ) : (
            <div className="tf-eta-delivered">
              ✅ <strong>Entregue com sucesso</strong> às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}!
            </div>
          )}

          {/* Mapa */}
          <div className="tf-map-wrap">
            <MapContainer center={[driverPos.lat, driverPos.lng]} zoom={14} className="tf-map" zoomControl={true}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[order.dest_lat, order.dest_lng]}>
                <Popup>📍 Destino: {order.dest_address}</Popup>
              </Marker>
              {status !== 'delivered' && (
                <Marker position={[driverPos.lat, driverPos.lng]} icon={driverIcon}>
                  <Popup>🚴 Entregador em movimento</Popup>
                </Marker>
              )}
              {trail.length > 1 && (
                <Polyline positions={trail} color="#2E75B6" weight={4} opacity={0.65} dashArray="8 4" />
              )}
              <RecenterMap lat={driverPos.lat} lng={driverPos.lng} />
            </MapContainer>
          </div>

          {/* Timeline */}
          <div className="tf-timeline">
            <p className="tf-timeline-title">Progresso da entrega</p>
            <div className="tf-steps">
              {STATUS_STEPS.filter(s => s !== 'pending').map((s) => {
                const stepIndex = STATUS_STEPS.indexOf(s)
                const done   = stepIndex < currentStep
                const active = stepIndex === currentStep
                return (
                  <div key={s} className="tf-step">
                    <div className={`tf-circle ${active ? 'active' : done ? 'done' : 'pending-step'}`}>
                      {done || active ? '✓' : ''}
                    </div>
                    <span className="tf-step-label" style={{ color: done || active ? '#1A3C6E' : '#9ca3af', fontWeight: active ? 700 : 400 }}>
                      {STATUS_LABELS[s]?.slice(2)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Info rodapé */}
          <div className="tf-info">
            <span className="tf-info-icon">📍</span>
            <span><strong>Destino:</strong> {order.dest_address}</span>
          </div>

        </div>
      </div>
    </>
  )
}
