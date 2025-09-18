import { useState, useEffect } from 'react';
import VideoGallery from '@/components/VideoGallery';
import { VideoData } from '@/types/video';

const Index = () => {
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVideoData = async () => {
      try {
        const { default: data } = await import('@/data/sampleVideos.json');
        setVideoData(data as VideoData);
      } catch (error) {
        console.error('Failed to load video data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadVideoData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading videos...</p>
        </div>
      </div>
    );
  }

  if (!videoData) {
    return (
      <div className="min-h-screen bg-background py-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Failed to load videos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <VideoGallery videoData={videoData} />
    </div>
  );
};

export default Index;
