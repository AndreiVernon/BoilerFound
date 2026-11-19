export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export type Photo = { uri: string; name: string; mimeType: 'image/jpeg' | 'image/png'; size: number; width: number; height: number };
export type FoundDraft = { photo: Photo | null; location: string; dropOff: string; description: string; question: string };
export type FoundReport = FoundDraft & { id: string; createdAt: string; status: 'Available' };
export type FormErrors = Partial<Record<keyof FoundDraft, string>>;
export const emptyDraft = (): FoundDraft => ({ photo: null, location: '', dropOff: '', description: '', question: '' });

export function validateReport(draft: FoundDraft): FormErrors {
  const errors: FormErrors = {};
  if (!draft.photo) errors.photo = 'Add a photo of the found item.';
  else if (!['image/jpeg', 'image/png'].includes(draft.photo.mimeType) || draft.photo.size > MAX_PHOTO_BYTES) errors.photo = 'Choose a JPEG or PNG photo up to 10 MB.';
  if (!draft.location.trim()) errors.location = 'Enter where you found the item.';
  else if (draft.location.trim().length > 150) errors.location = 'Use 150 characters or fewer.';
  if (draft.dropOff.trim().length > 150) errors.dropOff = 'Use 150 characters or fewer.';
  if (draft.description.trim().length > 1000) errors.description = 'Use 1,000 characters or fewer.';
  if (draft.question.trim().length > 300) errors.question = 'Use 300 characters or fewer.';
  return errors;
}
