import logging
import os
from typing import Optional
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage
from pydantic import BaseModel
import json

logger = logging.getLogger(__name__)

class Signal(BaseModel):
    id: str
    signal_type: str
    confidence: float
    reason: str
    binance_price: float
    polymarket_price: float
    price_delta: float
    timestamp: datetime

class SignalGeneratorService:
    """Service for generating AI-powered trading signals"""
    
    def __init__(self, binance_service, polymarket_service):
        self.binance_service = binance_service
        self.polymarket_service = polymarket_service
        
        # Initialize OpenAI GPT-5.2 via Emergent LLM key
        api_key = os.getenv('EMERGENT_LLM_KEY')
        if not api_key:
            logger.error("EMERGENT_LLM_KEY not found in environment")
        
        self.llm = LlmChat(
            api_key=api_key,
            session_id="polymarket-signals",
            system_message="""You are an expert cryptocurrency trading analyst specializing in Polymarket prediction markets.
Your task is to analyze Bitcoin price data from Binance (real-time spot price) and Polymarket (15-minute prediction market price) to identify front-running opportunities.

Provide trading signals in the following JSON format:
{
  "signal_type": "BUY" or "SELL",
  "confidence": 0.0-1.0,
  "reason": "Brief explanation of the opportunity"
}

Consider:
- Price delta between Binance and Polymarket
- Market momentum
- Arbitrage opportunities
- Risk factors

Be concise and actionable."""
        )
        self.llm.with_model("openai", "gpt-5.2")
    
    async def generate_signal(self) -> Optional[Signal]:
        """Generate a trading signal based on current market data"""
        try:
            # Get current prices
            binance_price = self.binance_service.get_latest_price()
            polymarket_data = await self.polymarket_service.get_bitcoin_market_price()
            
            if not binance_price or not polymarket_data:
                logger.warning("Insufficient data to generate signal")
                return None
            
            polymarket_price = polymarket_data.get('price', 0)
            price_delta = binance_price - polymarket_price
            
            # Create analysis prompt
            prompt = f"""Current Market Data:
- Binance BTC/USDT Spot Price: ${binance_price:,.2f}
- Polymarket 15-min Market Price: ${polymarket_price:.4f} (probability-based)
- Price Delta: ${price_delta:,.2f}
- Polymarket Volume: ${polymarket_data.get('volume', 0):,.2f}

Analyze this data and provide a trading signal for the Polymarket Bitcoin 15-minute market.
Respond ONLY with valid JSON, no additional text."""
            
            message = UserMessage(text=prompt)
            response = await self.llm.send_message(message)
            
            # Parse AI response
            try:
                # Extract JSON from response
                response_text = response.strip()
                if '```json' in response_text:
                    response_text = response_text.split('```json')[1].split('```')[0].strip()
                elif '```' in response_text:
                    response_text = response_text.split('```')[1].split('```')[0].strip()
                
                signal_data = json.loads(response_text)
                
                import uuid
                signal = Signal(
                    id=str(uuid.uuid4()),
                    signal_type=signal_data['signal_type'],
                    confidence=float(signal_data['confidence']),
                    reason=signal_data['reason'],
                    binance_price=binance_price,
                    polymarket_price=polymarket_price,
                    price_delta=price_delta,
                    timestamp=datetime.now(timezone.utc)
                )
                
                logger.info(f"Generated signal: {signal.signal_type} (confidence: {signal.confidence})")
                return signal
                
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse AI response as JSON: {e}")
                logger.error(f"Response: {response}")
                return None
            
        except Exception as e:
            logger.error(f"Error generating signal: {e}")
            return None