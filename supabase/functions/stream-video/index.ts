import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
  'Referer': 'https://d-s.io/',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9'
};

/**
 * Extract pass_md5 path from HTML content using HTML parsing
 */
function extractPassMd5(html: string): string {
  try {
    // Use DOMParser to parse HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Look for pass_md5 in various places
    const sources = [
      // Check all script tags for pass_md5 references
      ...Array.from(doc.querySelectorAll('script')).map(script => script.textContent || ''),
      // Check data attributes
      ...Array.from(doc.querySelectorAll('[data-src], [data-url], [data-path]')).map(el => 
        el.getAttribute('data-src') || el.getAttribute('data-url') || el.getAttribute('data-path') || ''
      ),
      // Check href and src attributes
      ...Array.from(doc.querySelectorAll('a[href], link[href], script[src]')).map(el => 
        el.getAttribute('href') || el.getAttribute('src') || ''
      ),
      // Check the entire HTML as fallback
      html
    ];

    // Look for pass_md5 pattern in all sources
    const patterns = [
      /\/pass_md5\/[A-Za-z0-9\/_-]+/i,
      /"\/pass_md5\/[A-Za-z0-9\/_-]+"/i,
      /https?:\/\/[^"'\s]+\/pass_md5\/[A-Za-z0-9\/_-]+/i,
    ];

    for (const source of sources) {
      if (!source) continue;
      
      for (const pattern of patterns) {
        const match = source.match(pattern);
        if (match) {
          const raw = match[0].replace(/^"|"$/g, '');
          const idx = raw.indexOf('/pass_md5/');
          const result = idx >= 0 ? raw.slice(idx) : raw;
          console.log('Found pass_md5 path:', result);
          return result;
        }
      }
    }

    // Log debugging info if nothing found
    console.log('extractPassMd5: no match found');
    console.log('Script contents:', Array.from(doc.querySelectorAll('script')).map(s => s.textContent?.slice(0, 200)).filter(Boolean));
    console.log('HTML snippet:', html.slice(0, 400));
    
    throw new Error('Could not extract pass_md5 path from HTML');
  } catch (error) {
    console.error('Error parsing HTML:', error);
    // Fallback to regex if DOM parsing fails
    const pattern = /\/pass_md5\/[A-Za-z0-9\/_-]+/i;
    const match = html.match(pattern);
    if (match) {
      return match[0];
    }
    throw new Error('Could not extract pass_md5 path from HTML');
  }
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
async function getDirectUrl(embedUrl: string, debug: boolean = false): Promise<string> {
  // Step 1: Fetch embed page HTML
  const embedResponse = await fetch(embedUrl, {
    headers: HEADERS
  });

  console.log('Embed fetch:', {
    url: embedUrl,
    status: embedResponse.status,
    ok: embedResponse.ok,
    contentType: embedResponse.headers.get('content-type')
  });

  const html = await embedResponse.text();
  if (debug) {
    console.log('Embed HTML (first 2000 chars):', html.slice(0, 2000));
  }

  if (!embedResponse.ok) {
    throw new Error(`Failed to fetch embed page: ${embedResponse.status}`);
  }

  const passPath = extractPassMd5(html);

  // Build token and expiry
  const token = passPath.split('/').pop() || '';
  const expiry = Date.now();

  // Step 2: Call pass_md5 endpoint
  const md5Url = `https://d-s.io${passPath}`;
  const md5Response = await fetch(md5Url, {
    headers: HEADERS
  });

  console.log('MD5 fetch:', {
    url: md5Url,
    status: md5Response.status,
    ok: md5Response.ok,
    contentType: md5Response.headers.get('content-type')
  });

  const md5Body = await md5Response.text();
  if (!md5Response.ok) {
    if (debug) console.log('MD5 body (first 1000):', md5Body.slice(0, 1000));
    throw new Error(`Failed to fetch MD5 endpoint: ${md5Response.status}`);
  }

  const base = md5Body.trim();

  // Step 3: Generate final URL
  const tail = randomTail();
  const directUrl = `${base}${tail}?token=${token}&expiry=${expiry}`;
  if (debug) console.log('Direct URL built:', directUrl);

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
    const debug = ['1','true','yes','on'].includes((url.searchParams.get('debug') || '').toLowerCase());
    
    if (!embedUrl) {
      return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${action} request for:`, embedUrl);

    // Get the direct video URL
    const directUrl = await getDirectUrl(embedUrl, debug);
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