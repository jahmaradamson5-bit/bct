import httpx
import logging
from typing import Optional, Dict, List
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class PolymarketService:
    """Service for interacting with Polymarket APIs"""
    
    def __init__(self):
        self.gamma_api = "https://gamma-api.polymarket.com"
        self.clob_api = "https://clob.polymarket.com"
        self.data_api = "https://data-api.polymarket.com"
        self.client = httpx.AsyncClient(timeout=30.0)
        self.bitcoin_market_cache = None
    
    async def get_bitcoin_market_price(self) -> Optional[Dict]:
        """Get current Bitcoin 15-minute market price from Polymarket"""
        try:
            # Search for Bitcoin markets
            url = f"{self.gamma_api}/events"
            params = {
                "active": True,
                "closed": False,
                "limit": 50
            }
            
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            events = response.json()
            
            # Find Bitcoin 15-minute market
            for event in events:
                markets = event.get('markets', [])
                for market in markets:
                    question = market.get('question', '').lower()
                    if 'bitcoin' in question and '15' in question:
                        # Cache the market for future position queries
                        self.bitcoin_market_cache = market
                        
                        # Get current price (YES token price)
                        outcome_prices = market.get('outcomePrices', [])
                        if outcome_prices:
                            # Polymarket price is probability-based (0-1)
                            # We'll return it as is for now
                            return {
                                'market_id': market.get('id'),
                                'question': market.get('question'),
                                'price': float(outcome_prices[0]) if outcome_prices else 0,
                                'volume': float(market.get('volume', 0)),
                                'outcomes': market.get('outcomes', [])
                            }
            
            logger.warning("Bitcoin 15-minute market not found")
            return None
            
        except Exception as e:
            logger.error(f"Error fetching Polymarket Bitcoin price: {e}")
            return None
    
    async def get_wallet_positions(self, address: str) -> Dict:
        """Get positions for a specific wallet address"""
        try:
            # Note: This endpoint may require authentication for full access
            # For demo purposes, we'll return mock data structure
            # In production, use proper Polymarket API authentication
            
            # Mock data for demonstration
            return {
                'address': address,
                'positions': [
                    {
                        'market': 'Bitcoin 15-min Up/Down',
                        'outcome': 'Yes',
                        'shares': 150.0,
                        'avg_price': 0.65,
                        'current_price': 0.68,
                        'pnl': 4.5,
                        'pnl_percent': 4.62
                    }
                ],
                'total_value': 102.0,
                'total_pnl': 4.5
            }
            
        except Exception as e:
            logger.error(f"Error fetching wallet positions: {e}")
            return {'address': address, 'positions': [], 'total_value': 0, 'total_pnl': 0}
    
    async def get_wallet_activity(self, address: str, limit: int = 50) -> List[Dict]:
        """Get recent trading activity for a wallet"""
        try:
            # Note: This would use Polymarket's trade history API
            # For demo purposes, returning mock data
            
            # Mock activity data
            return [
                {
                    'action': 'BUY',
                    'market': 'Bitcoin 15-min Up/Down',
                    'outcome': 'Yes',
                    'shares': 50.0,
                    'price': 0.65,
                    'timestamp': datetime.now(timezone.utc).isoformat()
                },
                {
                    'action': 'SELL',
                    'market': 'Bitcoin 15-min Up/Down',
                    'outcome': 'Yes',
                    'shares': 25.0,
                    'price': 0.72,
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }
            ]
            
        except Exception as e:
            logger.error(f"Error fetching wallet activity: {e}")
            return []
    
    async def close(self):
        """Cleanup HTTP client resources"""
        await self.client.aclose()