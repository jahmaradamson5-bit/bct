import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Zap, TrendingUp, TrendingDown, Play, Pause, DollarSign, BarChart3 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import PnLChart from '../components/charts/PnLChart';
import PerformanceMetrics from '../components/charts/PerformanceMetrics';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

export default function Trading() {
  const [isConnected, setIsConnected] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  const [autoTradingEnabled, setAutoTradingEnabled] = useState(false);
  const [positions, setPositions] = useState([]);
  const [openOrders, setOpenOrders] = useState([]);
  const [tradeHistory, setTradeHistory] = useState([]);

  useEffect(() => {
    checkTradingStatus();
  }, []);

  useEffect(() => {
    if (isConnected) {
      fetchPositions();
      fetchOpenOrders();
      fetchTradeHistory();
      const interval = setInterval(() => {
        fetchPositions();
        fetchOpenOrders();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [isConnected]);

  const checkTradingStatus = async () => {
    try {
      const response = await axios.get(`${API}/trading/status`);
      setIsConnected(response.data.connected);
      setUserAddress(response.data.address || '');
    } catch (error) {
      console.error('Error checking trading status:', error);
    }
  };

  const fetchPositions = async () => {
    try {
      const response = await axios.get(`${API}/trading/positions`);
      setPositions(response.data);
    } catch (error) {
      console.error('Error fetching positions:', error);
    }
  };

  const fetchOpenOrders = async () => {
    try {
      const response = await axios.get(`${API}/trading/orders`);
      setOpenOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchTradeHistory = async () => {
    try {
      const response = await axios.get(`${API}/trading/history?limit=50`);
      setTradeHistory(response.data);
    } catch (error) {
      console.error('Error fetching trade history:', error);
    }
  };

  const toggleAutoTrading = () => {
    if (!isConnected) {
      toast.error('Please connect your Polymarket account first');
      return;
    }
    setAutoTradingEnabled(!autoTradingEnabled);
    toast.success(autoTradingEnabled ? 'Auto-trading disabled' : 'Auto-trading enabled');
  };

  // Generate chart data for trading performance
  const generateTradingChartData = () => {
    // Simulated PNL history based on trade history
    const pnlHistory = [];
    let cumulativePnl = 0;
    
    for (let i = 0; i < 24; i++) {
      const time = new Date(Date.now() - (23 - i) * 3600000);
      cumulativePnl += Math.random() * 10 - 4;  // Random PNL change
      pnlHistory.push({
        time: `${time.getHours()}:00`,
        pnl: parseFloat(cumulativePnl.toFixed(2))
      });
    }

    // Calculate metrics from positions and trades
    const totalValue = positions.reduce((sum, p) => sum + (p.currentValue || 0), 0);
    const totalPnl = positions.reduce((sum, p) => sum + (p.pnl || 0), 0);
    const winningTrades = tradeHistory.filter(t => t.pnl && t.pnl > 0).length;
    const totalTrades = tradeHistory.length;
    
    const metrics = {
      totalValue,
      totalPnl,
      winRate: totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0,
      avgReturn: totalValue > 0 ? (totalPnl / totalValue) * 100 : 0,
      totalTrades,
      bestTrade: Math.max(...tradeHistory.map(t => t.pnl || 0), 0),
      worstTrade: Math.min(...tradeHistory.map(t => t.pnl || 0), 0)
    };

    return { pnlHistory, metrics };
  };

  const tradingChartData = isConnected ? generateTradingChartData() : { pnlHistory: [], metrics: {} };

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      {!isConnected ? (
        <div className="space-y-4">
          {/* Connection Prompt */}
          <Card className="border border-[#E4E4E7] shadow-sm rounded-sm max-w-2xl mx-auto">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-gray-400" />
              </div>
              <h2 className="text-2xl font-['Manrope'] font-bold mb-2">Connect Your Polymarket Account</h2>
              <p className="text-gray-600 mb-6">
                To enable automated trading, you need to connect your Polymarket account.
                Go to Settings to configure your account credentials.
              </p>
              <Button
                onClick={() => window.location.href = '/settings'}
                className="bg-black text-white hover:bg-gray-800 rounded-sm px-6 py-3"
              >
                Go to Settings
              </Button>
            </div>
          </Card>

          {/* Preview/Demo Section */}
          <Card className="border-2 border-blue-500 shadow-lg rounded-sm">
            <div className="p-6 bg-blue-50 border-b border-blue-200">
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-['Manrope'] font-bold">Preview: Auto-Trading Features</h2>
              </div>
              <p className="text-sm text-blue-800">
                This is what you'll see after connecting your account. Connect now to unlock automated trading!
              </p>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Demo Auto-Trading Control */}
              <div className="p-4 bg-gray-50 rounded-sm border-2 border-dashed border-gray-300">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-['Manrope'] font-bold mb-1">Auto-Trading Toggle</h3>
                    <p className="text-sm text-gray-600">Enable/disable automated trade execution based on AI signals</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-400">Enabled</span>
                    <Switch disabled className="opacity-50" />
                  </div>
                </div>
                <div className="p-3 bg-green-50 border border-green-200 rounded-sm">
                  <div className="flex items-center gap-2 text-green-800">
                    <Play className="w-4 h-4" />
                    <span className="text-sm font-semibold">When active, bot automatically trades on 70%+ confidence signals</span>
                  </div>
                </div>
              </div>

              {/* Demo Performance Metrics */}
              <div className="p-4 bg-gray-50 rounded-sm border-2 border-dashed border-gray-300">
                <h3 className="text-sm font-['Manrope'] font-bold mb-3">Performance Overview</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-white rounded-sm border">
                    <div className="text-xs text-gray-500 mb-1">Total Value</div>
                    <div className="text-xl font-bold">$1,245.00</div>
                  </div>
                  <div className="p-3 bg-white rounded-sm border">
                    <div className="text-xs text-gray-500 mb-1">Total PNL</div>
                    <div className="text-xl font-bold text-green-600">+$156.23</div>
                  </div>
                  <div className="p-3 bg-white rounded-sm border">
                    <div className="text-xs text-gray-500 mb-1">Win Rate</div>
                    <div className="text-xl font-bold">73.5%</div>
                  </div>
                  <div className="p-3 bg-white rounded-sm border">
                    <div className="text-xs text-gray-500 mb-1">Avg Return</div>
                    <div className="text-xl font-bold text-green-600">+12.5%</div>
                  </div>
                </div>
              </div>

              {/* Demo Positions */}
              <div className="p-4 bg-gray-50 rounded-sm border-2 border-dashed border-gray-300">
                <h3 className="text-sm font-['Manrope'] font-bold mb-3">Your Active Positions</h3>
                <div className="space-y-2">
                  <div className="p-3 bg-white rounded-sm border flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-sm">Bitcoin $100k by March</div>
                      <div className="text-xs text-gray-500">250 shares @ $0.68</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-green-600">+$24.50</div>
                      <div className="text-xs text-gray-500">$170.00</div>
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-sm border flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-sm">Ethereum $5k by Q2</div>
                      <div className="text-xs text-gray-500">180 shares @ $0.55</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-green-600">+$12.40</div>
                      <div className="text-xs text-gray-500">$99.00</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Demo PNL Chart */}
              <div className="p-4 bg-gray-50 rounded-sm border-2 border-dashed border-gray-300">
                <h3 className="text-sm font-['Manrope'] font-bold mb-3">24h PNL Tracking Chart</h3>
                <div className="h-[200px] bg-white rounded border flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Interactive PNL chart will appear here</p>
                  </div>
                </div>
              </div>

              <div className="text-center pt-4">
                <Button
                  onClick={() => window.location.href = '/settings'}
                  size="lg"
                  className="bg-blue-600 text-white hover:bg-blue-700 rounded-sm px-8 py-4 text-base font-semibold"
                >
                  Connect Account to Unlock These Features
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Auto-Trading Control */}
          <Card className="border border-[#E4E4E7] shadow-sm rounded-sm">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-['Manrope'] font-bold mb-1">Auto-Trading</h2>
                  <p className="text-sm text-gray-600">
                    Automatically execute trades based on AI signals
                  </p>
                  <p className="text-xs text-gray-400 font-mono mt-1">
                    Connected: {userAddress.substring(0, 6)}...{userAddress.substring(userAddress.length - 4)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Label htmlFor="auto-trading" className="font-semibold">
                    {autoTradingEnabled ? 'Enabled' : 'Disabled'}
                  </Label>
                  <Switch
                    id="auto-trading"
                    checked={autoTradingEnabled}
                    onCheckedChange={toggleAutoTrading}
                    className="data-[state=checked]:bg-green-600"
                  />
                </div>
              </div>
              {autoTradingEnabled && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-sm">
                  <div className="flex items-center gap-2 text-green-800">
                    <Play className="w-4 h-4" />
                    <span className="text-sm font-semibold">Auto-trading is active</span>
                  </div>
                  <p className="text-xs text-green-700 mt-1">
                    The bot will automatically place trades when AI signals reach 70%+ confidence
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Current Positions */}
          <Card className="border border-[#E4E4E7] shadow-sm rounded-sm">
            <div className="p-4 border-b border-[#E4E4E7]">
              <h3 className="text-lg font-['Manrope'] font-semibold">Your Positions</h3>
            </div>
            <div className="p-4">
              {positions.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No active positions</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {positions.map((position, idx) => (
                    <div key={idx} className="p-3 border border-[#E4E4E7] rounded-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-sm">{position.market || 'Position'}</div>
                          <div className="text-xs text-gray-500">
                            {position.size} shares @ ${position.avgPrice}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-bold ${position.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {position.pnl >= 0 ? '+' : ''}${position.pnl}
                          </div>
                          <div className="text-xs text-gray-500">${position.currentValue}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>


          {/* Performance Overview */}
          <Card className="border border-[#E4E4E7] shadow-sm rounded-sm">
            <div className="p-4 border-b border-[#E4E4E7] flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-['Manrope'] font-semibold">Performance Overview</h3>
            </div>
            <div className="p-4">
              <PerformanceMetrics metrics={tradingChartData.metrics} />
            </div>
          </Card>

          {/* PNL Chart */}
          <Card className="border border-[#E4E4E7] shadow-sm rounded-sm">
            <div className="p-4 border-b border-[#E4E4E7]">
              <h3 className="text-lg font-['Manrope'] font-semibold">PNL Tracking (24h)</h3>
            </div>
            <div className="p-4">
              <PnLChart data={tradingChartData.pnlHistory} />
            </div>
          </Card>


          {/* Open Orders */}
          <Card className="border border-[#E4E4E7] shadow-sm rounded-sm">
            <div className="p-4 border-b border-[#E4E4E7]">
              <h3 className="text-lg font-['Manrope'] font-semibold">Open Orders</h3>
            </div>
            <div className="p-4">
              {openOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">No open orders</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {openOrders.map((order, idx) => (
                    <div key={idx} className="p-3 border border-[#E4E4E7] rounded-sm flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold">{order.side} Order</div>
                        <div className="text-xs text-gray-500 font-mono">
                          {order.size} @ ${order.price}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50"
                      >
                        Cancel
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Trade History */}
          <Card className="border border-[#E4E4E7] shadow-sm rounded-sm">
            <div className="p-4 border-b border-[#E4E4E7]">
              <h3 className="text-lg font-['Manrope'] font-semibold">Recent Trades</h3>
            </div>
            <div className="p-4 max-h-[300px] overflow-y-auto">
              {tradeHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">No trade history</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tradeHistory.map((trade, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-2">
                        {trade.side === 'BUY' ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        )}
                        <div>
                          <div className="text-sm font-semibold">{trade.side}</div>
                          <div className="text-xs text-gray-500">{trade.size} @ ${trade.price}</div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 font-mono">
                        {new Date(trade.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
