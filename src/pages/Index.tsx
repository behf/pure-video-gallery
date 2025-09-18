import { useState, useEffect } from 'react';
import VideoGallery from '@/components/VideoGallery';
import ApiService from '@/services/apiService';
import { Video } from '@/types/video';

const Index = () => {
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoriesData = await ApiService.getCategories();
        setCategories(categoriesData);
      } catch (error) {
        console.error('Failed to load categories:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
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

  if (categories.length === 0 && !loading) {
    return (
      <div className="min-h-screen bg-background py-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Failed to load categories</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <VideoGallery categories={categories} />
    </div>
  );
};

export default Index;
