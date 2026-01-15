import { useState, useRef } from 'react';

// Position label to coordinates
const POSITION_MAP = {
  'front-left': { x: 0.2, y: 0.2 },
  'front': { x: 0.5, y: 0.2 },
  'front-center': { x: 0.5, y: 0.2 },
  'front-right': { x: 0.8, y: 0.2 },
  'left': { x: 0.2, y: 0.5 },
  'middle-left': { x: 0.2, y: 0.5 },
  'center-left': { x: 0.35, y: 0.5 },
  'center': { x: 0.5, y: 0.5 },
  'middle': { x: 0.5, y: 0.5 },
  'center-right': { x: 0.65, y: 0.5 },
  'right': { x: 0.8, y: 0.5 },
  'middle-right': { x: 0.8, y: 0.5 },
  'back-left': { x: 0.2, y: 0.8 },
  'back': { x: 0.5, y: 0.8 },
  'back-center': { x: 0.5, y: 0.8 },
  'back-right': { x: 0.8, y: 0.8 },
};

function parsePosition(label) {
  const key = label.toLowerCase().trim().replace(/\s+/g, '-');
  if (POSITION_MAP[key]) return POSITION_MAP[key];
  
  let x = 0.5, y = 0.5;
  const parts = key.split('-');
  for (const part of parts) {
    if (part === 'front') y = 0.2;
    else if (part === 'back') y = 0.8;
    else if (part === 'left') x = 0.2;
    else if (part === 'right') x = 0.8;
  }
  return { x, y };
}

function MiniGreen({ x, y, size = 32 }) {
  return (
    <div 
      className="relative rounded-full shadow-inner flex-shrink-0"
      style={{ width: size, height: size, background: 'linear-gradient(to bottom, #22c55e, #16a34a)' }}
    >
      <div
        className="absolute w-2 h-2 bg-red-500 rounded-full shadow"
        style={{ left: `${x * 100}%`, top: `${y * 100}%`, transform: 'translate(-50%, -50%)' }}
      />
    </div>
  );
}

