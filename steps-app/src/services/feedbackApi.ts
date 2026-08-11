import { api } from "./api";

export type FeedbackItem = {
  id: string;
  rating: number;
  message: string | null;
  /** Null when the account has since been deleted. */
  from: string | null;
  createdAt: string;
};

export async function submitFeedback(rating: number, message?: string) {
  const { data } = await api.post<{ feedback: { id: string; rating: number } }>("/api/feedback", {
    rating,
    message,
  });
  return data.feedback;
}

export async function listFeedback() {
  const { data } = await api.get<{
    feedback: FeedbackItem[];
    averageRating: number | null;
    total: number;
  }>("/api/feedback");
  return data;
}
