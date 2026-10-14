import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, AlertCircle, ScanLine, Keyboard } from 'lucide-react';
import toast from 'react-hot-toast';

const BarcodeScannerModal = ({ isOpen, onClose, onScanSuccess }) => {
  const [manualCode, setManualCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef(null);

  useEffect(() => {
    let html5QrCode = null;

    if (isOpen) {
      setErrorMsg('');
      const startScanner = async () => {
        try {
          html5QrCode = new Html5Qrcode('reader');
          scannerRef.current = html5QrCode;

          const config = {
            fps: 10,
            qrbox: { width: 250, height: 180 },
            aspectRatio: 1.333334,
          };

          await html5QrCode.start(
            { facingMode: 'environment' },
            config,
            (decodedText) => {
              // Beep sound effect or toast
              toast.success(`Scanned: ${decodedText}`);
              onScanSuccess(decodedText);
              stopScanner();
              onClose();
            },
            (errorMessage) => {
              // Frame parse ignore
            }
          );
          setIsScanning(true);
        } catch (err) {
          console.warn('Camera scan initialization failed:', err);
          setErrorMsg(
            'Camera access unavailable or permission denied. Please note that camera access requires localhost or HTTPS. You can still enter or gun-scan the barcode manually below.'
          );
          setIsScanning(false);
        }
      };

      // Slight timeout to ensure DOM element exists
      const timer = setTimeout(() => {
        startScanner();
      }, 300);

      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen]);

  const stopScanner = () => {
    if (scannerRef.current && isScanning) {
      scannerRef.current
        .stop()
        .then(() => {
          scannerRef.current.clear();
          setIsScanning(false);
        })
        .catch((err) => {
          console.warn('Failed to stop scanner cleanly:', err);
        });
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    onScanSuccess(manualCode.trim());
    setManualCode('');
    stopScanner();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ScanLine className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Scan Product Barcode</h3>
              <p className="text-[11px] text-slate-400">EAN-13, EAN-8, UPC, Code 128</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Scanner View */}
        <div className="p-6">
          <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-video flex items-center justify-center text-white">
            <div id="reader" className="w-full h-full" />
            {!isScanning && !errorMsg && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                <Camera className="w-8 h-8 mb-2 animate-pulse" />
                <p className="text-xs">Requesting camera permissions...</p>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
              <p>{errorMsg}</p>
            </div>
          )}

          {/* Manual Input Fallback */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                <Keyboard className="w-3.5 h-3.5 text-slate-400" />
                Manual Barcode / Hardware Scanner Entry
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. 890123456001 or SKU"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  autoFocus
                  className="flex-1 px-3.5 py-2 rounded-xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                />
                <button
                  type="submit"
                  disabled={!manualCode.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  Lookup
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScannerModal;
