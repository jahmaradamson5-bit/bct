import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { Activity, Zap, Wallet, ArrowUpRight, ArrowDownRight, Brain, Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;
const SOCKET_PATH = '/api/socket.io';

export default function Dashboard() {
  const [binancePrice, setBinancePrice] = useState(null);
  const [polymarketPrice, setPolymarketPrice] = useState(null);
  const [priceDelta, setPriceDelta] = useState(0);
  const [prevBinancePrice, setPrevBinancePrice] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [signals, setSignals] = useState([]);
  const [activities, setActivities] = useState([]);
  const [newWalletAddress, setNewWalletAddress] = useState('');
  const [newWalletLabel, setNewWalletLabel] = useState('');
  const [isGeneratingSignal, setIsGeneratingSignal] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [walletPositions, setWalletPositions] = useState(null);
  
  const socketRef = useRef(null);
  const priceRef = useRef(null);

  // Initialize Socket.IO connection
  useEffect(() => {
    socketRef.current = io(BACKEND_URL, { path: SOCKET_PATH });

    socketRef.current.on('connect', () => {
      console.log('Socket.IO connected');
    });

    socketRef.current.on('price_update', (data) => {
      setPrevBinancePrice(binancePrice);
      setBinancePrice(data.binance_price);
      setPolymarketPrice(data.polymarket_price);
      setPriceDelta(data.price_delta);
      
      // Flash animation
      if (priceRef.current && prevBinancePrice) {
        if (data.binance_price > prevBinancePrice) {
          priceRef.current.classList.add('flash-green');
          setTimeout(() => priceRef.current?.classList.remove('flash-green'), 500);
        } else if (data.binance_price < prevBinancePrice) {
          priceRef.current.classList.add('flash-red');
          setTimeout(() => priceRef.current?.classList.remove('flash-red'), 500);
        }
      }
    });

    socketRef.current.on('new_signal', (signal) => {
      if (signal && typeof signal === 'object') {
        setSignals(prev => [signal, ...(Array.isArray(prev) ? prev : [])].slice(0, 20));
        toast.success('New trading signal generated!');
      }
    });

    return () => {
      if (socketRef.current?.connected) {
        socketRef.current.disconnect();
      }
    };
  }, [binancePrice, prevBinancePrice]);

  // Fetch initial data
  useEffect(() => {
    fetchCurrentPrices();
    fetchWallets();
    fetchSignals();
  }, []);

  const fetchCurrentPrices = async () => {
    try {
      const response = await axios.get(`${API}/prices/current`);
      const data = response.data || {};
      setBinancePrice(data.binance_price ?? null);
      setPolymarketPrice(data.polymarket_price ?? null);
      setPriceDelta(data.price_delta ?? 0);
    } catch (error) {
      console.error('Error fetching prices:', error);
    }
  };

  const toSafeArray = (data) => {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
      // Handle common nested shapes: { wallets: [...] }, { signals: [...] }, { data: [...] }, { results: [...] }
      const nested = data.wallets || data.signals || data.data || data.results;
      if (Array.isArray(nested)) return nested;
    }
    return [];
  };

  const fetchWallets = async () => {
    try {
      const response = await axios.get(`${API}/wallets`);
      setWallets(toSafeArray(response.data));
    } catch (error) {
      console.error('Error fetching wallets:', error);
      setWallets([]);
    }
  };

  const fetchSignals = async () => {
    try {
      const response = await axios.get(`${API}/signals`);
      setSignals(toSafeArray(response.data));
    } catch (error) {
      console.error('Error fetching signals:', error);
      setSignals([]);
    }
  };

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
        setWalletPositions(null);
      }
    } catch (error) {
      console.error('Error deleting wallet:', error);
      toast.error('Failed to remove wallet');
    }
  };

  const generateSignal = async () => {
    setIsGeneratingSignal(true);
    try {
      await axios.post(`${API}/signals/generate`);
      toast.success('Signal generated successfully');
      fetchSignals();
    } catch (error) {
      console.error('Error generating signal:', error);
      toast.error('Failed to generate signal');
    } finally {
      setIsGeneratingSignal(false);
    }
  };

  const viewWalletDetails = async (wallet) => {
    setSelectedWallet(wallet);
    try {
      const response = await axios.get(`${API}/wallets/${wallet.address}/positions`);
      const data = response.data || {};
      setWalletPositions({
        ...data,
        positions: Array.isArray(data.positions) ? data.positions : [],
      });
    } catch (error) {
      console.error('Error fetching wallet positions:', error);
      toast.error('Failed to load wallet positions');
      setWalletPositions(null);
    }
  };

  return (
    <div data-testid="dashboard">
      {/* Price Ticker */}
      <div className="bg-white border-b-2 border-black" data-testid="price-ticker">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Binance Price */}
            <div ref={priceRef} className="transition-all duration-200" data-testid="binance-price-card">
              <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">BINANCE SPOT</div>
              <div className="text-5xl font-['Manrope'] font-extrabold tracking-tighter">
                ${binancePrice ? binancePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '---'}
              </div>
              <div className="text-xs font-mono text-gray-500 mt-1">BTC/USDT Real-time</div>
            </div>

            {/* Price Delta */}
            <div className="flex items-center justify-center" data-testid="price-delta-card">
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">PRICE LAG</div>
                <div className={`text-4xl font-['Manrope'] font-extrabold tracking-tight ${
                  priceDelta > 0 ? 'text-[#10B981]' : priceDelta < 0 ? 'text-[#EF4444]' : 'text-gray-900'
                }`}>
                  {priceDelta > 0 ? '+' : ''}{(priceDelta || 0).toFixed(2)}
                </div>
                <div className="text-xs text-gray-500 mt-1 font-mono">Opportunity Window</div>
              </div>
            </div>

            {/* Polymarket Price */}
            <div data-testid="polymarket-price-card">
              <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">POLYMARKET 15-MIN</div>
              <div className="text-5xl font-['Manrope'] font-extrabold tracking-tighter">
                {polymarketPrice ? polymarketPrice.toFixed(4) : '---'}
              </div>
              <div className="text-xs font-mono text-gray-500 mt-1">Probability-based Price</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* AI Signals Panel */}
          <div className="lg:col-span-2" data-testid="signals-panel">
            <Card className="border border-[#E4E4E7] shadow-sm rounded-sm">
              <div className="p-4 border-b border-[#E4E4E7] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-[#2563EB]" />
                  <h2 className="text-xl font-['Manrope'] font-semibold tracking-tight">AI Trading Signals</h2>
                </div>
                <Button
                  onClick={generateSignal}
                  disabled={isGeneratingSignal}
                  className="bg-black text-white hover:bg-gray-800 rounded-sm h-9 px-4 text-sm font-semibold transition-colors"
                  data-testid="generate-signal-button"
                >
                  {isGeneratingSignal ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Analyzing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Generate Signal
                    </span>
                  )}
                </Button>
              </div>
              <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto" data-testid="signals-list">
                {!Array.isArray(signals) || signals.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No signals yet. Generate your first signal.</p>
                  </div>
                ) : (
                  signals.map((signal) => (
                    <div
                      key={signal.id}
                      className="bg-blue-50/50 border-l-4 border-blue-600 p-4 rounded-sm hover:bg-blue-50 transition-colors"
                      data-testid={`signal-card-${signal.id}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {signal.signal_type === 'BUY' ? (
                            <TrendingUp className="w-5 h-5 text-green-600" />
                          ) : (
                            <TrendingDown className="w-5 h-5 text-red-600" />
                          )}
                          <span className={`text-lg font-['Manrope'] font-bold ${
                            signal.signal_type === 'BUY' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {signal.signal_type}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-400 font-mono">CONFIDENCE</div>
                          <div className="text-sm font-bold font-['JetBrains_Mono']">
                            {signal.confidence != null ? (signal.confidence * 100).toFixed(0) : '--'}%
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{signal.reason}</p>
                      <div className="grid grid-cols-3 gap-2 text-xs font-mono text-gray-500">
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-gray-400">Binance</span>
                          <div className="font-semibold">${signal.binance_price != null ? signal.binance_price.toFixed(2) : '---'}</div>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-gray-400">Polymarket</span>
                          <div className="font-semibold">{signal.polymarket_price != null ? signal.polymarket_price.toFixed(4) : '---'}</div>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-gray-400">Delta</span>
                          <div className="font-semibold">{signal.price_delta != null ? signal.price_delta.toFixed(2) : '---'}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Wallet Tracker */}
          <div data-testid="wallet-tracker-panel">
            <Card className="border border-[#E4E4E7] shadow-sm rounded-sm">
              <div className="p-4 border-b border-[#E4E4E7] flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                <h2 className="text-xl font-['Manrope'] font-semibold tracking-tight">Wallet Tracker</h2>
              </div>
              <div className="p-4">
                {/* Add Wallet Form */}
                <div className="space-y-2 mb-4" data-testid="add-wallet-form">
                  <Input
                    placeholder="Wallet Address"
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
                <div className="space-y-2 max-h-[400px] overflow-y-auto" data-testid="wallet-list">
                  {!Array.isArray(wallets) || wallets.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <Wallet className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-xs">No wallets tracked yet</p>
                    </div>
                  ) : (
                    wallets.map((wallet, index) => (
                      <div
                        key={wallet.id}
                        className="p-3 border border-[#E4E4E7] rounded-sm hover:bg-gray-50 transition-colors cursor-pointer"
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

                {/* Wallet Positions (when wallet selected) */}
                {selectedWallet && walletPositions && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-sm border border-[#E4E4E7]" data-testid="wallet-positions">
                    <div className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-2">
                      {selectedWallet.label} Positions
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Total Value:</span>
                        <span className="font-mono font-bold">${(walletPositions.total_value ?? 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Total PNL:</span>
                        <span className={`font-mono font-bold ${
                          (walletPositions.total_pnl ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {(walletPositions.total_pnl ?? 0) >= 0 ? '+' : ''}{(walletPositions.total_pnl ?? 0).toFixed(2)}
                        </span>
                      </div>
                      {(Array.isArray(walletPositions.positions) ? walletPositions.positions : []).map((pos, idx) => {
                        if (!pos || typeof pos !== 'object') return null;
                        return (
                          <div key={idx} className="text-xs border-t border-gray-200 pt-2 mt-2">
                            <div className="font-semibold">{pos.market ?? 'Unknown'}</div>
                            <div className="flex justify-between mt-1 text-gray-600">
                              <span>{pos.shares ?? 0} shares @ {pos.avg_price ?? '—'}</span>
                              <span className={(pos.pnl ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {(pos.pnl ?? 0) >= 0 ? '+' : ''}{(pos.pnl_percent ?? 0).toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
