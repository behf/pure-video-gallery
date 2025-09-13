export interface Video {
  page_link: string;
  video_link: string;
  thumbnail_link: string;
}

export interface VideoData {
  [category: string]: Video[];
}