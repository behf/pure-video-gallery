from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import httpx
import re
import json
import secrets
import string
from urllib.parse import unquote
from bs4 import BeautifulSoup
import asyncio

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Headers to mimic browser requests
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Referer': 'https://d-s.io/'
}

def extract_pass_md5(html: str, debug: bool = False) -> str:
    """Extract pass_md5 path from HTML using BeautifulSoup"""
    try:
        soup = BeautifulSoup(html, 'html.parser')
        
        if debug:
            print("HTML content length:", len(html))
        
        # Method 1: Look for script tags with pass_md5
        scripts = soup.find_all('script')
        for script in scripts:
            if script.string:
                # Look for patterns like "pass_md5":"something" or pass_md5: "something"
                patterns = [
                    r'"pass_md5"\s*:\s*"([^"]+)"',
                    r"'pass_md5'\s*:\s*'([^']+)'",
                    r'pass_md5\s*:\s*"([^"]+)"',
                    r'pass_md5\s*=\s*"([^"]+)"'
                ]
                
                for pattern in patterns:
                    match = re.search(pattern, script.string)
                    if match:
                        path = match.group(1)
                        if debug:
                            print(f"Found pass_md5 in script: {path}")
                        return path
        
        # Method 2: Look for data attributes
        elements_with_data = soup.find_all(attrs={'data-pass-md5': True})
        for element in elements_with_data:
            path = element.get('data-pass-md5')
            if path:
                if debug:
                    print(f"Found pass_md5 in data attribute: {path}")
                return path
        
        # Method 3: Look in the entire HTML content
        patterns = [
            r'"pass_md5"\s*:\s*"([^"]+)"',
            r"'pass_md5'\s*:\s*'([^']+)'",
            r'pass_md5\s*:\s*"([^"]+)"',
            r'pass_md5\s*=\s*"([^"]+)"',
            r'pass_md5["\']?\s*[:=]\s*["\']([^"\']+)["\']'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, html, re.IGNORECASE)
            if match:
                path = match.group(1)
                if debug:
                    print(f"Found pass_md5 in HTML: {path}")
                return path
        
        if debug:
            print("No pass_md5 found in HTML")
            # Print first 1000 chars for debugging
            print("HTML preview:", html[:1000])
        
        raise ValueError("Could not extract pass_md5 from HTML")
        
    except Exception as e:
        if debug:
            print(f"Error parsing HTML: {e}")
        raise ValueError(f"Error parsing HTML: {str(e)}")

def random_tail(length: int = 10) -> str:
    """Generate random string for URL tail"""
    return ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(length))

async def get_direct_url(embed_url: str, debug: bool = False) -> str:
    """Get direct video URL from embed URL"""
    try:
        if debug:
            print(f"Processing embed URL: {embed_url}")
        
        async with httpx.AsyncClient(headers=HEADERS, timeout=30.0) as client:
            # Step 1: Fetch the embed page
            if debug:
                print("Fetching embed page...")
            
            response = await client.get(embed_url)
            response.raise_for_status()
            html_content = response.text
            
            if debug:
                print(f"Got HTML response, length: {len(html_content)}")
            
            # Step 2: Extract pass_md5 path
            pass_md5_path = extract_pass_md5(html_content, debug)
            
            if debug:
                print(f"Extracted pass_md5 path: {pass_md5_path}")
            
            # Step 3: Call the pass_md5 endpoint
            base_url = embed_url.split('/embed/')[0] if '/embed/' in embed_url else embed_url.rsplit('/', 1)[0]
            pass_md5_url = f"{base_url}/{pass_md5_path}"
            
            if debug:
                print(f"Calling pass_md5 URL: {pass_md5_url}")
            
            pass_response = await client.get(pass_md5_url)
            pass_response.raise_for_status()
            pass_data = pass_response.json()
            
            if debug:
                print(f"Pass MD5 response: {pass_data}")
            
            # Step 4: Extract token and expiry
            token = pass_data.get('token', '')
            expiry = pass_data.get('expiry', '')
            
            if not token:
                raise ValueError("No token found in pass_md5 response")
            
            # Step 5: Construct direct URL
            tail = random_tail()
            direct_url = f"{base_url}/dl?token={token}&expiry={expiry}&tail={tail}"
            
            if debug:
                print(f"Generated direct URL: {direct_url}")
            
            return direct_url
            
    except Exception as e:
        if debug:
            print(f"Error getting direct URL: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing video: {str(e)}")

@app.get("/")
async def root():
    return {"message": "Video Proxy API", "status": "running"}

@app.get("/stream-video")
async def stream_video(url: str, action: str = "stream", filename: str = "video.mp4", debug: str = "0"):
    """Main endpoint for video streaming/downloading"""
    try:
        debug_mode = debug == "1"
        
        if debug_mode:
            print(f"Request: url={url}, action={action}, filename={filename}")
        
        # Decode URL if needed
        decoded_url = unquote(url)
        
        # Get direct video URL
        direct_url = await get_direct_url(decoded_url, debug_mode)
        
        if action == "url":
            return {"success": True, "directUrl": direct_url}
        
        # Stream or download the video
        async with httpx.AsyncClient(headers=HEADERS, timeout=60.0) as client:
            async with client.stream("GET", direct_url) as response:
                response.raise_for_status()
                
                # Prepare response headers
                headers = {
                    "Content-Type": response.headers.get("content-type", "video/mp4"),
                    "Accept-Ranges": "bytes"
                }
                
                # Copy relevant headers
                for header in ["content-length", "content-range", "last-modified", "etag"]:
                    if header in response.headers:
                        headers[header.title()] = response.headers[header]
                
                if action == "download":
                    headers["Content-Disposition"] = f'attachment; filename="{filename}"'
                
                async def generate():
                    async for chunk in response.aiter_bytes(chunk_size=8192):
                        yield chunk
                
                return StreamingResponse(
                    generate(),
                    headers=headers,
                    status_code=response.status_code
                )
                
    except HTTPException:
        raise
    except Exception as e:
        if debug_mode:
            print(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)