import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Wallet, Plus, Trash2, TrendingUp, TrendingDown, RefreshCw, Eye, BarChart3 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import PnLChart from '../components/charts/PnLChart';
import PositionDistribution from '../components/charts/PositionDistribution';
import BuySellComparison from '../components/charts/BuySellComparison';
import PerformanceMetrics from '../components/charts/PerformanceMetrics';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL && process.env.REACT_APP_BACKEND_URL !== 'undefined'
  ? process.env.REACT_APP_BACKEND_URL.replace(/\/+$/, '')
  : '';
const API = `${BACKEND_URL}/api`;

export default function WalletTracker() {
  const [wallets, setWallets] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [walletDetails, setWalletDetails] = useState(null);
  const [activityFeed, setActivityFeed] = useState([]);
  const [newWalletAddress, setNewWalletAddress] = useState('');
  const [newWalletLabel, setNewWalletLabel] = useState('');
  const [loading, setLoading] = useState(false);


  // Generate chart data from wallet details
  const generateChartData = () => {
    const emptyResult = { pnlHistory: [], distribution: [], buySell: [], metrics: {} };
    if (!walletDetails || typeof walletDetails !== 'object') return emptyResult;

    const buyingPositions = Array.isArray(walletDetails.buying_positions) ? walletDetails.buying_positions : [];
    const sellingPositions = Array.isArray(walletDetails.selling_positions) ? walletDetails.selling_positions : [];
    const allPositions = [...buyingPositions, ...sellingPositions];

    // PNL history (simulated time series)
    const pnlHistory = [];
    const baseTime = Date.now();
    for (let i = 0; i < 24; i++) {
      const time = new Date(baseTime - (23 - i) * 3600000);
      const pnl = (walletDetails.total_pnl ?? 0) * (0.5 + (i / 24) * 0.5) + Math.random() * 5 - 2.5;
      pnlHistory.push({
        time: `${time.getHours()}:00`,
        pnl: parseFloat(pnl.toFixed(2))
      });
    }

    // Position distribution by market
    const distribution = [];
    buyingPositions.forEach((pos, idx) => {
      if (idx < 5) {
        distribution.push({
          name: pos.market?.substring(0, 20) || `Position ${idx + 1}`,
          value: Math.abs(pos.current_value || 0)
        });
      }
    });
    sellingPositions.forEach((pos, idx) => {
      if (idx < 5) {
        distribution.push({
          name: pos.market?.substring(0, 20) || `Position ${idx + 1}`,
          value: Math.abs(pos.current_value || 0)
        });
      }
    });

    // Buy vs Sell comparison by market type
    const markets = {};
    buyingPositions.forEach(pos => {
      const marketType = pos.market?.split(' ')[0] || 'Other';
      if (!markets[marketType]) markets[marketType] = { name: marketType, buy: 0, sell: 0 };
      markets[marketType].buy += Math.abs(pos.current_value || 0);
    });
    sellingPositions.forEach(pos => {
      const marketType = pos.market?.split(' ')[0] || 'Other';
      if (!markets[marketType]) markets[marketType] = { name: marketType, buy: 0, sell: 0 };
      markets[marketType].sell += Math.abs(pos.current_value || 0);
    });
    const buySell = Object.values(markets).slice(0, 5);

    // Performance metrics
    const totalPositions = walletDetails.total_positions || 0;
    const winningPositions = allPositions.filter(p => (p.unrealized_pnl || 0) > 0).length;
    const pnlValues = allPositions.map(p => p.unrealized_pnl || 0);
    
    const metrics = {
      totalValue: walletDetails.total_value || 0,
      totalPnl: walletDetails.total_pnl || 0,
      winRate: totalPositions > 0 ? (winningPositions / totalPositions) * 100 : 0,
      avgReturn: walletDetails.total_value > 0 ? ((walletDetails.total_pnl / walletDetails.total_value) * 100) : 0,
      totalTrades: totalPositions,
      bestTrade: pnlValues.length > 0 ? Math.max(...pnlValues) : 0,
      worstTrade: pnlValues.length > 0 ? Math.min(...pnlValues) : 0
    };

    return { pnlHistory, distribution, buySell, metrics };
  };

  const chartData = generateChartData();

  const fetchWallets = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/wallets`);
      const data = response.data;
      const safe = Array.isArray(data)
        ? data
        : data && typeof data === 'object'
          ? (data.wallets || data.data || data.results || [])
          : [];
      setWallets(Array.isArray(safe) ? safe : []);
    } catch (error) {
      console.error('Error fetching wallets:', error);
      setWallets([]);
    }
  }, []);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  const addWallet = async () => {
    if (!newWalletAddress || !newWalletLabel) {
      toast.error('Please provide both address and label');
      return;
    }

    try {
      await axios.post(`${API}/wallets`, {
        address: newWalletAddress,
        label: newWalletLabel
      });
      toast.success('Wallet added successfully');
      setNewWalletAddress('');
      setNewWalletLabel('');
      fetchWallets();
    } catch (error) {
      console.error('Error adding wallet:', error);
      toast.error('Failed to add wallet');
    }
  };

  const deleteWallet = async (walletId) => {
    try {
      await axios.delete(`${API}/wallets/${walletId}`);
      toast.success('Wallet removed');
      fetchWallets();
      if (selectedWallet?.id === walletId) {
        setSelectedWallet(null);
        setWalletDetails(null);
      }
    } catch (error) {
      console.error('Error deleting wallet:', error);
      toast.error('Failed to remove wallet');
    }
  };

  const viewWalletDetails = async (wallet) => {
    setSelectedWallet(wallet);
    setLoading(true);
    
    try {
      const [detailsRes, activityRes] = await Promise.all([
        axios.get(`${API}/wallets/${wallet.address}/detailed`),
        axios.get(`${API}/wallets/${wallet.address}/activity-feed`)
      ]);
      
      setWalletDetails(detailsRes.data || null);
      setActivityFeed(toSafeArray(activityRes.data));
    } catch (error) {
      console.error('Error fetching wallet details:', error);
      toast.error('Failed to load wallet details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Wallet List */}
        <div className="lg:col-span-1">
          <Card className="border border-[#E4E4E7] shadow-sm rounded-sm">
            <div className="p-4 border-b border-[#E4E4E7] flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              <h2 className="text-xl font-['Manrope'] font-semibold tracking-tight">Tracked Wallets</h2>
            </div>
            <div className="p-4">
              {/* Add Wallet Form */}
              <div className="space-y-2 mb-4" data-testid="add-wallet-form">
                <Input
                  placeholder="Wallet Address (0x...)"
                  value={newWalletAddress}
                  onChange={(e) => setNewWalletAddress(e.target.value)}
                  className="font-mono text-xs rounded-sm border-gray-300"
                  data-testid="wallet-address-input"
                />
                <Input
                  placeholder="Label (e.g., Whale #1)"
                  value={newWalletLabel}
                  onChange={(e) => setNewWalletLabel(e.target.value)}
                  className="rounded-sm border-gray-300"
                  data-testid="wallet-label-input"
                />
                <Button
                  onClick={addWallet}
                  className="w-full bg-black text-white hover:bg-gray-800 rounded-sm h-9 font-semibold transition-colors"
                  data-testid="add-wallet-button"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Wallet
                </Button>
              </div>

              {/* Wallet List */}
              <div className="space-y-2 max-h-[600px] overflow-y-auto" data-testid="wallet-list">
                {!Array.isArray(wallets) || wallets.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Wallet className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">No wallets tracked yet</p>
                  </div>
                ) : (
                  wallets.map((wallet, index) => (
                    <div
                      key={wallet.id}
                      className={`p-3 border border-[#E4E4E7] rounded-sm hover:bg-gray-50 transition-colors cursor-pointer ${
                        selectedWallet?.id === wallet.id ? 'bg-gray-50 border-black' : ''
                      }`}
                      onClick={() => viewWalletDetails(wallet)}
                      data-testid={`wallet-item-${index}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm mb-1">{wallet.label}</div>
                          <div className="font-mono text-xs text-gray-500 truncate">
                            {wallet.address}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteWallet(wallet.id);
                          }}
                          className="ml-2 h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600 rounded-sm"
                          data-testid={`delete-wallet-button-${index}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Wallet Details */}
        <div className="lg:col-span-2">
          {!selectedWallet ? (
            <Card className="border border-[#E4E4E7] shadow-sm rounded-sm">
              <div className="p-12 text-center text-gray-400">
                <Eye className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <h3 className="text-lg font-semibold mb-2">Select a wallet to view details</h3>
                <p className="text-sm">Click on a wallet from the list to see positions, PNL, and activity</p>
              </div>
            </Card>
          ) : loading ? (
            <Card className="border border-[#E4E4E7] shadow-sm rounded-sm">
              <div className="p-12 text-center">
                <RefreshCw className="w-12 h-12 mx-auto mb-4 animate-spin text-gray-400" />
                <p className="text-sm text-gray-500">Loading wallet details...</p>
              </div>
            </Card>
          ) : walletDetails ? (
            <div className="space-y-4">
              {/* Summary Card */}
              <Card className="border border-[#E4E4E7] shadow-sm rounded-sm" data-testid="wallet-summary">
                <div className="p-4 border-b border-[#E4E4E7]">
                  <h2 className="text-xl font-['Manrope'] font-semibold">{selectedWallet.label}</h2>
                  <p className="text-xs font-mono text-gray-500">{selectedWallet.address}</p>
                </div>
                <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">Total Value</div>
                    <div className="text-2xl font-['Manrope'] font-bold">${(walletDetails.total_value ?? 0).toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">Total PNL</div>
                    <div className={`text-2xl font-['Manrope'] font-bold ${
                      (walletDetails.total_pnl ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(walletDetails.total_pnl ?? 0) >= 0 ? '+' : ''}${(walletDetails.total_pnl ?? 0).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">Unrealized PNL</div>
                    <div className={`text-xl font-['JetBrains_Mono'] font-semibold ${
                      (walletDetails.unrealized_pnl ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(walletDetails.unrealized_pnl ?? 0) >= 0 ? '+' : ''}${(walletDetails.unrealized_pnl ?? 0).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">Positions</div>
                    <div className="text-2xl font-['Manrope'] font-bold">{walletDetails.total_positions ?? 0}</div>
                  </div>
                </div>
              </Card>

              {/* Performance Metrics */}
              <Card className="border border-[#E4E4E7] shadow-sm rounded-sm">
                <div className="p-4 border-b border-[#E4E4E7] flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-['Manrope'] font-semibold">Performance Metrics</h3>
                </div>
                <div className="p-4">
                  <PerformanceMetrics metrics={chartData.metrics} />
                </div>
              </Card>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* PNL Over Time */}
                <Card className="border border-[#E4E4E7] shadow-sm rounded-sm">
                  <div className="p-4 border-b border-[#E4E4E7]">
                    <h3 className="text-sm font-['Manrope'] font-semibold">PNL Over Time (24h)</h3>
                  </div>
                  <div className="p-4">
                    <PnLChart data={chartData.pnlHistory} />
                  </div>
                </Card>

                {/* Position Distribution */}
                <Card className="border border-[#E4E4E7] shadow-sm rounded-sm">
                  <div className="p-4 border-b border-[#E4E4E7]">
                    <h3 className="text-sm font-['Manrope'] font-semibold">Position Distribution</h3>
                  </div>
                  <div className="p-4">
                    {chartData.distribution.length > 0 ? (
                      <PositionDistribution data={chartData.distribution} />
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">
                        No position data available
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Buy vs Sell Comparison */}
              <Card className="border border-[#E4E4E7] shadow-sm rounded-sm">
                <div className="p-4 border-b border-[#E4E4E7]">
                  <h3 className="text-sm font-['Manrope'] font-semibold">Buy vs Sell by Market Type</h3>
                </div>
                <div className="p-4">
                  {chartData.buySell.length > 0 ? (
                    <BuySellComparison data={chartData.buySell} />
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">
                      No comparison data available
                    </div>
                  )}
                </div>
              </Card>


              {/* Positions Tabs */}
              <Card className="border border-[#E4E4E7] shadow-sm rounded-sm">
                <Tabs defaultValue="buying" className="w-full">
                  <div className="p-4 border-b border-[#E4E4E7]">
                    <TabsList className="grid w-full grid-cols-2 bg-gray-100 rounded-sm">
                      <TabsTrigger value="buying" className="data-[state=active]:bg-white rounded-sm">
                        <TrendingUp className="w-4 h-4 mr-2 text-green-600" />
                        Buying Positions ({walletDetails.buying_positions?.length || 0})
                      </TabsTrigger>
                      <TabsTrigger value="selling" className="data-[state=active]:bg-white rounded-sm">
                        <TrendingDown className="w-4 h-4 mr-2 text-red-600" />
                        Selling Positions ({walletDetails.selling_positions?.length || 0})
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="buying" className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                    {!Array.isArray(walletDetails.buying_positions) || walletDetails.buying_positions.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <p className="text-sm">No buying positions</p>
                      </div>
                    ) : (
                      walletDetails.buying_positions.map((pos, idx) => (
                        <div key={idx} className="p-3 border border-[#E4E4E7] rounded-sm bg-green-50/30">
                          <div className="font-semibold text-sm mb-2">{pos.market}</div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-gray-500">Outcome:</span> <span className="font-semibold">{pos.outcome}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Shares:</span> <span className="font-mono font-semibold">{pos.size}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Avg Price:</span> <span className="font-mono">{pos.avg_price}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Current:</span> <span className="font-mono">{pos.current_price}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Value:</span> <span className="font-mono font-semibold">${pos.current_value ?? 0}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">PNL:</span> 
                              <span className={`font-mono font-semibold ml-1 ${(pos.unrealized_pnl ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {(pos.unrealized_pnl ?? 0) >= 0 ? '+' : ''}${pos.unrealized_pnl ?? 0} ({(pos.pnl_percent ?? 0) >= 0 ? '+' : ''}{pos.pnl_percent ?? 0}%)
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="selling" className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                    {!Array.isArray(walletDetails.selling_positions) || walletDetails.selling_positions.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <p className="text-sm">No selling positions</p>
                      </div>
                    ) : (
                      walletDetails.selling_positions.map((pos, idx) => (
                        <div key={idx} className="p-3 border border-[#E4E4E7] rounded-sm bg-red-50/30">
                          <div className="font-semibold text-sm mb-2">{pos.market}</div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-gray-500">Outcome:</span> <span className="font-semibold">{pos.outcome}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Shares:</span> <span className="font-mono font-semibold">{Math.abs(pos.size)}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Avg Price:</span> <span className="font-mono">{pos.avg_price}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Current:</span> <span className="font-mono">{pos.current_price}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Value:</span> <span className="font-mono font-semibold">${Math.abs(pos.current_value ?? 0)}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">PNL:</span> 
                              <span className={`font-mono font-semibold ml-1 ${(pos.unrealized_pnl ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {(pos.unrealized_pnl ?? 0) >= 0 ? '+' : ''}${pos.unrealized_pnl ?? 0} ({(pos.pnl_percent ?? 0) >= 0 ? '+' : ''}{pos.pnl_percent ?? 0}%)
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              </Card>

              {/* Activity Feed */}
              <Card className="border border-[#E4E4E7] shadow-sm rounded-sm">
                <div className="p-4 border-b border-[#E4E4E7]">
                  <h3 className="text-lg font-['Manrope'] font-semibold">Recent Activity</h3>
                </div>
                <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto">
                  {(Array.isArray(activityFeed) ? activityFeed : []).map((activity, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-3">
                        {activity.action === 'BUY' ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        )}
                        <div>
                          <div className="text-sm font-semibold">{activity.market}</div>
                          <div className="text-xs text-gray-500">
                            {activity.action} {activity.shares} shares @ {activity.price}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 font-mono">
                        {activity.timestamp ? new Date(activity.timestamp).toLocaleTimeString() : '--:--'}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
