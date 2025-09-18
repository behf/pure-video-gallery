import { useState, useEffect } from 'react';
import VideoCard from './VideoCard';
import CategoryTabs from './CategoryTabs';
import Pagination from './Pagination';
import { Video } from '@/types/video';
import ApiService, { VideosResponse } from '@/services/apiService';

interface VideoGalleryProps {
  categories: string[];
}

const VIDEOS_PER_PAGE = 12;

const VideoGallery = ({ categories }: VideoGalleryProps) => {
  const [activeCategory, setActiveCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [totalVideos, setTotalVideos] = useState(0);

  // Set initial category when categories are loaded
  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0]);
    }
  }, [categories, activeCategory]);

  // Load videos when category or page changes
  useEffect(() => {
    if (!activeCategory) return;

    const loadVideos = async () => {
      setLoading(true);
      try {
        const response = await ApiService.getVideos(activeCategory, currentPage, 20);
        if (response) {
          setVideos(response.videos);
          setTotalPages(response.pagination.total_pages);
          setTotalVideos(response.pagination.total_videos || 0);
        } else {
          setVideos([]);
          setTotalPages(0);
          setTotalVideos(0);
        }
      } catch (error) {
        console.error('Error loading videos:', error);
        setVideos([]);
        setTotalPages(0);
        setTotalVideos(0);
      } finally {
        setLoading(false);
      }
    };

    loadVideos();
  }, [activeCategory, currentPage]);

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
          {loading ? (
            'Loading videos...'
          ) : (
            <>
              Showing {Math.min((currentPage - 1) * 20 + 1, totalVideos)} - {Math.min(currentPage * 20, totalVideos)} of {totalVideos} videos in{' '}
              <span className="text-primary font-medium capitalize">{activeCategory}</span>
            </>
          )}
        </p>
        <p className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </p>
      </div>

      {/* Video Grid with Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 20 }).map((_, index) => (
            <div key={index} className="bg-card rounded-lg p-4 animate-pulse">
              <div className="w-full h-48 bg-muted rounded-lg mb-4"></div>
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-3 bg-muted rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
          {videos.map((video, index) => (
            <VideoCard
              key={`${activeCategory}-${currentPage}-${index}`}
              video={video}
              index={index}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && videos.length === 0 && (
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