# prediction-service/main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import datetime, timedelta
import math
import random

app = FastAPI(title="TrackFast Prediction Service", version="1.0.0")

# ── Modelo de Input ────────────────────────────────────────────
class PredictionRequest(BaseModel):
    order_id: str
    origin_lat: float
    origin_lng: float
    dest_lat: float
    dest_lng: float
    carrier: str = "default"          # transportadora
    hour_of_day: int | None = None    # 0-23; None = usa hora atual
    day_of_week: int | None = None    # 0=seg, 6=dom; None = usa dia atual

class PredictionResponse(BaseModel):
    order_id: str
    eta_from: str         # ISO 8601
    eta_to: str           # ISO 8601
    confidence: float     # 0.0 - 1.0
    estimated_minutes: int
    distance_km: float

# ── Utilitários ────────────────────────────────────────────────
def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calcula distância em km entre dois pontos GPS."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
    return R * 2 * math.asin(math.sqrt(a))

# Fator de tráfego por hora do dia (0 = madrugada, 8 = pico manhã, 17 = pico tarde)
TRAFFIC_FACTOR = {
    0: 1.0, 1: 1.0, 2: 1.0, 3: 1.0, 4: 1.0, 5: 1.1,
    6: 1.2, 7: 1.5, 8: 1.8, 9: 1.6, 10: 1.3, 11: 1.2,
    12: 1.4, 13: 1.3, 14: 1.2, 15: 1.3, 16: 1.5, 17: 1.9,
    18: 1.8, 19: 1.6, 20: 1.4, 21: 1.2, 22: 1.1, 23: 1.0,
}

# SLA histórico por transportadora (velocidade média km/h e variância)
CARRIER_PROFILE = {
    "jadlog":    {"avg_speed": 32, "variance": 0.12},
    "correios":  {"avg_speed": 25, "variance": 0.20},
    "total":     {"avg_speed": 35, "variance": 0.10},
    "sequoia":   {"avg_speed": 38, "variance": 0.08},
    "default":   {"avg_speed": 30, "variance": 0.15},
}

def predict_eta(
    origin_lat, origin_lng, dest_lat, dest_lng,
    carrier="default", hour=None, dow=None
) -> dict:
    now = datetime.now()
    hour = hour if hour is not None else now.hour
    dow = dow if dow is not None else now.weekday()

    distance_km = haversine_km(origin_lat, origin_lng, dest_lat, dest_lng)

    profile = CARRIER_PROFILE.get(carrier.lower(), CARRIER_PROFILE["default"])
    traffic = TRAFFIC_FACTOR.get(hour, 1.0)

    # Velocidade efetiva considerando tráfego
    effective_speed = profile["avg_speed"] / traffic

    # Tempo base em minutos (com fator de rota urbana ~1.4x distância em linha reta)
    base_minutes = (distance_km * 1.4 / effective_speed) * 60

    # Adiciona paradas estimadas (média de 3 min por entrega anterior)
    stops_penalty = random.randint(1, 5) * 3  # em produção: usar posição real do entregador

    total_minutes = base_minutes + stops_penalty

    # Janela de confiança baseada na variância da transportadora
    variance = profile["variance"]
    window_minutes = int(total_minutes * variance) + 10  # mínimo 10 min de janela

    # Confiança inversamente proporcional à variância e ao tráfego
    confidence = max(0.60, min(0.95, 1 - variance - (traffic - 1) * 0.1))

    eta_from = now + timedelta(minutes=total_minutes - window_minutes / 2)
    eta_to   = now + timedelta(minutes=total_minutes + window_minutes / 2)

    return {
        "eta_from": eta_from.isoformat(),
        "eta_to":   eta_to.isoformat(),
        "confidence": round(confidence, 2),
        "estimated_minutes": int(total_minutes),
        "distance_km": round(distance_km, 2),
    }

# ── Endpoints ─────────────────────────────────────────────────

@app.post("/predict", response_model=PredictionResponse)
def predict(req: PredictionRequest):
    try:
        result = predict_eta(
            req.origin_lat, req.origin_lng,
            req.dest_lat, req.dest_lng,
            req.carrier, req.hour_of_day, req.day_of_week
        )
        return PredictionResponse(order_id=req.order_id, **result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health():
    return {"status": "ok", "model": "heuristic-v1"}

# ── Rodar localmente ──────────────────────────────────────────
# uvicorn main:app --reload --port 8000
