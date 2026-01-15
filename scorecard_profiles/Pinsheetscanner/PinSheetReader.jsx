import { useState, useRef } from 'react';

export default function PinSheetReader() {
  const [status, setStatus] = useState('idle');
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const readPinSheet = async (file) => {
    setStatus('processing');
    setError(null);
    setResult(null);
    setPreview(URL.createObjectURL(file));

    try {
      // Convert image to base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Call Claude API (free in artifacts - no API key needed)
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
                source: {
                  type: 'base64',
                  media_type: file.type || 'image/jpeg',
                  data: base64
                }
              },
              {
                type: 'text',
                text: `Analyze this golf course pin sheet image. Extract the pin location for each hole.

Return ONLY valid JSON with no other text:
{
  "course_name": "course name if visible, or null",
  "date": "date in YYYY-MM-DD format if visible, or null",
  "green_speed": "green speed if visible (e.g. 9'4\\"), or null",
  "pins": [
    {"hole": 1, "position": "back-right"},
    {"hole": 2, "position": "center"},
    ... for all 18 holes
  ]
}

Position should be one of: front-left, front, front-right, left, center, right, back-left, back, back-right

Look at each circular green diagram. The black dot shows where the pin is located. The grid lines divide the green into thirds.`
              }
            ]
          }]
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'Failed to read pin sheet');
      }

      const data = await response.json();
      let text = data.content?.[0]?.text || '';
      
      // Clean up response
      if (text.startsWith('```')) {
        text = text.replace(/```json?\n?/g, '').replace(/```$/g, '');
      }
      
      const parsed = JSON.parse(text.trim());
      setResult(parsed);
      setStatus('success');

    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to process image');
      setStatus('error');
    }
  };

  const reset = () => {
    setStatus('idle');
    setPreview(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-900 via-emerald-950 to-black text-white p-4">
      <div className="max-w-md mx-auto">
        
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">MyCaddiPro</h1>
          <p className="text-emerald-400">Pin Sheet Scanner</p>
        </div>

        {/* Upload State */}
        {status === 'idle' && (
          <div className="space-y-4">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="aspect-video rounded-xl border-2 border-dashed border-emerald-500/50 bg-emerald-900/30 flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-900/50 transition"
            >
              <svg className="w-12 h-12 text-emerald-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-white font-medium">Upload Pin Sheet Photo</p>
              <p className="text-emerald-400/70 text-sm">Tap to select image</p>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 rounded-xl font-bold transition"
            >
              Select Image
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && readPinSheet(e.target.files[0])}
              className="hidden"
            />
          </div>
        )}

        {/* Processing */}
        {status === 'processing' && (
          <div className="space-y-4">
            <div className="relative rounded-xl overflow-hidden">
              <img src={preview} alt="Pin sheet" className="w-full opacity-50" />
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30">
                <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-white font-medium">Reading pin sheet...</p>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="space-y-4">
            <div className="p-4 bg-red-500/20 rounded-xl border border-red-500/50">
              <p className="text-red-200 font-medium">Error</p>
              <p className="text-red-300/80 text-sm">{error}</p>
            </div>
            <button onClick={reset} className="w-full py-3 bg-emerald-600 rounded-xl font-medium">
              Try Again
            </button>
          </div>
        )}

        {/* Success */}
        {status === 'success' && result && (
          <div className="space-y-4">
            
            {/* Course Info */}
            <div className="bg-emerald-800/40 rounded-xl p-4 text-center">
              <svg className="w-10 h-10 text-emerald-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <h2 className="text-xl font-bold">{result.course_name || 'Pin Locations'}</h2>
              <div className="flex justify-center gap-4 mt-2 text-sm">
                {result.date && <span className="text-emerald-300">{result.date}</span>}
                {result.green_speed && <span className="text-emerald-300">Speed: {result.green_speed}</span>}
              </div>
            </div>

            {/* Pin Locations Grid */}
            <div className="bg-emerald-800/30 rounded-xl p-4">
              <h3 className="text-emerald-300 text-sm mb-3">Pin Locations</h3>
              <div className="grid grid-cols-2 gap-2">
                {result.pins?.map((pin) => (
                  <div 
                    key={pin.hole} 
                    className="flex items-center gap-3 p-3 bg-black/30 rounded-lg"
                  >
                    <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center font-bold text-sm">
                      {pin.hole}
                    </div>
                    <span className="text-emerald-200 capitalize text-sm">
                      {pin.position?.replace('-', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* JSON Output for Database */}
            <div className="bg-emerald-800/30 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-emerald-300 text-sm">JSON Data</h3>
                <button 
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))}
                  className="text-emerald-400 text-xs hover:text-emerald-300"
                >
                  Copy
                </button>
              </div>
              <pre className="text-xs text-emerald-200/70 bg-black/30 p-2 rounded overflow-auto max-h-40">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>

            <button 
              onClick={reset} 
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 rounded-xl font-bold transition"
            >
              Scan Another
            </button>
          </div>
        )}

        <p className="text-center text-emerald-500/50 text-xs mt-6">www.MyCaddiPro.com</p>
      </div>
    </div>
  );
}
