// frontend-web/src/pages/TrackingPage.tsx
import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import { io, Socket } from 'socket.io-client'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001'
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// Ícone customizado do entregador
const driverIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3097/3097144.png',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
})

const STATUS_LABELS: Record<string, string> = {
  pending:    '⏳ Aguardando coleta',
  collected:  '📦 Coletado',
  in_transit: '🚚 Em trânsito',
  nearby:     '📍 Entregador próximo!',
  delivered:  '✅ Entregue',
  failed:     '⚠️ Tentativa falhou',
}

interface GPSPosition {
  lat: number
  lng: number
  timestamp: string
}

interface Order {
  id: string
  product_name: string
  status: string
  dest_lat: number
  dest_lng: number
  dest_address: string
  eta_from?: string
  eta_to?: string
  eta_confidence?: number
}

interface Props { token: string }

export default function TrackingPage({ token }: Props) {
  const { orderId } = useParams<{ orderId: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [position, setPosition] = useState<GPSPosition | null>(null)
  const [trail, setTrail] = useState<[number, number][]>([])
  const [connected, setConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)

  // Busca dados do pedido
  useEffect(() => {
    fetch(`${API_URL}/api/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(setOrder)
  }, [orderId, token])

  // Conecta WebSocket e escuta GPS
  useEffect(() => {
    if (!orderId) return
    const socket = io(WS_URL, { transports: ['websocket'] })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('buyer:watch', { orderId })
    })

    socket.on('disconnect', () => setConnected(false))

    socket.on('gps:update', (data: GPSPosition) => {
      setPosition(data)
      setTrail(prev => [...prev.slice(-49), [data.lat, data.lng]]) // últimos 50 pontos
    })

    socket.on('delivery:confirmed', () => {
      setOrder(prev => prev ? { ...prev, status: 'delivered' } : prev)
    })

    return () => { socket.disconnect() }
  }, [orderId])

  if (!order) return (
    <div style={styles.loading}>
      <p>Carregando pedido...</p>
    </div>
  )

  const center: [number, number] = position
    ? [position.lat, position.lng]
    : [order.dest_lat, order.dest_lng]

  const formatETA = () => {
    if (!order.eta_from || !order.eta_to) return 'Calculando...'
    const from = new Date(order.eta_from).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const to = new Date(order.eta_to).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const conf = order.eta_confidence ? `${Math.round(order.eta_confidence * 100)}%` : ''
    return `${from} – ${to} ${conf ? `(confiança ${conf})` : ''}`
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>{order.product_name}</h2>
        <span style={styles.badge}>{STATUS_LABELS[order.status] || order.status}</span>
        <span style={{ ...styles.dot, background: connected ? '#22c55e' : '#ef4444' }} />
      </div>

      {/* ETA */}
      <div style={styles.etaBar}>
        <span style={styles.etaLabel}>⏱ Previsão de entrega:</span>
        <strong>{formatETA()}</strong>
      </div>

      {/* Mapa */}
      <div style={styles.mapWrapper}>
        <MapContainer center={center} zoom={14} style={styles.map}>
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Destino */}
          <Marker position={[order.dest_lat, order.dest_lng]}>
            <Popup>📍 {order.dest_address}</Popup>
          </Marker>

          {/* Entregador */}
          {position && (
            <Marker position={[position.lat, position.lng]} icon={driverIcon}>
              <Popup>🚴 Entregador</Popup>
            </Marker>
          )}

          {/* Trilha do percurso */}
          {trail.length > 1 && (
            <Polyline positions={trail} color="#3b82f6" weight={3} opacity={0.7} />
          )}
        </MapContainer>
      </div>

      {/* Timeline de status */}
      <div style={styles.timeline}>
        {['pending', 'collected', 'in_transit', 'nearby', 'delivered'].map((s, i) => {
          const statuses = ['pending', 'collected', 'in_transit', 'nearby', 'delivered']
          const current = statuses.indexOf(order.status)
          const done = i <= current
          return (
            <div key={s} style={styles.timelineStep}>
              <div style={{ ...styles.dot2, background: done ? '#3b82f6' : '#d1d5db' }} />
              <span style={{ ...styles.stepLabel, color: done ? '#1e40af' : '#9ca3af' }}>
                {STATUS_LABELS[s]}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: 700, margin: '0 auto', padding: 16, fontFamily: 'sans-serif' },
  loading: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' },
  header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 },
  title: { margin: 0, fontSize: 20, flex: 1 },
  badge: { background: '#dbeafe', color: '#1e40af', padding: '4px 10px', borderRadius: 20, fontSize: 13 },
  dot: { width: 10, height: 10, borderRadius: '50%', display: 'inline-block' },
  etaBar: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 14px', marginBottom: 12, fontSize: 14 },
  etaLabel: { marginRight: 8, color: '#166534' },
  mapWrapper: { borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  map: { height: 380, width: '100%' },
  timeline: { display: 'flex', justifyContent: 'space-between', padding: '0 8px' },
  timelineStep: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  dot2: { width: 14, height: 14, borderRadius: '50%' },
  stepLabel: { fontSize: 11, textAlign: 'center', maxWidth: 70 },
}
