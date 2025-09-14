interface VideoUrlResult {
  success: boolean;
  directUrl?: string;
  error?: string;
}

class VideoService {
  private static readonly HEADERS = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
    'Referer': 'https://d-s.io/'
  };

  /**
   * Extract pass_md5 path from HTML content
   */
  private static extractPassMd5(html: string): string {
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
  private static randomTail(length: number = 10): string {
    const pool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += pool.charAt(Math.floor(Math.random() * pool.length));
    }
    return result;
  }

  /**
   * Get direct video URL from d-s.io embed URL
   * Note: This may fail due to CORS restrictions in browser
   */
  static async getDirectUrl(embedUrl: string): Promise<VideoUrlResult> {
    try {
      // Step 1: Fetch embed page HTML
      const embedResponse = await fetch(embedUrl, {
        headers: this.HEADERS,
        mode: 'cors'
      });
      
      if (!embedResponse.ok) {
        throw new Error(`Failed to fetch embed page: ${embedResponse.status}`);
      }

      const html = await embedResponse.text();
      const passPath = this.extractPassMd5(html);

      // Build token and expiry
      const token = passPath.split('/').pop() || '';
      const expiry = Date.now();

      // Step 2: Call pass_md5 endpoint
      const md5Url = `https://d-s.io${passPath}`;
      const md5Response = await fetch(md5Url, {
        headers: this.HEADERS,
        mode: 'cors'
      });

      if (!md5Response.ok) {
        throw new Error(`Failed to fetch MD5 endpoint: ${md5Response.status}`);
      }

      const base = (await md5Response.text()).trim();

      // Step 3: Generate final URL
      const tail = this.randomTail();
      const directUrl = `${base}${tail}?token=${token}&expiry=${expiry}`;

      return { success: true, directUrl };

    } catch (error) {
      console.error('Error extracting direct URL:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Check if video URL is accessible (CORS-friendly)
   */
  static async checkVideoAccess(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: this.HEADERS,
        mode: 'cors'
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Fallback: Open embed URL in new window for streaming
   */
  static openEmbedPlayer(embedUrl: string): void {
    const playerWindow = window.open(
      embedUrl,
      '_blank',
      'width=1024,height=576,scrollbars=yes,resizable=yes'
    );
    
    if (!playerWindow) {
      // Fallback if popup is blocked
      window.location.href = embedUrl;
    }
  }

  /**
   * Main method to handle video playback with fallbacks
   */
  static async playVideo(videoLink: string): Promise<void> {
    try {
      // First try to get direct URL
      const result = await this.getDirectUrl(videoLink);
      
      if (result.success && result.directUrl) {
        // Check if we can access the direct URL
        const canAccess = await this.checkVideoAccess(result.directUrl);
        
        if (canAccess) {
          // Open direct video URL
          window.open(result.directUrl, '_blank');
          return;
        }
      }
      
      // Fallback: Open embed player
      this.openEmbedPlayer(videoLink);
      
    } catch (error) {
      console.error('Error playing video:', error);
      // Final fallback: Open embed player
      this.openEmbedPlayer(videoLink);
    }
  }

  /**
   * Download video (may not work due to CORS)
   */
  static async downloadVideo(videoLink: string, filename?: string): Promise<void> {
    try {
      const result = await this.getDirectUrl(videoLink);
      
      if (result.success && result.directUrl) {
        // Try to download directly
        const link = document.createElement('a');
        link.href = result.directUrl;
        link.download = filename || 'video.mp4';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        throw new Error(result.error || 'Could not get direct URL');
      }
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: Open video in new tab
      window.open(videoLink, '_blank');
    }
  }
}

export default VideoService;