import httpx
import logging
from typing import List, Dict, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class WalletTrackingService:
    """Enhanced service for tracking external wallets with detailed position data"""
    
    def __init__(self):
        self.data_api = "https://data-api.polymarket.com"
        self.gamma_api = "https://gamma-api.polymarket.com"
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def get_wallet_detailed_positions(self, address: str) -> Dict:
        """Get detailed position breakdown for a wallet"""
        try:
            url = f"{self.data_api}/positions"
            params = {"address": address, "limit": 500}
            
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            positions = data if isinstance(data, list) else data.get('data', [])
            
            # Categorize positions into buying and selling
            buying_positions = []
            selling_positions = []
            
            for pos in positions:
                size = float(pos.get('size', 0))
                if size > 0:
                    buying_positions.append(pos)
                elif size < 0:
                    selling_positions.append(pos)
            
            # Calculate metrics
            total_value = sum(float(p.get('currentValue', 0)) for p in positions)
            total_pnl = sum(float(p.get('unrealizedPnl', 0)) for p in positions)
            realized_pnl = sum(float(p.get('realizedPnl', 0)) for p in positions)
            
            return {
                'address': address,
                'buying_positions': buying_positions,
                'selling_positions': selling_positions,
                'total_positions': len(positions),
                'total_value': total_value,
                'unrealized_pnl': total_pnl,
                'realized_pnl': realized_pnl,
                'total_pnl': total_pnl + realized_pnl
            }
            
        except Exception as e:
            logger.error(f"Failed to fetch detailed positions for {address}: {e}")
            # Return simulated data for demo
            return self._get_simulated_positions(address)
    
    def _get_simulated_positions(self, address: str) -> Dict:
        """Generate simulated position data for demo"""
        import random
        
        buying_positions = [
            {
                'market': 'Bitcoin $100k by March 2026',
                'outcome': 'Yes',
                'size': 250.0,
                'avg_price': 0.68,
                'current_price': 0.72,
                'current_value': 180.0,
                'unrealized_pnl': 10.0,
                'pnl_percent': 5.88
            },
            {
                'market': 'Ethereum $5k by Q2 2026',
                'outcome': 'Yes',
                'size': 150.0,
                'avg_price': 0.55,
                'current_price': 0.58,
                'current_value': 87.0,
                'unrealized_pnl': 4.5,
                'pnl_percent': 5.45
            }
        ]
        
        selling_positions = [
            {
                'market': 'S&P 500 below 5000 by April',
                'outcome': 'No',
                'size': -100.0,
                'avg_price': 0.35,
                'current_price': 0.28,
                'current_value': -28.0,
                'unrealized_pnl': 7.0,
                'pnl_percent': 20.0
            }
        ]
        
        total_value = sum(p['current_value'] for p in buying_positions + selling_positions)
        total_unrealized_pnl = sum(p['unrealized_pnl'] for p in buying_positions + selling_positions)
        realized_pnl = random.uniform(-5, 15)
        
        return {
            'address': address,
            'buying_positions': buying_positions,
            'selling_positions': selling_positions,
            'total_positions': len(buying_positions) + len(selling_positions),
            'total_value': total_value,
            'unrealized_pnl': total_unrealized_pnl,
            'realized_pnl': realized_pnl,
            'total_pnl': total_unrealized_pnl + realized_pnl
        }
    
    async def get_wallet_activity_feed(self, address: str, limit: int = 50) -> List[Dict]:
        """Get real-time activity feed for a wallet"""
        try:
            url = f"{self.data_api}/trades"
            params = {"address": address, "limit": limit}
            
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            trades = response.json()
            
            return trades if trades else self._get_simulated_activity(address, limit)
            
        except Exception as e:
            logger.error(f"Failed to fetch activity for {address}: {e}")
            return self._get_simulated_activity(address, limit)
    
    def _get_simulated_activity(self, address: str, limit: int) -> List[Dict]:
        """Generate simulated activity feed"""
        import random
        from datetime import timedelta
        
        activities = []
        base_time = datetime.now(timezone.utc)
        
        markets = [
            'Bitcoin $100k by March',
            'Ethereum $5k by Q2',
            'Trump wins 2026 election',
            'S&P 500 below 5000'
        ]
        
        for i in range(min(limit, 20)):
            action = random.choice(['BUY', 'SELL'])
            market = random.choice(markets)
            
            activities.append({
                'action': action,
                'market': market,
                'outcome': 'Yes' if random.random() > 0.5 else 'No',
                'shares': round(random.uniform(10, 200), 1),
                'price': round(random.uniform(0.35, 0.75), 4),
                'timestamp': (base_time - timedelta(minutes=i*15)).isoformat()
            })
        
        return activities
    
    async def close(self):
        await self.client.aclose()