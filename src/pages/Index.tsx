import VideoGallery from '@/components/VideoGallery';
import sampleVideoData from '@/data/sampleVideos.json';
import { VideoData } from '@/types/video';

const Index = () => {
  return (
    <div className="min-h-screen bg-background py-8">
      <VideoGallery videoData={sampleVideoData as VideoData} />
    </div>
  );
};

export default Index;
