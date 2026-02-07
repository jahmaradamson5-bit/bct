import asyncio
import json
import logging
import httpx
from typing import Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class BinanceWebSocketService:
    """Service for real-time Bitcoin price from Binance REST API (Fallback)"""
    
    def __init__(self):
        self.api_url = "https://api.binance.com/api/v3/ticker/price"
        self.symbol = "BTCUSDT"
        self.client = httpx.AsyncClient(timeout=10.0)
        self.latest_price: Optional[float] = None
        self.last_update: Optional[datetime] = None
        self.connected = False
        self.polling_task = None
    
    async def connect(self):
        """Start polling Binance REST API for price updates"""
        self.connected = True
        logger.info("Starting Binance price polling service")
        
        while self.connected:
            try:
                await self._fetch_price()
                await asyncio.sleep(2)  # Poll every 2 seconds
            except Exception as e:
                logger.error(f"Error fetching Binance price: {e}")
                await asyncio.sleep(5)
    
    async def _fetch_price(self):
        """Fetch current Bitcoin price from Binance REST API"""
        try:
            response = await self.client.get(self.api_url, params={"symbol": self.symbol})
            response.raise_for_status()
            data = response.json()
            
            self.latest_price = float(data['price'])
            self.last_update = datetime.now(timezone.utc)
            logger.debug(f"BTC Price: ${self.latest_price:.2f}")
            
        except Exception as e:
            logger.error(f"Error in Binance price fetch: {e}")
    
    def get_latest_price(self) -> Optional[float]:
        """Get the most recent Bitcoin price"""
        return self.latest_price
    
    async def disconnect(self):
        """Stop polling"""
        self.connected = False
        await self.client.aclose()
        logger.info("Binance price service stopped")
