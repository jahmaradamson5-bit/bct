import logging
import os
from typing import Optional, Dict, List
from py_clob_client.client import ClobClient
from py_clob_client.clob_types import OrderArgs, OrderType
from py_clob_client.order_builder.constants import BUY, SELL
from datetime import datetime, timezone
import httpx

logger = logging.getLogger(__name__)

class PolymarketTradingService:
    """Service for automated trading on Polymarket"""
    
    def __init__(self):
        self.client: Optional[ClobClient] = None
        self.api_credentials = None
        self.connected = False
        self.user_address = None
        self.data_api = "https://data-api.polymarket.com"
        self.http_client = httpx.AsyncClient(timeout=30.0)
    
    async def connect_account(self, private_key: str, proxy_address: str, signature_type: int = 0):
        """Connect Polymarket account with private key"""
        try:
            self.client = ClobClient(
                host="https://clob.polymarket.com",
                key=private_key,
                chain_id=137,
                signature_type=signature_type,
                funder=proxy_address
            )
            
            # Derive L2 API credentials
            self.api_credentials = self.client.create_or_derive_api_creds()
            self.client.set_api_creds(self.api_credentials)
            self.user_address = proxy_address
            self.connected = True
            
            logger.info(f"Polymarket account connected: {proxy_address}")
            return {
                "success": True,
                "address": proxy_address,
                "message": "Account connected successfully"
            }
            
        except Exception as e:
            logger.error(f"Failed to connect account: {e}")
            self.connected = False
            return {
                "success": False,
                "error": str(e)
            }
    
    def is_connected(self) -> bool:
        return self.connected and self.client is not None
    
    async def place_market_order(self, token_id: str, side: str, size: float) -> Dict:
        """Place a market order (immediate execution)"""
        if not self.is_connected():
            return {"success": False, "error": "Account not connected"}
        
        try:
            # Market orders use aggressive pricing to ensure execution
            price = 0.99 if side == "BUY" else 0.01
            
            order_args = OrderArgs(
                price=price,
                size=size,
                side=BUY if side == "BUY" else SELL,
                token_id=token_id
            )
            
            signed_order = self.client.create_order(order_args)
            response = self.client.post_order(signed_order, OrderType.FOK)  # Fill-or-Kill
            
            logger.info(f"Market order placed: {response}")
            return {
                "success": True,
                "order_id": response.get('orderID'),
                "status": response.get('status'),
                "side": side,
                "size": size,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Market order failed: {e}")
            return {"success": False, "error": str(e)}
    
    async def place_limit_order(self, token_id: str, side: str, price: float, size: float) -> Dict:
        """Place a limit order"""
        if not self.is_connected():
            return {"success": False, "error": "Account not connected"}
        
        try:
            order_args = OrderArgs(
                price=price,
                size=size,
                side=BUY if side == "BUY" else SELL,
                token_id=token_id
            )
            
            signed_order = self.client.create_order(order_args)
            response = self.client.post_order(signed_order, OrderType.GTC)  # Good-Till-Cancelled
            
            logger.info(f"Limit order placed: {response}")
            return {
                "success": True,
                "order_id": response.get('orderID'),
                "status": response.get('status'),
                "side": side,
                "price": price,
                "size": size,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Limit order failed: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_open_orders(self) -> List[Dict]:
        """Get all open orders for connected account"""
        if not self.is_connected():
            return []
        
        try:
            from py_clob_client.clob_types import OpenOrderParams
            orders = self.client.get_orders(OpenOrderParams())
            return orders if orders else []
        except Exception as e:
            logger.error(f"Failed to fetch open orders: {e}")
            return []
    
    async def cancel_order(self, order_id: str) -> Dict:
        """Cancel a specific order"""
        if not self.is_connected():
            return {"success": False, "error": "Account not connected"}
        
        try:
            response = self.client.cancel(order_id)
            logger.info(f"Order cancelled: {order_id}")
            return {"success": True, "order_id": order_id}
        except Exception as e:
            logger.error(f"Failed to cancel order: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_account_positions(self) -> List[Dict]:
        """Get all positions for connected account"""
        if not self.user_address:
            return []
        
        try:
            url = f"{self.data_api}/positions"
            params = {"address": self.user_address, "limit": 500}
            
            response = await self.http_client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            positions = data if isinstance(data, list) else data.get('data', [])
            return positions
            
        except Exception as e:
            logger.error(f"Failed to fetch positions: {e}")
            return []
    
    async def get_trade_history(self, limit: int = 100) -> List[Dict]:
        """Get trade history for connected account"""
        if not self.user_address:
            return []
        
        try:
            url = f"{self.data_api}/trades"
            params = {"address": self.user_address, "limit": limit}
            
            response = await self.http_client.get(url, params=params)
            response.raise_for_status()
            return response.json()
            
        except Exception as e:
            logger.error(f"Failed to fetch trade history: {e}")
            return []
    
    async def close(self):
        await self.http_client.aclose()
        self.connected = False