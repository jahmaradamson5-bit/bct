import asyncio
import json
import logging
import websockets
from typing import Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class BinanceWebSocketService:
    """Service for real-time Bitcoin price from Binance WebSocket"""
    
    def __init__(self):
        self.uri = "wss://stream.binance.com:9443/ws/btcusdt@trade"
        self.websocket = None
        self.latest_price: Optional[float] = None
        self.last_update: Optional[datetime] = None
        self.connected = False
    
    async def connect(self):
        """Connect to Binance WebSocket with auto-reconnect"""
        reconnect_delay = 1
        max_reconnect_delay = 60
        
        while True:
            try:
                logger.info(f"Connecting to Binance WebSocket: {self.uri}")
                self.websocket = await websockets.connect(self.uri)
                self.connected = True
                logger.info("Binance WebSocket connected")
                
                reconnect_delay = 1  # Reset on successful connection
                
                # Listen for messages
                await self._listen()
                
            except Exception as e:
                self.connected = False
                logger.error(f"Binance WebSocket error: {e}")
                await asyncio.sleep(reconnect_delay)
                reconnect_delay = min(reconnect_delay * 2, max_reconnect_delay)
    
    async def _listen(self):
        """Listen for incoming price updates"""
        try:
            async for message in self.websocket:
                data = json.loads(message)
                
                # Binance trade stream format
                if 'p' in data:  # 'p' is the price field
                    self.latest_price = float(data['p'])
                    self.last_update = datetime.now(timezone.utc)
                    logger.debug(f"BTC Price: ${self.latest_price:.2f}")
                    
        except asyncio.CancelledError:
            logger.info("Binance WebSocket listener cancelled")
            raise
        except Exception as e:
            logger.error(f"Error in Binance WebSocket listener: {e}")
    
    def get_latest_price(self) -> Optional[float]:
        """Get the most recent Bitcoin price"""
        return self.latest_price
    
    async def disconnect(self):
        """Close WebSocket connection"""
        self.connected = False
        if self.websocket:
            await self.websocket.close()
            logger.info("Binance WebSocket disconnected")