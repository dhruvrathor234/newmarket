import { apiRequest } from './apiClient';

export interface VerificationResult {
  isValid: boolean;
  message: string;
}

/**
 * Verifies a crypto payment transaction. The actual Etherscan calls now run
 * server-side (/api/payments/verify-transaction) so the API key never ships
 * to the browser. The mock/demo verification path is server-gated to non-production.
 */
export const verifyTransaction = async (txHash: string, expectedAmountUsd: number): Promise<VerificationResult> => {
  try {
    const response = await apiRequest('/api/payments/verify-transaction', {
      method: 'POST',
      body: JSON.stringify({ txHash, expectedAmountUsd }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Verification service error');
    }

    return await response.json();
  } catch (error) {
    console.error('Verification error:', error);
    return { isValid: false, message: 'Neural link to Etherscan failed. Please try again.' };
  }
};
