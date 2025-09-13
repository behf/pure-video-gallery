import { useState, useMemo } from 'react';
import VideoCard from './VideoCard';
import CategoryTabs from './CategoryTabs';
import Pagination from './Pagination';
import { Video, VideoData } from '@/types/video';

interface VideoGalleryProps {
  videoData: VideoData;
}

const VIDEOS_PER_PAGE = 12;

const VideoGallery = ({ videoData }: VideoGalleryProps) => {
  const [activeCategory, setActiveCategory] = useState<string>(() => 
    Object.keys(videoData)[0] || 'trending'
  );
  const [currentPage, setCurrentPage] = useState(1);

  const categories = Object.keys(videoData);
  const currentVideos = videoData[activeCategory] || [];

  const paginatedVideos = useMemo(() => {
    const startIndex = (currentPage - 1) * VIDEOS_PER_PAGE;
    const endIndex = startIndex + VIDEOS_PER_PAGE;
    return currentVideos.slice(startIndex, endIndex);
  }, [currentVideos, currentPage]);

  const totalPages = Math.ceil(currentVideos.length / VIDEOS_PER_PAGE);

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-6xl font-bold text-gradient mb-4">
          VideoStream
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Discover amazing videos across different categories. Click any thumbnail to watch.
        </p>
      </div>

      {/* Category Tabs */}
      <CategoryTabs
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
      />

      {/* Video Count */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-muted-foreground">
          Showing {paginatedVideos.length} of {currentVideos.length} videos in{' '}
          <span className="text-primary font-medium capitalize">{activeCategory}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </p>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        {paginatedVideos.map((video, index) => (
          <VideoCard
            key={`${activeCategory}-${currentPage}-${index}`}
            video={video}
            index={index}
          />
        ))}
      </div>

      {/* Empty State */}
      {paginatedVideos.length === 0 && (
        <div className="text-center py-16">
          <p className="text-xl text-muted-foreground">
            No videos found in this category.
          </p>
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
};

export default VideoGallery;