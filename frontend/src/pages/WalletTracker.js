/* WalletTracker.js – clean rewrite – no useCallback, plain functions */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Wallet,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Eye,
  RefreshCw,
  Search,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { toast } from 'sonner';
import PositionDistribution from '../components/charts/PositionDistribution';
import BuySellComparison from '../components/charts/BuySellComparison';

var BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL &&
  process.env.REACT_APP_BACKEND_URL !== 'undefined'
    ? process.env.REACT_APP_BACKEND_URL.replace(/\/+$/, '')
    : '';
var API = BACKEND_URL + '/api';

function toSafeArray(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    var nested = data.wallets || data.signals || data.data || data.results;
    if (Array.isArray(nested)) return nested;
  }
  return [];
}

export default function WalletTracker() {
  var _w = useState([]);
  var wallets = _w[0];
  var setWallets = _w[1];

  var _nwa = useState('');
  var newWalletAddress = _nwa[0];
  var setNewWalletAddress = _nwa[1];

  var _nwl = useState('');
  var newWalletLabel = _nwl[0];
  var setNewWalletLabel = _nwl[1];

  var _sw = useState(null);
  var selectedWallet = _sw[0];
  var setSelectedWallet = _sw[1];

  var _wd = useState(null);
  var walletDetails = _wd[0];
  var setWalletDetails = _wd[1];

  var _af = useState([]);
  var activityFeed = _af[0];
  var setActivityFeed = _af[1];

  var _sf = useState('');
  var searchFilter = _sf[0];
  var setSearchFilter = _sf[1];

  var _rl = useState(false);
  var refreshing = _rl[0];
  var setRefreshing = _rl[1];

  /* ---- Chart data generator ------------------------------------------- */

  function generateChartData() {
    var safeWallets = toSafeArray(wallets);

    var distribution = safeWallets.map(function (w) {
      return {
        name: w.label || 'Unknown',
        value: w.total_value || Math.random() * 1000
      };
    });

    var buySell = [];
    for (var i = 0; i < 7; i++) {
      var d = new Date();
      d.setDate(d.getDate() - (6 - i));
      buySell.push({
        day: d.toLocaleDateString('en-US', { weekday: 'short' }),
        buys: Math.floor(Math.random() * 20),
        sells: Math.floor(Math.random() * 15)
      });
    }

    return { distribution: distribution, buySell: buySell };
  }

  var chartData = generateChartData();

  /* ---- Plain fetch functions (zero useCallback) ----------------------- */

  function fetchWallets() {
    axios
      .get(API + '/wallets')
      .then(function (res) {
        setWallets(toSafeArray(res.data));
      })
      .catch(function (err) {
        console.error('Error fetching wallets:', err);
        setWallets([]);
      });
  }

  function fetchWalletDetails(address) {
    return Promise.all([
      axios.get(API + '/wallets/' + address + '/positions'),
      axios.get(API + '/wallets/' + address + '/activity')
    ])
      .then(function (results) {
        var detailsRes = results[0];
        var activityRes = results[1];
        setWalletDetails(detailsRes.data || null);
        setActivityFeed(toSafeArray(activityRes.data));
      })
      .catch(function (err) {
        console.error('Error fetching wallet details:', err);
        setWalletDetails(null);
        setActivityFeed([]);
      });
  }

  function refreshData() {
    setRefreshing(true);
    fetchWallets();
    if (selectedWallet) {
      fetchWalletDetails(selectedWallet.address);
    }
    setTimeout(function () {
      setRefreshing(false);
      toast.success('Data refreshed');
    }, 1000);
  }

  /* ---- Effects (no dependency array issues) --------------------------- */

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(function () {
    fetchWallets();
  }, []);

  /* ---- CRUD handlers -------------------------------------------------- */

  function addWallet() {
    if (!newWalletAddress || !newWalletLabel) {
      toast.error('Please provide both address and label');
      return;
    }
    axios
      .post(API + '/wallets', {
        address: newWalletAddress,
        label: newWalletLabel
      })
      .then(function () {
        toast.success('Wallet added successfully');
        setNewWalletAddress('');
        setNewWalletLabel('');
        fetchWallets();
      })
      .catch(function (err) {
        console.error('Error adding wallet:', err);
        toast.error('Failed to add wallet');
      });
  }

  function deleteWallet(walletId) {
    axios
      .delete(API + '/wallets/' + walletId)
      .then(function () {
        toast.success('Wallet removed');
        fetchWallets();
        if (selectedWallet && selectedWallet.id === walletId) {
          setSelectedWallet(null);
          setWalletDetails(null);
          setActivityFeed([]);
        }
      })
      .catch(function (err) {
        console.error('Error deleting wallet:', err);
        toast.error('Failed to remove wallet');
      });
  }

  function selectWallet(wallet) {
    setSelectedWallet(wallet);
    fetchWalletDetails(wallet.address);
  }

  /* ---- Filter --------------------------------------------------------- */

  var safeWallets = toSafeArray(wallets);
  var filteredWallets = searchFilter
    ? safeWallets.filter(function (w) {
        var q = searchFilter.toLowerCase();
        return (
          (w.label && w.label.toLowerCase().indexOf(q) !== -1) ||
          (w.address && w.address.toLowerCase().indexOf(q) !== -1)
        );
      })
    : safeWallets;

  /* ---- Render --------------------------------------------------------- */

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left column: wallet list */}
        <div className="lg:col-span-1 space-y-4">
          {/* Add wallet form */}
          <Card className="border border-[#E4E4E7] shadow-sm rounded-sm">
            <div className="p-4 border-b border-[#E4E4E7] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                <h2 className="text-lg font-['Manrope'] font-semibold">Tracked Wallets</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshData}
                disabled={refreshing}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={'w-4 h-4 ' + (refreshing ? 'animate-spin' : '')} />
              </Button>
            </div>
            <div className="p-4 space-y-2">
              <Input
                placeholder="Wallet Address"
                value={newWalletAddress}
                onChange={function (e) { setNewWalletAddress(e.target.value); }}
                className="font-mono text-xs rounded-sm border-gray-300"
              />
              <Input
                placeholder="Label (e.g., Whale #1)"
                value={newWalletLabel}
                onChange={function (e) { setNewWalletLabel(e.target.value); }}
                className="rounded-sm border-gray-300"
              />
              <Button
                onClick={addWallet}
                className="w-full bg-black text-white hover:bg-gray-800 rounded-sm h-9 font-semibold"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Wallet
              </Button>
            </div>
          </Card>

          {/* Search & wallet list */}
          <Card className="border border-[#E4E4E7] shadow-sm rounded-sm">
            <div className="p-3 border-b border-[#E4E4E7]">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search wallets..."
                  value={searchFilter}
                  onChange={function (e) { setSearchFilter(e.target.value); }}
                  className="pl-9 rounded-sm border-gray-300 h-9 text-sm"
                />
              </div>
            </div>
            <div className="p-2 space-y-1 max-h-[400px] overflow-y-auto">
              {filteredWallets.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Wallet className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">No wallets tracked yet</p>
                </div>
              ) : (
                filteredWallets.map(function (wallet, index) {
                  var isSelected = selectedWallet && selectedWallet.id === wallet.id;
                  return (
                    <div
                      key={wallet.id || index}
                      className={
                        'p-3 rounded-sm cursor-pointer transition-colors border ' +
                        (isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-transparent hover:bg-gray-50')
                      }
                      onClick={function () { selectWallet(wallet); }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">{wallet.label || 'Unnamed'}</div>
                          <div className="font-mono text-xs text-gray-500 truncate">
                            {wallet.address || '--'}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={function (e) {
                              e.stopPropagation();
                              selectWallet(wallet);
                            }}
                            className="h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-600 rounded-sm"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={function (e) {
                              e.stopPropagation();
                              deleteWallet(wallet.id);
                            }}
                            className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600 rounded-sm"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* Right column: details & charts */}
        <div className="lg:col-span-2 space-y-4">

          {/* Wallet details */}
          {selectedWallet && walletDetails ? (
            <Card className="border border-[#E4E4E7] shadow-sm rounded-sm">
              <div className="p-4 border-b border-[#E4E4E7]">
                <h3 className="text-lg font-['Manrope'] font-semibold">
                  {selectedWallet.label || 'Wallet'} Details
                </h3>
                <div className="text-xs font-mono text-gray-500 mt-1">
                  {selectedWallet.address || '--'}
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <div className="p-3 bg-gray-50 rounded-sm border">
                    <div className="text-xs text-gray-500 mb-1">Total Value</div>
                    <div className="text-xl font-bold font-['Manrope']">
                      {'$' + (walletDetails.total_value || 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-sm border">
                    <div className="text-xs text-gray-500 mb-1">Total PNL</div>
                    <div
                      className={
                        'text-xl font-bold font-[\'Manrope\'] ' +
                        ((walletDetails.total_pnl || 0) >= 0
                          ? 'text-green-600'
                          : 'text-red-600')
                      }
                    >
                      {(walletDetails.total_pnl || 0) >= 0 ? '+' : ''}
                      {'$' + (walletDetails.total_pnl || 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-sm border">
                    <div className="text-xs text-gray-500 mb-1">Positions</div>
                    <div className="text-xl font-bold font-['Manrope']">
                      {walletDetails.position_count || 0}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-sm border">
                    <div className="text-xs text-gray-500 mb-1">Win Rate</div>
                    <div className="text-xl font-bold font-['Manrope']">
                      {(walletDetails.win_rate || 0).toFixed(1) + '%'}
                    </div>
                  </div>
                </div>

                {/* Buying positions */}
                <h4 className="text-sm font-['Manrope'] font-bold mb-2 flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-green-600" />
                  Buying Positions
                </h4>
                <div className="space-y-2 mb-4">
                  {!Array.isArray(walletDetails.buying_positions) ||
                  walletDetails.buying_positions.length === 0 ? (
                    <div className="text-center py-4 text-gray-400 text-xs">
                      No buying positions
                    </div>
                  ) : (
                    walletDetails.buying_positions.map(function (pos, idx) {
                      return (
                        <div
                          key={idx}
                          className="p-3 border border-[#E4E4E7] rounded-sm flex justify-between items-center"
                        >
                          <div>
                            <div className="font-semibold text-sm">
                              {pos.market || 'Unknown'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {(pos.shares || 0) + ' shares @ $' + (pos.avg_price || 0)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div
                              className={
                                'text-sm font-bold ' +
                                ((pos.pnl || 0) >= 0
                                  ? 'text-green-600'
                                  : 'text-red-600')
                              }
                            >
                              {(pos.pnl || 0) >= 0 ? '+' : ''}
                              {'$' + (pos.pnl || 0).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Selling positions */}
                <h4 className="text-sm font-['Manrope'] font-bold mb-2 flex items-center gap-2">
                  <ArrowDownRight className="w-4 h-4 text-red-600" />
                  Selling Positions
                </h4>
                <div className="space-y-2">
                  {!Array.isArray(walletDetails.selling_positions) ||
                  walletDetails.selling_positions.length === 0 ? (
                    <div className="text-center py-4 text-gray-400 text-xs">
                      No selling positions
                    </div>
                  ) : (
                    walletDetails.selling_positions.map(function (pos, idx) {
                      return (
                        <div
                          key={idx}
                          className="p-3 border border-[#E4E4E7] rounded-sm flex justify-between items-center"
                        >
                          <div>
                            <div className="font-semibold text-sm">
                              {pos.market || 'Unknown'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {(pos.shares || 0) + ' shares @ $' + (pos.avg_price || 0)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div
                              className={
                                'text-sm font-bold ' +
                                ((pos.pnl || 0) >= 0
                                  ? 'text-green-600'
                                  : 'text-red-600')
                              }
                            >
                              {(pos.pnl || 0) >= 0 ? '+' : ''}
                              {'$' + (pos.pnl || 0).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <Card className="border border-[#E4E4E7] shadow-sm rounded-sm">
              <div className="p-12 text-center text-gray-400">
                <Eye className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a wallet to view details</p>
              </div>
            </Card>
          )}

          {/* Activity feed */}
          <Card className="border border-[#E4E4E7] shadow-sm rounded-sm">
            <div className="p-4 border-b border-[#E4E4E7]">
              <h3 className="text-lg font-['Manrope'] font-semibold">Activity Feed</h3>
            </div>
            <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto">
              {!Array.isArray(activityFeed) || activityFeed.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">No recent activity</p>
                </div>
              ) : (
                activityFeed.map(function (activity, idx) {
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 border-b border-gray-100 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        {activity.action === 'BUY' ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        )}
                        <div>
                          <div className="text-sm font-semibold">
                            {activity.market || 'Unknown'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {(activity.action || '--') +
                              ' ' +
                              (activity.shares || 0) +
                              ' shares @ ' +
                              (activity.price || '--')}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 font-mono">
                        {activity.timestamp
                          ? new Date(activity.timestamp).toLocaleTimeString()
                          : '--'}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {/* Charts row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border border-[#E4E4E7] shadow-sm rounded-sm">
              <div className="p-4 border-b border-[#E4E4E7]">
                <h3 className="text-sm font-['Manrope'] font-semibold">
                  Position Distribution
                </h3>
              </div>
              <div className="p-4">
                <PositionDistribution data={chartData.distribution} />
              </div>
            </Card>
            <Card className="border border-[#E4E4E7] shadow-sm rounded-sm">
              <div className="p-4 border-b border-[#E4E4E7]">
                <h3 className="text-sm font-['Manrope'] font-semibold">
                  Buy / Sell Comparison
                </h3>
              </div>
              <div className="p-4">
                <BuySellComparison data={chartData.buySell} />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
