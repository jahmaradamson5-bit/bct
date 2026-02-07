from fastapi import FastAPI, APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone
import socketio
import asyncio
import json

from binance_service import BinanceWebSocketService
from polymarket_service import PolymarketService
from signal_service import SignalGeneratorService

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=True
)

# Global service instances
binance_service: Optional[BinanceWebSocketService] = None
polymarket_service: Optional[PolymarketService] = None
signal_service: Optional[SignalGeneratorService] = None

# Define Models
class Wallet(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    address: str
    label: str
    added_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WalletCreate(BaseModel):
    address: str
    label: str

class Signal(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    signal_type: str  # "BUY" or "SELL"
    confidence: float
    reason: str
    binance_price: float
    polymarket_price: float
    price_delta: float
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WalletActivity(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    wallet_address: str
    action: str  # "BUY" or "SELL"
    amount: float
    price: float
    market: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Socket.IO Events
@sio.event
async def connect(sid, environ):
    logging.info(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    logging.info(f"Client disconnected: {sid}")

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Polymarket Trading Bot API"}

@api_router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "binance_connected": binance_service.connected if binance_service else False,
        "services_initialized": all([binance_service, polymarket_service, signal_service])
    }

# Wallet Management
@api_router.post("/wallets", response_model=Wallet)
async def add_wallet(input: WalletCreate):
    wallet_obj = Wallet(**input.model_dump())
    doc = wallet_obj.model_dump()
    doc['added_at'] = doc['added_at'].isoformat()
    
    await db.wallets.insert_one(doc)
    return wallet_obj

@api_router.get("/wallets", response_model=List[Wallet])
async def get_wallets():
    wallets = await db.wallets.find({}, {"_id": 0}).to_list(1000)
    
    for wallet in wallets:
        if isinstance(wallet['added_at'], str):
            wallet['added_at'] = datetime.fromisoformat(wallet['added_at'])
    
    return wallets

@api_router.delete("/wallets/{wallet_id}")
async def delete_wallet(wallet_id: str):
    result = await db.wallets.delete_one({"id": wallet_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Wallet not found")
    return {"message": "Wallet deleted"}

# Price Data
@api_router.get("/prices/current")
async def get_current_prices():
    if not binance_service or not polymarket_service:
        raise HTTPException(status_code=503, detail="Services not initialized")
    
    binance_price = binance_service.get_latest_price()
    polymarket_data = await polymarket_service.get_bitcoin_market_price()
    
    if binance_price is None:
        raise HTTPException(status_code=503, detail="Binance price not available")
    
    price_delta = 0
    polymarket_price = 0
    
    if polymarket_data:
        polymarket_price = polymarket_data.get('price', 0)
        price_delta = binance_price - polymarket_price
    
    return {
        "binance_price": binance_price,
        "polymarket_price": polymarket_price,
        "price_delta": price_delta,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# Signals
@api_router.get("/signals", response_model=List[Signal])
async def get_signals(limit: int = 20):
    signals = await db.signals.find({}, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    
    for signal in signals:
        if isinstance(signal['timestamp'], str):
            signal['timestamp'] = datetime.fromisoformat(signal['timestamp'])
    
    return signals

@api_router.post("/signals/generate")
async def generate_signal():
    if not signal_service:
        raise HTTPException(status_code=503, detail="Signal service not initialized")
    
    signal = await signal_service.generate_signal()
    
    if signal:
        # Save to database
        doc = signal.model_dump()
        doc['timestamp'] = doc['timestamp'].isoformat()
        await db.signals.insert_one(doc)
        
        # Broadcast to all connected clients
        await sio.emit('new_signal', json.loads(json.dumps(doc, default=str)))
        
        return signal
    else:
        raise HTTPException(status_code=500, detail="Failed to generate signal")

# Wallet Positions
@api_router.get("/wallets/{address}/positions")
async def get_wallet_positions(address: str):
    if not polymarket_service:
        raise HTTPException(status_code=503, detail="Polymarket service not initialized")
    
    positions = await polymarket_service.get_wallet_positions(address)
    return positions

@api_router.get("/wallets/{address}/activity")
async def get_wallet_activity(address: str, limit: int = 50):
    activity = await polymarket_service.get_wallet_activity(address, limit)
    return activity

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Background task for price monitoring and signal generation
async def monitor_prices():
    """Background task to monitor prices and generate signals"""
    while True:
        try:
            if binance_service and polymarket_service and signal_service:
                binance_price = binance_service.get_latest_price()
                
                if binance_price:
                    polymarket_data = await polymarket_service.get_bitcoin_market_price()
                    
                    if polymarket_data:
                        polymarket_price = polymarket_data.get('price', 0)
                        price_delta = binance_price - polymarket_price
                        
                        # Broadcast price updates
                        await sio.emit('price_update', {
                            'binance_price': binance_price,
                            'polymarket_price': polymarket_price,
                            'price_delta': price_delta,
                            'timestamp': datetime.now(timezone.utc).isoformat()
                        })
                        
                        # Auto-generate signal if price delta is significant
                        if abs(price_delta) > 100:  # If delta > $100
                            signal = await signal_service.generate_signal()
                            if signal:
                                doc = signal.model_dump()
                                doc['timestamp'] = doc['timestamp'].isoformat()
                                await db.signals.insert_one(doc)
                                await sio.emit('new_signal', json.loads(json.dumps(doc, default=str)))
            
            await asyncio.sleep(5)  # Check every 5 seconds
        except Exception as e:
            logger.error(f"Error in price monitoring: {e}")
            await asyncio.sleep(5)

@app.on_event("startup")
async def startup():
    global binance_service, polymarket_service, signal_service
    
    logger.info("Starting services...")
    
    # Initialize services
    binance_service = BinanceWebSocketService()
    polymarket_service = PolymarketService()
    signal_service = SignalGeneratorService(binance_service, polymarket_service)
    
    # Start Binance WebSocket in background
    asyncio.create_task(binance_service.connect())
    
    # Start price monitoring
    asyncio.create_task(monitor_prices())
    
    logger.info("Services started successfully")

@app.on_event("shutdown")
async def shutdown_db_client():
    if binance_service:
        await binance_service.disconnect()
    client.close()

# Wrap FastAPI with Socket.IO
socket_app = socketio.ASGIApp(sio, other_asgi_app=app, socketio_path='/api/socket.io')
app = socket_app