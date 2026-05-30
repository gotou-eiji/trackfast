// frontend-web/src/pages/TrackingPage.tsx
import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MOCK_ORDERS, MOCK_DRIVER_START } from '../mockData'

// Corrige ícones padrão do Leaflet com Vite
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

// Componente que recentra o mapa quando o entregador se move
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

  // Simula o entregador se movendo do ponto inicial até o destino
  useEffect(() => {
    if (!order || status === 'delivered') return

    const destLat = order.dest_lat
    const destLng = order.dest_lng
    const totalSteps = 30

    const interval = setInterval(() => {
      stepRef.current += 1
      const progress = Math.min(stepRef.current / totalSteps, 1)

      // Interpolação linear com pequeno ruído para parecer rota real
      const noise = () => (Math.random() - 0.5) * 0.001
      const lat = MOCK_DRIVER_START.lat + (destLat - MOCK_DRIVER_START.lat) * progress + noise()
      const lng = MOCK_DRIVER_START.lng + (destLng - MOCK_DRIVER_START.lng) * progress + noise()

      setDriverPos({ lat, lng })
      setTrail(prev => [...prev, [lat, lng]])

      // Muda status conforme progresso
      if (progress >= 0.3 && status === 'in_transit') setStatus('in_transit')
      if (progress >= 0.75) setStatus('nearby')
      if (progress >= 1) {
        setStatus('delivered')
        clearInterval(interval)
      }
    }, 1500)

    return () => clearInterval(interval)
  }, [order])

  if (!order) return (
    <div style={styles.center}>
      <p>Pedido não encontrado.</p>
      <button style={styles.backBtn} onClick={() => navigate('/')}>← Voltar</button>
    </div>
  )

  const formatETA = () => {
    const f = new Date(order.eta_from).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const t = new Date(order.eta_to).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    return `${f} – ${t} (confiança ${Math.round(order.eta_confidence * 100)}%)`
  }

  const currentStep = STATUS_STEPS.indexOf(status)

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.back} onClick={() => navigate('/')}>← Voltar</button>
        <div style={{ flex: 1 }}>
          <h2 style={styles.title}>{order.product_name}</h2>
          <span style={styles.statusBadge}>{STATUS_LABELS[status]}</span>
        </div>
        <span style={{
          ...styles.dot,
          background: status === 'delivered' ? '#16a34a' : '#22c55e',
          boxShadow: status !== 'delivered' ? '0 0 0 4px #bbf7d0' : 'none'
        }} />
      </div>

      {/* ETA */}
      {status !== 'delivered' ? (
        <div style={styles.etaBar}>
          <span>⏱ Previsão de entrega:</span>
          <strong style={{ marginLeft: 8 }}>{formatETA()}</strong>
        </div>
      ) : (
        <div style={{ ...styles.etaBar, background: '#dcfce7', borderColor: '#86efac', color: '#166534' }}>
          ✅ Pedido entregue com sucesso em {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}!
        </div>
      )}

      {/* Mapa */}
      <div style={styles.mapWrapper}>
        <MapContainer
          center={[driverPos.lat, driverPos.lng]}
          zoom={14}
          style={styles.map}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Destino */}
          <Marker position={[order.dest_lat, order.dest_lng]}>
            <Popup>📍 Destino: {order.dest_address}</Popup>
          </Marker>

          {/* Entregador */}
          {status !== 'delivered' && (
            <Marker position={[driverPos.lat, driverPos.lng]} icon={driverIcon}>
              <Popup>🚴 Entregador em movimento</Popup>
            </Marker>
          )}

          {/* Trilha percorrida */}
          {trail.length > 1 && (
            <Polyline positions={trail} color="#3b82f6" weight={4} opacity={0.6} dashArray="8 4" />
          )}

          <RecenterMap lat={driverPos.lat} lng={driverPos.lng} />
        </MapContainer>
      </div>

      {/* Timeline de status */}
      <div style={styles.timelineWrapper}>
        {STATUS_STEPS.filter(s => s !== 'pending').map((s, i) => {
          const stepIndex = STATUS_STEPS.indexOf(s)
          const done = stepIndex <= currentStep
          const active = stepIndex === currentStep
          return (
            <div key={s} style={styles.timelineStep}>
              <div style={{
                ...styles.circle,
                background: done ? '#1A3C6E' : '#e5e7eb',
                transform: active ? 'scale(1.2)' : 'scale(1)',
                transition: 'all 0.4s ease',
              }}>
                {done ? '✓' : ''}
              </div>
              {i < 3 && <div style={{ ...styles.line, background: done ? '#1A3C6E' : '#e5e7eb' }} />}
              <span style={{ ...styles.stepLabel, color: done ? '#1A3C6E' : '#9ca3af', fontWeight: active ? 700 : 400 }}>
                {STATUS_LABELS[s]?.replace(/^.{2}/, '')}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: 720, margin: '0 auto', padding: 16, fontFamily: 'sans-serif', background: '#f8fafc', minHeight: '100vh' },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 },
  header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, background: '#fff', borderRadius: 14, padding: '14px 18px', border: '1px solid #e5e7eb' },
  back: { background: 'none', border: '1px solid #d1d5db', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13, color: '#374151' },
  backBtn: { background: '#1A3C6E', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer' },
  title: { margin: '0 0 4px', fontSize: 16, color: '#111827' },
  statusBadge: { background: '#dbeafe', color: '#1e40af', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500 },
  dot: { width: 12, height: 12, borderRadius: '50%', flexShrink: 0, transition: 'all 0.4s' },
  etaBar: { background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '10px 16px', marginBottom: 12, fontSize: 13, color: '#0369a1' },
  mapWrapper: { borderRadius: 14, overflow: 'hidden', marginBottom: 16, border: '1px solid #e5e7eb' },
  map: { height: 380, width: '100%' },
  timelineWrapper: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', background: '#fff', borderRadius: 14, padding: '18px 24px', border: '1px solid #e5e7eb' },
  timelineStep: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 },
  circle: { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700 },
  line: { height: 3, width: '80%', position: 'absolute', top: 14, left: '60%', zIndex: 0 },
  stepLabel: { fontSize: 11, textAlign: 'center', maxWidth: 72, lineHeight: 1.3 },
}
