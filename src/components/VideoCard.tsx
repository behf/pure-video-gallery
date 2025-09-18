import { useState, useRef, useEffect } from 'react';
import { Play, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import VideoService from '@/services/videoService';

interface VideoCardProps {
  video: {
    video_link: string;
    thumbnail_link: string;
  };
  index: number;
}

const VideoCard = ({ video, index }: VideoCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handlePlayVideo = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(true);
    
    try {
      await VideoService.playVideo(video.video_link);
      toast({
        title: "Opening video player",
        description: "Video is loading in a new window",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open video player",
        variant: "destructive",
      });
    } finally {
      setIsPlaying(false);
    }
  };

  const handleDownloadVideo = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDownloading(true);
    
    try {
      await VideoService.downloadVideo(video.video_link, `video_${index}.mp4`);
      toast({
        title: "Download started",
        description: "Video download should begin shortly",
      });
    } catch (error) {
      toast({
        title: "Download failed", 
        description: "Opening video in new tab as fallback",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleEmbedPlayer = (e: React.MouseEvent) => {
    e.stopPropagation();
    VideoService.openEmbedPlayer(video.video_link);
  };

  return (
    <div 
      ref={cardRef}
      className="video-card animate-fade-in group" 
      style={{ animationDelay: `${Math.min(index * 0.05, 1)}s` }}
    >
      <div className="relative overflow-hidden rounded-lg aspect-video">
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-secondary animate-pulse">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
          </div>
        )}
        
        {!imageError && isVisible ? (
          <img
            src={video.thumbnail_link}
            alt="Video thumbnail"
            className={`video-thumbnail transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageError(true);
              setImageLoaded(true);
            }}
            decoding="async"
          />
        ) : (
          imageError && (
            <div className="flex items-center justify-center w-full h-full bg-secondary">
              <div className="text-muted-foreground text-sm">Failed to load</div>
            </div>
          )
        )}
        
        <div className="video-overlay" />
        
        {/* Main play button - center */}
        <div className="play-button" onClick={handlePlayVideo}>
          <Play className={`w-6 h-6 text-background ml-1 ${isPlaying ? 'animate-spin' : ''}`} fill="currentColor" />
        </div>

        {/* Action buttons - top right corner */}
        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 bg-black/50 hover:bg-black/70 text-white border-none"
            onClick={handlePlayVideo}
            disabled={isPlaying}
            title="Stream Video"
          >
            <Play className="h-4 w-4" />
          </Button>
          
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 bg-black/50 hover:bg-black/70 text-white border-none"
            onClick={handleDownloadVideo}
            disabled={isDownloading}
            title="Download Video"
          >
            <Download className={`h-4 w-4 ${isDownloading ? 'animate-pulse' : ''}`} />
          </Button>
          
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 bg-black/50 hover:bg-black/70 text-white border-none"
            onClick={handleEmbedPlayer}
            title="Open in Player"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;