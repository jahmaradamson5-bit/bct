import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings as SettingsIcon, Key, Save, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

export default function SettingsPage() {
  const [privateKey, setPrivateKey] = useState('');
  const [proxyAddress, setProxyAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const response = await axios.get(`${API}/trading/status`);
      setIsConnected(response.data.connected);
      if (response.data.address) {
        setProxyAddress(response.data.address);
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  const connectAccount = async () => {
    if (!privateKey || !proxyAddress) {
      toast.error('Please provide both private key and wallet address');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/trading/connect`, {
        private_key: privateKey,
        proxy_address: proxyAddress,
        signature_type: 0
      });

      if (response.data.success) {
        setIsConnected(true);
        toast.success('Account connected successfully!');
        // Clear private key from state for security
        setPrivateKey('');
      } else {
        toast.error(response.data.error || 'Failed to connect account');
      }
    } catch (error) {
      console.error('Error connecting account:', error);
      toast.error('Failed to connect account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-6">
      <Card className="border border-[#E4E4E7] shadow-sm rounded-sm">
        <div className="p-6 border-b border-[#E4E4E7]">
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-6 h-6" />
            <h1 className="text-2xl font-['Manrope'] font-bold">Settings</h1>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Configure your Polymarket account for automated trading
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Connection Status */}
          {isConnected && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-sm flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <div className="font-semibold text-green-800">Account Connected</div>
                <div className="text-sm text-green-700 mt-1">
                  Your Polymarket account is connected and ready for trading
                </div>
                <div className="text-xs text-green-600 font-mono mt-2">
                  Address: {proxyAddress}
                </div>
              </div>
            </div>
          )}

          {/* Account Connection Form */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Key className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-['Manrope'] font-semibold">Polymarket Account</h2>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wallet-address">Wallet Address</Label>
              <Input
                id="wallet-address"
                type="text"
                placeholder="0x..."
                value={proxyAddress}
                onChange={(e) => setProxyAddress(e.target.value)}
                className="font-mono text-sm"
                disabled={isConnected}
              />
              <p className="text-xs text-gray-500">
                Your Polymarket wallet address (proxy address)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="private-key">Private Key</Label>
              <Input
                id="private-key"
                type="password"
                placeholder="Enter your private key"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                className="font-mono text-sm"
                disabled={isConnected}
              />
              <p className="text-xs text-gray-500">
                Your wallet's private key (never shared, stored securely)
              </p>
            </div>

            {!isConnected && (
              <Button
                onClick={connectAccount}
                disabled={loading}
                className="w-full bg-black text-white hover:bg-gray-800 rounded-sm h-10 font-semibold"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Connecting...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    Connect Account
                  </span>
                )}
              </Button>
            )}
          </div>

          {/* Security Notice */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-sm">
            <div className="text-sm font-semibold text-yellow-800 mb-1">Security Notice</div>
            <ul className="text-xs text-yellow-700 space-y-1">
              <li>• Your private key is encrypted and never stored in plain text</li>
              <li>• Never share your private key with anyone</li>
              <li>• Only connect wallets you control</li>
              <li>• Monitor your positions regularly</li>
            </ul>
          </div>

          {/* Instructions */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-sm">
            <div className="text-sm font-semibold mb-2">How to get your credentials:</div>
            <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
              <li>Go to polymarket.com and connect your wallet</li>
              <li>Your wallet address is visible in the top right</li>
              <li>Export your private key from your wallet (MetaMask, etc.)</li>
              <li>Paste both here to enable automated trading</li>
            </ol>
          </div>
        </div>
      </Card>
    </div>
  );
}
