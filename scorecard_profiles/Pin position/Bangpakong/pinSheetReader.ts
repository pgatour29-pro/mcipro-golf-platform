/**
 * MyCaddiPro Pin Sheet Reader
 * 
 * Reads golf course pin sheet images using Claude Vision API
 * and returns structured pin location data.
 * 
 * Usage:
 *   const pins = await readPinSheet(imageFile, ANTHROPIC_API_KEY);
 *   // Returns: { course_name, green_speed, pins: [...] }
 */

export interface PinPosition {
  hole_number: number;
  x_position: number;  // 0-1, left to right
  y_position: number;  // 0-1, front to back
  position_label: string;
}

export interface PinSheetData {
  course_name: string | null;
  date: string | null;
  green_speed: string | null;
  pins: PinPosition[];
}

// Position label to coordinates
const POSITION_MAP: Record<string, { x: number; y: number }> = {
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

function parsePosition(label: string): { x: number; y: number } {
  const key = label.toLowerCase().trim().replace(/\s+/g, '-');
  if (POSITION_MAP[key]) return POSITION_MAP[key];
  
  // Parse compound positions
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

/**
 * Read a pin sheet image and extract all pin locations
 */
export async function readPinSheet(
  image: File | Blob | string, // File, Blob, or base64 string
  apiKey: string
): Promise<PinSheetData> {
  
  // Convert to base64 if needed
  let base64: string;
  let mimeType = 'image/jpeg';
  
  if (typeof image === 'string') {
    // Already base64
    base64 = image.includes(',') ? image.split(',')[1] : image;
  } else {
    // File or Blob
    mimeType = image.type || 'image/jpeg';
    base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(image);
    });
  }

  // Call Claude API
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: base64,
              },
            },
            {
              type: 'text',
              text: `Analyze this golf pin sheet image. Extract pin locations for all 18 holes.

Return ONLY valid JSON (no markdown):
{
  "course_name": "string or null",
  "date": "YYYY-MM-DD or null",
  "green_speed": "e.g. 9'4\\" or null",
  "pins": [
    {"hole_number": 1, "position_label": "back-right"},
    ...all 18 holes
  ]
}

Position labels: front-left, front, front-right, left, center, right, back-left, back, back-right (or combinations like middle-right).

The black dot in each circle shows pin position. Grid lines divide into thirds.`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${error}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';
  
  // Parse response
  let parsed: any;
  try {
    let json = text.trim();
    if (json.startsWith('```')) {
      json = json.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
    }
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Failed to parse Claude response');
  }

  // Convert to full pin data with coordinates
  const pins: PinPosition[] = (parsed.pins || []).map((p: any) => {
    const coords = parsePosition(p.position_label);
    return {
      hole_number: p.hole_number,
      x_position: coords.x,
      y_position: coords.y,
      position_label: p.position_label.toLowerCase().replace(/\s+/g, '-'),
    };
  });

  return {
    course_name: parsed.course_name || null,
    date: parsed.date || null,
    green_speed: parsed.green_speed || null,
    pins,
  };
}

/**
 * Quick helper to read from a URL
 */
export async function readPinSheetFromUrl(
  imageUrl: string,
  apiKey: string
): Promise<PinSheetData> {
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  return readPinSheet(blob, apiKey);
}


// ============================================================
// Example Usage
// ============================================================

/*
// In React component:
import { readPinSheet } from './pinSheetReader';

const handleUpload = async (file: File) => {
  const result = await readPinSheet(file, process.env.ANTHROPIC_API_KEY!);
  
  console.log('Course:', result.course_name);
  console.log('Green Speed:', result.green_speed);
  console.log('Pins:', result.pins);
  
  // Save to database
  await supabase.from('pin_positions').insert(
    result.pins.map(p => ({
      pin_sheet_id: sheetId,
      hole_number: p.hole_number,
      x_position: p.x_position,
      y_position: p.y_position,
      position_label: p.position_label,
    }))
  );
};

// In Node.js/Deno:
const pins = await readPinSheet(fs.readFileSync('pinsheet.jpg'), API_KEY);
*/
