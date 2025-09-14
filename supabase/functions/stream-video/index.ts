import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
  'Referer': 'https://d-s.io/'
};

/**
 * Extract pass_md5 path from HTML content
 */
function extractPassMd5(html: string): string {
  const regex = /\/pass_md5\/[\w\-/]+/;
  const match = html.match(regex);
  if (!match) {
    throw new Error('Could not extract pass_md5 path from HTML');
  }
  return match[0];
}

/**
 * Generate random tail (same as Python script)
 */
function randomTail(length: number = 10): string {
  const pool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += pool.charAt(Math.floor(Math.random() * pool.length));
  }
  return result;
}

/**
 * Get direct video URL from d-s.io embed URL
 */
async function getDirectUrl(embedUrl: string): Promise<string> {
  // Step 1: Fetch embed page HTML
  const embedResponse = await fetch(embedUrl, {
    headers: HEADERS
  });
  
  if (!embedResponse.ok) {
    throw new Error(`Failed to fetch embed page: ${embedResponse.status}`);
  }

  const html = await embedResponse.text();
  const passPath = extractPassMd5(html);

  // Build token and expiry
  const token = passPath.split('/').pop() || '';
  const expiry = Date.now();

  // Step 2: Call pass_md5 endpoint
  const md5Url = `https://d-s.io${passPath}`;
  const md5Response = await fetch(md5Url, {
    headers: HEADERS
  });

  if (!md5Response.ok) {
    throw new Error(`Failed to fetch MD5 endpoint: ${md5Response.status}`);
  }

  const base = (await md5Response.text()).trim();

  // Step 3: Generate final URL
  const tail = randomTail();
  const directUrl = `${base}${tail}?token=${token}&expiry=${expiry}`;

  return directUrl;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const embedUrl = url.searchParams.get('url');
    const action = url.searchParams.get('action') || 'stream';
    
    if (!embedUrl) {
      return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${action} request for:`, embedUrl);

    // Get the direct video URL
    const directUrl = await getDirectUrl(embedUrl);
    console.log('Direct URL obtained:', directUrl);

    // If this is just a URL request, return the URL
    if (action === 'url') {
      return new Response(JSON.stringify({ directUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For streaming/downloading, proxy the video
    const range = req.headers.get('range');
    const videoHeaders: Record<string, string> = { ...HEADERS };
    
    if (range) {
      videoHeaders['Range'] = range;
    }

    const videoResponse = await fetch(directUrl, {
      headers: videoHeaders
    });

    if (!videoResponse.ok) {
      throw new Error(`Failed to fetch video: ${videoResponse.status}`);
    }

    // Get the video stream
    const videoStream = videoResponse.body;
    if (!videoStream) {
      throw new Error('No video stream available');
    }

    // Set up response headers
    const responseHeaders = new Headers(corsHeaders);
    
    // Copy relevant headers from the video response
    const contentType = videoResponse.headers.get('content-type') || 'video/mp4';
    const contentLength = videoResponse.headers.get('content-length');
    const acceptRanges = videoResponse.headers.get('accept-ranges');
    const contentRange = videoResponse.headers.get('content-range');
    
    responseHeaders.set('Content-Type', contentType);
    if (contentLength) responseHeaders.set('Content-Length', contentLength);
    if (acceptRanges) responseHeaders.set('Accept-Ranges', acceptRanges);
    if (contentRange) responseHeaders.set('Content-Range', contentRange);

    // For download action, set download headers
    if (action === 'download') {
      const filename = url.searchParams.get('filename') || 'video.mp4';
      responseHeaders.set('Content-Disposition', `attachment; filename="${filename}"`);
    }

    const status = range ? (videoResponse.status || 206) : 200;

    return new Response(videoStream, {
      status,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('Error in stream-video function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});