import asyncio
import logging
import random
from typing import Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class BinanceWebSocketService:
    """Service for simulated Bitcoin price (Binance geo-restricted)"""
    
    def __init__(self):
        # Start with a realistic Bitcoin price
        self.latest_price: Optional[float] = 98750.00
        self.last_update: Optional[datetime] = None
        self.connected = False
    
    async def connect(self):
        """Start simulating price updates"""
        self.connected = True
        logger.info("Starting Bitcoin price simulator (Binance API restricted)")
        
        while self.connected:
            try:
                # Simulate realistic price movement
                change = random.uniform(-150, 150)
                self.latest_price += change
                self.latest_price = max(95000, min(102000, self.latest_price))  # Keep in reasonable range
                
                self.last_update = datetime.now(timezone.utc)
                logger.debug(f"BTC Price (simulated): ${self.latest_price:.2f}")
                
                await asyncio.sleep(2)  # Update every 2 seconds
                
            except Exception as e:
                logger.error(f"Error in price simulation: {e}")
                await asyncio.sleep(5)
    
    def get_latest_price(self) -> Optional[float]:
        """Get the most recent Bitcoin price"""
        return self.latest_price
    
    async def disconnect(self):
        """Stop simulation"""
        self.connected = False
        logger.info("Bitcoin price simulator stopped")
