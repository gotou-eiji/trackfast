// frontend-web/src/mockData.ts

export interface Order {
  id: string
  product_name: string
  status: string
  dest_address: string
  dest_lat: number
  dest_lng: number
  buyer_id: string
  seller_id: string
  eta_from: string
  eta_to: string
  eta_confidence: number
  created_at: string
}

// Posição inicial do entregador (próxima à origem)
export const MOCK_DRIVER_START = { lat: -23.4210, lng: -51.9330 }

// Destino do pedido (Maringá - PR)
export const MOCK_ORDERS: Order[] = [
  {
    id: "pedido-001",
    product_name: "Tênis Nike Air Max 270",
    status: "in_transit",
    dest_address: "Av. Brasil, 1500 - Zona 01, Maringá - PR",
    dest_lat: -23.4253,
    dest_lng: -51.9386,
    buyer_id: "buyer-123",
    seller_id: "seller-456",
    eta_from: new Date(Date.now() + 25 * 60000).toISOString(),
    eta_to:   new Date(Date.now() + 55 * 60000).toISOString(),
    eta_confidence: 0.87,
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: "pedido-002",
    product_name: "Fone Sony WH-1000XM5",
    status: "collected",
    dest_address: "Rua Pioneiro, 320 - Vila Operária, Maringá - PR",
    dest_lat: -23.4180,
    dest_lng: -51.9450,
    buyer_id: "buyer-123",
    seller_id: "seller-456",
    eta_from: new Date(Date.now() + 90 * 60000).toISOString(),
    eta_to:   new Date(Date.now() + 130 * 60000).toISOString(),
    eta_confidence: 0.72,
    created_at: new Date(Date.now() - 1 * 3600000).toISOString(),
  },
  {
    id: "pedido-003",
    product_name: "Cadeira Gamer ThunderX3",
    status: "delivered",
    dest_address: "Rua das Orquídeas, 88 - Jardim Alvorada, Maringá - PR",
    dest_lat: -23.4300,
    dest_lng: -51.9280,
    buyer_id: "buyer-123",
    seller_id: "seller-456",
    eta_from: new Date(Date.now() - 60 * 60000).toISOString(),
    eta_to:   new Date(Date.now() - 30 * 60000).toISOString(),
    eta_confidence: 0.91,
    created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
]
