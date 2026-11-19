import { Platform } from 'react-native';
import type { FoundDraft, FoundReport } from './model';

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/$/, '');
// Public prototype token, never a production credential. Real identity integration is separate work.
const DEV_TOKEN = process.env.EXPO_PUBLIC_DEV_AUTH_TOKEN ?? (__DEV__ ? 'dev-token-alice' : '');

type ApiReport = {
  id: string;
  location: string;
  drop_off: string;
  description: string;
  question: string;
  status: 'available';
  created_at: string;
  image_url: string;
};

class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function fromApi(report: ApiReport): FoundReport {
  return {
    id: report.id, location: report.location, dropOff: report.drop_off,
    description: report.description, question: report.question,
    createdAt: report.created_at, status: 'Available', imageUrl: API_URL + report.image_url,
  };
}

async function request(path: string, options: RequestInit = {}): Promise<ApiReport> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(API_URL + path, {
      ...options,
      headers: { Authorization: `Bearer ${DEV_TOKEN}`, ...options.headers },
      signal: controller.signal,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const detail = typeof body?.detail === 'string' ? body.detail : null;
      throw new ApiError(detail ?? 'The server could not complete this request. Please try again.', response.status);
    }
    return await response.json();
  } catch (failure) {
    if (failure instanceof ApiError) throw failure;
    throw new Error('Could not reach the server. Check your connection and try again.');
  } finally {
    clearTimeout(timeout);
  }
}

export const reportRepository = {
  async save(draft: FoundDraft): Promise<FoundReport> {
    if (!draft.photo) throw new Error('Add a photo of the found item.');
    const form = new FormData();
    form.append('location', draft.location.trim());
    form.append('drop_off', draft.dropOff.trim());
    form.append('description', draft.description.trim());
    form.append('question', draft.question.trim());
    if (Platform.OS === 'web') {
      const photo = await fetch(draft.photo.uri);
      form.append('image', await photo.blob(), draft.photo.name);
    } else {
      // React Native FormData uploads local file URIs without converting them to JSON/base64.
      form.append('image', {
        uri: draft.photo.uploadUri ?? draft.photo.uri,
        name: draft.photo.name,
        type: draft.photo.mimeType,
      } as unknown as Blob);
    }
    return fromApi(await request('/found-reports', { method: 'POST', body: form }));
  },
  async get(id: string): Promise<FoundReport | null> {
    try {
      return fromApi(await request(`/found-reports/${encodeURIComponent(id)}`));
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 404) return null;
      throw failure;
    }
  },
};
