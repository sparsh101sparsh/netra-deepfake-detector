export interface Author {
  id?: string;
  name: string;
  email?: string;
  avatar?: string;
  avatar_index?: number;
  role?: string;
}

export interface CommunityPost {
  id: string;
  title: string;
  category: "DEEPFAKE" | "SCAM_ANALYSIS" | "VOICE_CLONE" | "SAFETY_GUIDE" | "THREAT_INTEL" | string;
  content: string;
  excerpt: string;
  cover_image?: string;
  embed_url?: string;
  author: Author;
  created_at: string;
  read_time: string;
  likes: number;
  views: number;
  tags: string[];
}
