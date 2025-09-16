interface VideoUrlResult {
  success: boolean;
  directUrl?: string;
  error?: string;
}

class VideoService {
  private static readonly STREAM_ENDPOINT = 'http://92.112.127.193:8000/stream-video';

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
   * Stream video through our proxy server
   */
  static async playVideo(videoLink: string): Promise<void> {
    try {
      const debug = (typeof localStorage !== 'undefined' && localStorage.getItem('DEBUG_STREAM') === '1') ? '&debug=1' : '';
      const streamUrl = `${this.STREAM_ENDPOINT}?url=${encodeURIComponent(videoLink)}&action=stream${debug}`;
      window.open(streamUrl, '_blank');
    } catch (error) {
      console.error('Error streaming video:', error);
      // Fallback: Open embed player
      this.openEmbedPlayer(videoLink);
    }
  }

  /**
   * Download video through our proxy server
   */
  static async downloadVideo(videoLink: string, filename?: string): Promise<void> {
    try {
      const debug = (typeof localStorage !== 'undefined' && localStorage.getItem('DEBUG_STREAM') === '1') ? '&debug=1' : '';
      const downloadUrl = `${this.STREAM_ENDPOINT}?url=${encodeURIComponent(videoLink)}&action=download&filename=${encodeURIComponent(filename || 'video.mp4')}${debug}`;
      
      // Create a temporary link to trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || 'video.mp4';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: Open embed player
      this.openEmbedPlayer(videoLink);
    }
  }
}

export default VideoService;
