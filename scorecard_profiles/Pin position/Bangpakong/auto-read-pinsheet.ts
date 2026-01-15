// MyCaddiPro Automated Pin Sheet Reader
// Uses Claude Vision API to extract pin locations from photos
// No OpenCV needed - Claude already understands golf pin sheets

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.24.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PinPosition {
  hole_number: number;
  x_position: number;
  y_position: number;
  position_label: string;
}

interface PinSheetAnalysis {
  course_name: string | null;
  date: string | null;
  green_speed: string | null;
  pins: PinPosition[];
}

// Position label to normalized coordinates mapping
const POSITION_COORDS: Record<string, { x: number; y: number }> = {
  'front-left': { x: 0.2, y: 0.2 },
  'front': { x: 0.5, y: 0.2 },
  'front-center': { x: 0.5, y: 0.2 },
  'front-right': { x: 0.8, y: 0.2 },
  'left': { x: 0.2, y: 0.5 },
  'middle-left': { x: 0.2, y: 0.5 },
  'center-left': { x: 0.35, y: 0.5 },
  'center': { x: 0.5, y: 0.5 },
  'middle': { x: 0.5, y: 0.5 },
  'middle-center': { x: 0.5, y: 0.5 },
  'center-right': { x: 0.65, y: 0.5 },
  'right': { x: 0.8, y: 0.5 },
  'middle-right': { x: 0.8, y: 0.5 },
  'back-left': { x: 0.2, y: 0.8 },
  'back': { x: 0.5, y: 0.8 },
  'back-center': { x: 0.5, y: 0.8 },
  'back-right': { x: 0.8, y: 0.8 },
};

function normalizePosition(label: string): { x: number; y: number } {
  const normalized = label.toLowerCase().trim().replace(/\s+/g, '-');
  
  // Direct match
  if (POSITION_COORDS[normalized]) {
    return POSITION_COORDS[normalized];
  }
  
  // Parse compound positions
  const parts = normalized.split('-');
  let x = 0.5, y = 0.5;
  
  for (const part of parts) {
    if (part === 'front') y = 0.2;
    else if (part === 'back') y = 0.8;
    else if (part === 'left') x = 0.2;
    else if (part === 'right') x = 0.8;
    else if (part === 'center' || part === 'middle') {
      // Keep at 0.5
    }
  }
  
  return { x, y };
}

async function analyzePinSheet(imageBase64: string, mimeType: string): Promise<PinSheetAnalysis> {
  const anthropic = new Anthropic({
    apiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
  });

  const response = await anthropic.messages.create({
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
              media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: `Analyze this golf course pin sheet image and extract the pin locations for all 18 holes.

For each hole, identify where the black dot (pin marker) is positioned within the circular green diagram.

Return your response as valid JSON only, with no additional text:

{
  "course_name": "string or null if not visible",
  "date": "YYYY-MM-DD format or null if not visible", 
  "green_speed": "string like 9'4\" or null if not visible",
  "pins": [
    {
      "hole_number": 1,
      "position_label": "back-right"
    },
    ...for all 18 holes
  ]
}

Position labels should be one of:
- front-left, front, front-right
- left, center, right  
- back-left, back, back-right

Or combinations like "middle-right", "back-center", etc.

Analyze each circular green diagram carefully. The dot position relative to the grid lines indicates:
- Vertical: front (top), middle, back (bottom)
- Horizontal: left, center, right

Return ONLY the JSON, no markdown code blocks or other text.`,
          },
        ],
      },
    ],
  });

  // Extract text response
  const textContent = response.content.find(c => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  // Parse JSON response
  let analysis: { course_name?: string; date?: string; green_speed?: string; pins: Array<{ hole_number: number; position_label: string }> };
  
  try {
    // Clean up response in case Claude added markdown
    let jsonStr = textContent.text.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
    }
    analysis = JSON.parse(jsonStr);
  } catch (e) {
    console.error('Failed to parse Claude response:', textContent.text);
    throw new Error('Failed to parse pin sheet analysis');
  }

  // Convert to full PinPosition objects with coordinates
  const pins: PinPosition[] = analysis.pins.map(p => {
    const coords = normalizePosition(p.position_label);
    return {
      hole_number: p.hole_number,
      x_position: coords.x,
      y_position: coords.y,
      position_label: p.position_label.toLowerCase().replace(/\s+/g, '-'),
    };
  });

  return {
    course_name: analysis.course_name || null,
    date: analysis.date || null,
    green_speed: analysis.green_speed || null,
    pins,
  };
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
    );

    // Get user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const { course_id, image_base64, image_mime_type = 'image/jpeg', date_override } = await req.json();

    if (!course_id || !image_base64) {
      return new Response(
        JSON.stringify({ error: 'course_id and image_base64 are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify course staff permission
    const { data: staffRecord } = await supabase
      .from('course_staff')
      .select('role')
      .eq('course_id', course_id)
      .eq('user_id', user.id)
      .single();

    if (!staffRecord) {
      return new Response(
        JSON.stringify({ error: 'Not authorized for this course' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing pin sheet with Claude Vision...');
    
    // Analyze with Claude
    const analysis = await analyzePinSheet(image_base64, image_mime_type);
    
    console.log(`Detected ${analysis.pins.length} pin positions`);

    // Use detected date, override, or today
    const pinDate = date_override || analysis.date || new Date().toISOString().split('T')[0];

    // Upload image to storage
    const imagePath = `${course_id}/${pinDate}/${Date.now()}.jpg`;
    const imageBuffer = Uint8Array.from(atob(image_base64), c => c.charCodeAt(0));
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('pin-sheets')
      .upload(imagePath, imageBuffer, { contentType: image_mime_type, upsert: true });

    let sourceImageUrl: string | undefined;
    if (!uploadError && uploadData) {
      const { data: { publicUrl } } = supabase.storage.from('pin-sheets').getPublicUrl(uploadData.path);
      sourceImageUrl = publicUrl;
    }

    // Upsert pin sheet record
    const { data: pinSheet, error: sheetError } = await supabase
      .from('pin_sheets')
      .upsert({
        course_id,
        date: pinDate,
        green_speed: analysis.green_speed,
        source_image_url: sourceImageUrl,
        processing_status: 'auto_verified',
        created_by: user.id,
      }, { onConflict: 'course_id,date' })
      .select('id')
      .single();

    if (sheetError || !pinSheet) {
      console.error('Pin sheet error:', sheetError);
      return new Response(
        JSON.stringify({ error: 'Failed to save pin sheet', details: sheetError?.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clear existing positions and insert new ones
    await supabase.from('pin_positions').delete().eq('pin_sheet_id', pinSheet.id);

    const pinRecords = analysis.pins.map(p => ({
      pin_sheet_id: pinSheet.id,
      hole_number: p.hole_number,
      x_position: p.x_position,
      y_position: p.y_position,
      position_label: p.position_label,
    }));

    const { error: pinsError } = await supabase.from('pin_positions').insert(pinRecords);

    if (pinsError) {
      console.error('Pins error:', pinsError);
      return new Response(
        JSON.stringify({ error: 'Failed to save pins', details: pinsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return success with full analysis
    return new Response(
      JSON.stringify({
        success: true,
        message: `Automatically extracted ${analysis.pins.length} pin positions`,
        pin_sheet_id: pinSheet.id,
        date: pinDate,
        course_name: analysis.course_name,
        green_speed: analysis.green_speed,
        source_image_url: sourceImageUrl,
        pins: analysis.pins,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Processing failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
