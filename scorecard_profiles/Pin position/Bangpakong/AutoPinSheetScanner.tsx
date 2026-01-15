import { useState, useRef } from 'react';
import { Camera, Upload, Check, Loader2, AlertCircle, Zap, MapPin, RefreshCw } from 'lucide-react';

interface PinPosition {
  hole_number: number;
  x_position: number;
  y_position: number;
  position_label: string;
}

interface ScanResult {
  success: boolean;
  message: string;
  pin_sheet_id?: string;
  date?: string;
  course_name?: string;
  green_speed?: string;
  pins?: PinPosition[];
  error?: string;
}

interface AutoPinSheetScannerProps {
  courseId: string;
  courseName: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  userToken: string;
  onSuccess?: (result: ScanResult) => void;
}

function MiniGreen({ x, y }: { x: number; y: number }) {
  return (
    <div 
      className="relative w-8 h-8 rounded-full"
      style={{ background: 'linear-gradient(to bottom, #22c55e, #16a34a)' }}
    >
      <div
        className="absolute w-1.5 h-1.5 bg-red-500 rounded-full"
        style={{ 
          left: `${x * 100}%`, 
          top: `${y * 100}%`,
          transform: 'translate(-50%, -50%)'
        }}
      />
    </div>
  );
}

export default function AutoPinSheetScanner({
  courseId,
  courseName,
  supabaseUrl,
  supabaseAnonKey,
  userToken,
  onSuccess
}: AutoPinSheetScannerProps) {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const processImage = async (file: File) => {
    setStatus('uploading');
    setErrorMessage(null);
    
    // Create preview
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);

    try {
      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setStatus('processing');

      // Call edge function
      const response = await fetch(`${supabaseUrl}/functions/v1/auto-read-pinsheet`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          course_id: courseId,
          image_base64: base64,
          image_mime_type: file.type || 'image/jpeg',
        }),
      });

      const data: ScanResult = await response.json();

      if (data.success) {
        setStatus('success');
        setResult(data);
        onSuccess?.(data);
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'Failed to process pin sheet');
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Network error');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  const reset = () => {
    setStatus('idle');
    setPreview(null);
    setResult(null);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-900 via-emerald-950 to-gray-950 text-white p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 mb-3">
            <Zap className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold">Auto Pin Sheet Scanner</h1>
          <p className="text-emerald-300/70 text-sm mt-1">{courseName}</p>
        </div>

        {/* Idle State - Upload Options */}
        {status === 'idle' && (
          <div className="space-y-4">
            <div 
              onClick={() => cameraInputRef.current?.click()}
              className="aspect-video rounded-2xl border-2 border-dashed border-emerald-500/40 
                         bg-emerald-800/20 backdrop-blur flex flex-col items-center justify-center
                         cursor-pointer hover:bg-emerald-800/30 transition-colors"
            >
              <Camera className="w-12 h-12 text-emerald-400 mb-3" />
              <p className="text-emerald-200 font-medium">Take Photo of Pin Sheet</p>
              <p className="text-emerald-400/60 text-sm mt-1">AI will read all 18 holes automatically</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 py-4 
                           bg-emerald-500 hover:bg-emerald-400 rounded-xl font-semibold transition-colors"
              >
                <Camera className="w-5 h-5" />
                Camera
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 py-4 
                           bg-emerald-700 hover:bg-emerald-600 rounded-xl font-semibold transition-colors"
              >
                <Upload className="w-5 h-5" />
                Gallery
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="bg-emerald-800/30 rounded-xl p-4 text-sm">
              <p className="text-emerald-300 font-medium mb-2">How it works:</p>
              <ol className="text-emerald-400/80 space-y-1 list-decimal list-inside">
                <li>Snap a photo of the pin sheet board</li>
                <li>AI reads all 18 pin locations instantly</li>
                <li>Golfers see updated pins in their app</li>
              </ol>
            </div>
          </div>
        )}

        {/* Processing State */}
        {(status === 'uploading' || status === 'processing') && (
          <div className="space-y-4">
            {preview && (
              <div className="relative rounded-2xl overflow-hidden">
                <img src={preview} alt="Pin sheet" className="w-full opacity-50" />
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                  <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mb-3" />
                  <p className="text-white font-medium">
                    {status === 'uploading' ? 'Uploading...' : 'AI Reading Pin Sheet...'}
                  </p>
                  <p className="text-emerald-300/70 text-sm">Detecting all 18 holes</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="space-y-4">
            {preview && (
              <img src={preview} alt="Pin sheet" className="w-full rounded-2xl opacity-70" />
            )}
            
            <div className="flex items-start gap-3 p-4 bg-red-500/20 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-200 font-medium">Scan Failed</p>
                <p className="text-red-300/70 text-sm mt-1">{errorMessage}</p>
              </div>
            </div>

            <button
              onClick={reset}
              className="w-full flex items-center justify-center gap-2 py-4 
                         bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              Try Again
            </button>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && result && (
          <div className="space-y-4">
            {/* Success Header */}
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 mb-3">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-lg font-bold">Pin Sheet Scanned!</h2>
              <p className="text-emerald-300/70 text-sm">{result.message}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-emerald-800/30 rounded-xl text-center">
                <div className="text-3xl font-bold text-emerald-400">{result.pins?.length || 0}</div>
                <div className="text-emerald-300/60 text-sm">Holes Detected</div>
              </div>
              {result.green_speed && (
                <div className="p-4 bg-emerald-800/30 rounded-xl text-center">
                  <div className="text-3xl font-bold text-emerald-400">{result.green_speed}</div>
                  <div className="text-emerald-300/60 text-sm">Green Speed</div>
                </div>
              )}
            </div>

            {/* Date */}
            {result.date && (
              <div className="p-3 bg-emerald-800/30 rounded-xl flex items-center justify-between">
                <span className="text-emerald-300/70">Effective Date</span>
                <span className="font-semibold">{result.date}</span>
              </div>
            )}

            {/* Pin Grid */}
            {result.pins && result.pins.length > 0 && (
              <div className="bg-emerald-800/30 rounded-xl p-4">
                <div className="text-emerald-300/70 text-sm mb-3">Detected Pin Positions</div>
                <div className="grid grid-cols-3 gap-2">
                  {result.pins.slice(0, 18).map(pin => (
                    <div 
                      key={pin.hole_number}
                      className="flex items-center gap-2 p-2 bg-emerald-900/50 rounded-lg"
                    >
                      <MiniGreen x={pin.x_position} y={pin.y_position} />
                      <div>
                        <div className="text-white font-bold text-sm">{pin.hole_number}</div>
                        <div className="text-emerald-400/70 text-[10px] capitalize">
                          {pin.position_label.replace('-', ' ')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <button
              onClick={reset}
              className="w-full flex items-center justify-center gap-2 py-4 
                         bg-emerald-500 hover:bg-emerald-400 rounded-xl font-semibold transition-colors"
            >
              <Camera className="w-5 h-5" />
              Scan Another
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-emerald-400/50 text-xs">
          <p>Powered by Claude Vision AI</p>
          <p className="mt-1">Pin locations sync to all golfer apps instantly</p>
        </div>
      </div>
    </div>
  );
}
