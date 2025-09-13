import { useState } from 'react';
import { Play } from 'lucide-react';

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

  const handleVideoClick = () => {
    window.open(video.video_link, '_blank', 'noopener,noreferrer');
  };

  return (
    <div 
      className="video-card animate-fade-in" 
      style={{ animationDelay: `${index * 0.1}s` }}
      onClick={handleVideoClick}
    >
      <div className="relative overflow-hidden rounded-lg aspect-video">
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-secondary animate-pulse">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
          </div>
        )}
        
        {!imageError ? (
          <img
            src={video.thumbnail_link}
            alt="Video thumbnail"
            className={`video-thumbnail ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageError(true);
              setImageLoaded(true);
            }}
            loading="lazy"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-secondary">
            <div className="text-muted-foreground text-sm">Failed to load</div>
          </div>
        )}
        
        <div className="video-overlay" />
        
        <div className="play-button">
          <Play className="w-6 h-6 text-background ml-1" fill="currentColor" />
        </div>
      </div>
    </div>
  );
};

export default VideoCard;