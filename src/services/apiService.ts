interface PaginationInfo {
  current_page: number;
  per_page: number;
  total_videos?: number;
  total_results?: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface VideosResponse {
  success: boolean;
  videos: Array<{
    page_link: string;
    video_link: string;
    thumbnail_color?: string;
    category?: string;
  }>;
  pagination: PaginationInfo;
}

interface CategoriesResponse {
  success: boolean;
  categories: string[];
}

interface SearchResponse {
  success: boolean;
  videos: Array<{
    page_link: string;
    video_link: string;
    thumbnail_color?: string;
    category: string;
  }>;
  pagination: PaginationInfo;
  query: string;
}

class ApiService {
  private static readonly BASE_URL = 'https://r.nagoz.ir:8000/api';

  /**
   * Get all available categories
   */
  static async getCategories(): Promise<string[]> {
    try {
      const response = await fetch(`${this.BASE_URL}/categories`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: CategoriesResponse = await response.json();
      return data.success ? data.categories : [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  /**
   * Get paginated videos for a specific category
   */
  static async getVideos(
    category: string, 
    page: number = 1, 
    perPage: number = 20
  ): Promise<VideosResponse | null> {
    try {
      const url = `${this.BASE_URL}/videos?category=${encodeURIComponent(category)}&page=${page}&per_page=${perPage}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: VideosResponse = await response.json();
      return data.success ? data : null;
    } catch (error) {
      console.error('Error fetching videos:', error);
      return null;
    }
  }

  /**
   * Search videos across categories
   */
  static async searchVideos(
    query: string,
    category?: string,
    page: number = 1,
    perPage: number = 20
  ): Promise<SearchResponse | null> {
    try {
      let url = `${this.BASE_URL}/search?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`;
      if (category) {
        url += `&category=${encodeURIComponent(category)}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: SearchResponse = await response.json();
      return data.success ? data : null;
    } catch (error) {
      console.error('Error searching videos:', error);
      return null;
    }
  }
}

export default ApiService;
export type { PaginationInfo, VideosResponse, CategoriesResponse, SearchResponse };