import { api } from "./api";

export type FeedbackItem = {
  id: string;
  /** Null when the parent sent a suggestion without scoring anything. */
  rating: number | null;
  message: string | null;
  /** Null when the account has since been deleted. */
  from: string | null;
  createdAt: string;
};

export async function submitFeedback(message: string, rating?: number | null) {
  const { data } = await api.post<{ feedback: { id: string; rating: number | null } }>("/api/feedback", {
    message,
    rating: rating ?? null,
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

/** Admin: everything unread becomes read, clearing the home alert. */
export async function markFeedbackRead() {
  const { data } = await api.patch<{ marked: number }>("/api/feedback/read");
  return data.marked;
}
