import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { SuccessResponse } from '@varaperformance/core';

// Consent types (matches backend enum)
export type ConsentType =
  | 'TERMS_OF_SERVICE'
  | 'PRIVACY_POLICY'
  | 'MARKETING'
  | 'DATA_PROCESSING'
  | 'AI_FEATURES_CONSENT'
  | 'HIPAA_AUTHORIZATION'
  | 'DATA_SHARING'
  | 'COOKIES'
  | 'HEALTH_DATA_CONSENT'
  | 'SECURITY_POLICY'
  | 'ACCESSIBILITY_STATEMENT';

// Types for legal documents
export interface LegalDocument {
  id: string;
  type: ConsentType;
  version: string;
  title: string;
  content: string;
  hashValue: string | null; // SHA256 hash for tamper verification (may be null for legacy docs)
  effectiveAt: string;
  expiresAt: string | null;
  isActive: boolean;
}

// Legal document version summary (for version selector)
export interface LegalDocumentVersion {
  id: string;
  version: string;
  title: string;
  hashValue: string | null;
  effectiveAt: string;
  isActive: boolean;
}

// Consent grant for submission
export interface ConsentGrant {
  type: ConsentType;
  version: string;
}

// User's consent record
export interface ConsentRecord {
  id: string;
  type: ConsentType;
  version: string;
  grantedAt: string;
}

// Re-consent check result
export interface ConsentCheckResult {
  needsReconsent: boolean;
  outdatedConsents: Array<{
    type: ConsentType;
    currentVersion: string;
    userVersion: string;
  }>;
  missingConsents: ConsentType[];
}

// API functions
const getActiveLegalDocuments = async (types?: ConsentType[]) => {
  const response = await api.get<SuccessResponse<LegalDocument[]>>(
    'consent/legal/active',
    {
      params:
        types && types.length > 0
          ? {
              types: types.join(','),
            }
          : undefined,
    },
  );
  return response.data;
};

const getLegalDocument = async (type: ConsentType) => {
  const response = await api.get<SuccessResponse<LegalDocument>>(
    `consent/legal/${type}`,
  );
  return response.data;
};

const getLegalDocumentByVersion = async (
  type: ConsentType,
  version: string,
) => {
  const response = await api.get<SuccessResponse<LegalDocument>>(
    `consent/legal/${type}`,
    {
      params: { version },
    },
  );
  return response.data;
};

const getLegalDocumentVersions = async (type: ConsentType) => {
  const response = await api.get<SuccessResponse<LegalDocumentVersion[]>>(
    `consent/legal/${type}/versions`,
  );
  return response.data;
};

const checkReconsent = async () => {
  const response =
    await api.get<SuccessResponse<ConsentCheckResult>>('consent/check');
  return response.data;
};

const submitReconsent = async (consents: ConsentGrant[]) => {
  const response = await api.post<SuccessResponse<ConsentRecord[]>>(
    'consent/reconsent',
    { consents },
  );
  return response.data;
};

const getUserConsents = async () => {
  const response = await api.get<SuccessResponse<ConsentRecord[]>>(
    'consent/my-consents',
  );
  return response.data;
};

// Hooks

/**
 * Fetch all active legal documents (for registration)
 * SOC2/HIPAA: Required for capturing versioned consent
 */
export function useActiveLegalDocuments(types?: ConsentType[]) {
  return useQuery({
    queryKey: ['legal-documents', 'active', types ?? []],
    queryFn: () => getActiveLegalDocuments(types),
    staleTime: 5 * 60 * 1000, // 5 minutes - legal docs don't change often
  });
}

/**
 * Fetch a specific legal document by type
 */
export function useLegalDocument(type: ConsentType) {
  return useQuery({
    queryKey: ['legal-documents', type],
    queryFn: () => getLegalDocument(type),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch a specific version of a legal document
 * SOC2/HIPAA: Allows viewing historical document versions
 */
export function useLegalDocumentByVersion(
  type: ConsentType,
  version: string | null,
) {
  return useQuery({
    queryKey: ['legal-documents', type, version],
    queryFn: () => getLegalDocumentByVersion(type, version!),
    enabled: !!version,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch all versions of a legal document type
 * SOC2/HIPAA: Provides version history for compliance
 */
export function useLegalDocumentVersions(type: ConsentType) {
  return useQuery({
    queryKey: ['legal-documents', type, 'versions'],
    queryFn: () => getLegalDocumentVersions(type),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Check if the authenticated user needs to re-consent to any legal documents
 * SOC2/HIPAA: Run this on app load for authenticated users
 */
export function useConsentCheck(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['consent', 'check'],
    queryFn: checkReconsent,
    enabled: options?.enabled ?? true,
    staleTime: 60 * 1000, // 1 minute
    retry: false,
  });
}

/**
 * Get user's current consents
 */
export function useUserConsents(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['consent', 'user'],
    queryFn: getUserConsents,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Submit re-consent for updated legal documents
 * SOC2/HIPAA: Records new consent with audit trail
 */
export function useSubmitReconsent(options?: {
  onSuccess?: (data: SuccessResponse<ConsentRecord[]>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitReconsent,
    onSuccess: (data) => {
      // Invalidate consent check to refresh needsReconsent status
      queryClient.invalidateQueries({ queryKey: ['consent', 'check'] });
      queryClient.invalidateQueries({ queryKey: ['consent', 'user'] });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}