export default function PinSheetScanner() {
  const [status, setStatus] = useState('idle'); // idle, processing, success, error
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [jsonOutput, setJsonOutput] = useState(null);
  const fileInputRef = useRef(null);

  const processImage = async (file) => {
    setStatus('processing');
    setError(null);
    setResult(null);
    setJsonOutput(null);

    // Create preview
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);

    try {
      // Convert to base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Call Claude API (free via artifact capability)
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: file.type || 'image/jpeg', data: base64 }
              },
              {
                type: 'text',
                text: `Analyze this golf pin sheet image. Extract pin locations for all 18 holes.

Return ONLY valid JSON (no markdown, no explanation):
{
  "course_name": "string or null",
  "date": "YYYY-MM-DD or null",
  "green_speed": "e.g. 9'4\\" or null",
  "pins": [
    {"hole_number": 1, "position_label": "back-right"},
    {"hole_number": 2, "position_label": "center"},
    ...continue for all 18 holes
  ]
}

Position labels should be: front-left, front, front-right, left, center, right, back-left, back, back-right (or combinations like middle-right, back-center).

The black dot in each circular green diagram shows the pin position. The grid lines divide the green into thirds vertically and horizontally.`
              }
            ]
          }]
        })
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      const text = data.content?.[0]?.text || '';

      // Parse JSON response
      let parsed;
      try {
        let json = text.trim();
        if (json.startsWith('```')) {
          json = json.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
        }
        parsed = JSON.parse(json);
      } catch {
        throw new Error('Failed to parse response');
      }

      // Convert to full pin data with coordinates
      const pins = (parsed.pins || []).map(p => {
        const coords = parsePosition(p.position_label);
        return {
          hole_number: p.hole_number,
          x_position: coords.x,
          y_position: coords.y,
          position_label: p.position_label.toLowerCase().replace(/\s+/g, '-'),
        };
      });

      const finalResult = {
        course_name: parsed.course_name || null,
        date: parsed.date || null,
        green_speed: parsed.green_speed || null,
        pins
      };

      setResult(finalResult);
      setJsonOutput(JSON.stringify(finalResult, null, 2));
      setStatus('success');

    } catch (err) {
      setError(err.message || 'Processing failed');
      setStatus('error');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
  };

  const reset = () => {
    setStatus('idle');
    setPreview(null);
    setResult(null);
    setError(null);
    setJsonOutput(null);
  };

  const copyJson = () => {
    navigator.clipboard.writeText(jsonOutput);
  };

  return (
    <div className="min-h-screen text-white p-4" style={{ background: 'linear-gradient(to bottom, #064e3b, #022c22, #0a0a0a)' }}>
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/20 mb-2">
            <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold">Pin Sheet Scanner</h1>
          <p className="text-emerald-400/70 text-sm">Free • Powered by Claude Vision</p>
        </div>

        {/* Idle State */}
        {status === 'idle' && (
          <div className="space-y-4">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="aspect-video rounded-2xl border-2 border-dashed border-emerald-500/40 
                         bg-emerald-800/20 flex flex-col items-center justify-center
                         cursor-pointer hover:bg-emerald-800/30 transition-colors"
            >
              <svg className="w-12 h-12 text-emerald-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-emerald-200 font-medium">Upload Pin Sheet Photo</p>
              <p className="text-emerald-400/60 text-xs mt-1">AI reads all 18 holes automatically</p>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 rounded-xl font-semibold transition-colors"
            >
              Select Image
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {/* Processing State */}
        {status === 'processing' && (
          <div className="space-y-4">
            {preview && (
              <div className="relative rounded-2xl overflow-hidden">
                <img src={preview} alt="Pin sheet" className="w-full opacity-50" />
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                  <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-white font-medium">Reading Pin Sheet...</p>
                  <p className="text-emerald-300/70 text-sm">Detecting all 18 holes</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="space-y-4">
            {preview && <img src={preview} alt="Pin sheet" className="w-full rounded-2xl opacity-70" />}
            <div className="p-4 bg-red-500/20 rounded-xl flex items-start gap-3">
              <svg className="w-5 h-5 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                <path strokeWidth="2" d="M12 8v4m0 4h.01"/>
              </svg>
              <div>
                <p className="text-red-200 font-medium">Scan Failed</p>
                <p className="text-red-300/70 text-sm">{error}</p>
              </div>
            </div>
            <button onClick={reset} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-medium">
              Try Again
            </button>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && result && (
          <div className="space-y-4">
            {/* Success Header */}
            <div className="text-center py-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 mb-2">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-bold">Scan Complete!</h2>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 bg-emerald-800/30 rounded-xl text-center">
                <div className="text-2xl font-bold text-emerald-400">{result.pins?.length || 0}</div>
                <div className="text-emerald-300/60 text-xs">Holes</div>
              </div>
              <div className="p-3 bg-emerald-800/30 rounded-xl text-center">
                <div className="text-2xl font-bold text-emerald-400">{result.green_speed || '—'}</div>
                <div className="text-emerald-300/60 text-xs">Speed</div>
              </div>
              <div className="p-3 bg-emerald-800/30 rounded-xl text-center">
                <div className="text-2xl font-bold text-emerald-400">$0</div>
                <div className="text-emerald-300/60 text-xs">Cost</div>
              </div>
            </div>

            {/* Course & Date */}
            {(result.course_name || result.date) && (
              <div className="p-3 bg-emerald-800/30 rounded-xl text-sm">
                {result.course_name && <p className="text-white font-medium">{result.course_name}</p>}
                {result.date && <p className="text-emerald-400/70">{result.date}</p>}
              </div>
            )}

            {/* Pin Grid */}
            <div className="bg-emerald-800/30 rounded-xl p-3">
              <div className="text-emerald-300/70 text-xs mb-2">Detected Pins</div>
              <div className="grid grid-cols-3 gap-1.5">
                {result.pins?.map(pin => (
                  <div key={pin.hole_number} className="flex items-center gap-2 p-1.5 bg-emerald-900/50 rounded-lg">
                    <MiniGreen x={pin.x_position} y={pin.y_position} size={28} />
                    <div>
                      <div className="text-white font-bold text-xs">{pin.hole_number}</div>
                      <div className="text-emerald-400/70 text-[9px] capitalize">{pin.position_label.replace('-', ' ')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* JSON Output */}
            <div className="bg-emerald-800/30 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-emerald-300/70 text-xs">JSON Output (copy for MyCaddiPro)</span>
                <button 
                  onClick={copyJson}
                  className="text-emerald-400 text-xs hover:text-emerald-300 flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="9" y="9" width="13" height="13" rx="2" strokeWidth="2"/>
                    <path strokeWidth="2" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                  </svg>
                  Copy
                </button>
              </div>
              <pre className="text-[10px] text-emerald-200/80 overflow-x-auto max-h-32 overflow-y-auto bg-black/30 rounded p-2">
                {jsonOutput}
              </pre>
            </div>

            {/* Actions */}
            <button onClick={reset} className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 rounded-xl font-semibold">
              Scan Another
            </button>
          </div>
        )}

        <div className="mt-6 text-center text-emerald-500/40 text-xs">
          <p>No API key needed • Runs on your Claude subscription</p>
        </div>
      </div>
    </div>
  );
}
