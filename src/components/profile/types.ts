export type UserWithLoading = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
  special_badges: string[];
  is_friend?: boolean | null;
  loading?: boolean;
  error?: string;
};
