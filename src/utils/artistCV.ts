import type { ArtistCV, ArtistCVStatus } from '../types/artverse';

export const ARTIST_CV_STATUS_LABELS: Record<ArtistCVStatus, string> = {
  draft: 'Draft',
  pending: 'Pending approval',
  approved: 'Approved',
  rejected: 'Rejected',
};

export function validateArtistCV(cv: Partial<ArtistCV>): string[] {
  const errors: string[] = [];
  const required = [
    { key: 'biography', label: 'Artist biography' },
    { key: 'artisticStatement', label: 'Artistic statement' },
    { key: 'education', label: 'Education and training' },
    { key: 'experience', label: 'Artistic experience' },
    { key: 'exhibitions', label: 'Exhibitions' },
    { key: 'awards', label: 'Awards and recognition' },
    { key: 'specialisation', label: 'Artistic specialisation' },
  ] as const;

  for (const field of required) {
    const value = cv[field.key];
    if (typeof value !== 'string' || value.trim().length < 20) {
      errors.push(`${field.label} must contain at least 20 characters.`);
    }
  }

  return errors;
}

export function normalizeArtistCV(input: Partial<ArtistCV>): Partial<ArtistCV> {
  return {
    id: input.id,
    artistId: input.artistId,
    biography: input.biography?.trim() ?? '',
    artisticStatement: input.artisticStatement?.trim() ?? '',
    education: input.education?.trim() ?? '',
    experience: input.experience?.trim() ?? '',
    exhibitions: input.exhibitions?.trim() ?? '',
    awards: input.awards?.trim() ?? '',
    specialisation: input.specialisation?.trim() ?? '',
    status: input.status ?? 'draft',
    adminFeedback: input.adminFeedback ?? null,
    reviewedBy: input.reviewedBy ?? null,
    reviewedAt: input.reviewedAt ?? null,
    submittedAt: input.submittedAt ?? null,
    createdAt: input.createdAt ?? new Date().toISOString(),
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  };
}
