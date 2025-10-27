import { promises as dns } from 'dns'

export interface VerificationResult {
  success: boolean
  message: string
}

/**
 * Verifies domain ownership by checking for a TXT record
 * @param domain - The domain to verify
 * @param token - The verification token to look for
 * @returns Promise<VerificationResult>
 */
export async function verifyDomainOwnership(
  domain: string,
  token: string
): Promise<VerificationResult> {
  try {
    // Look for TXT record with the verification token
    const txtRecords = await dns.resolveTxt(domain)
    
    // Flatten the TXT records (they come as arrays of strings)
    const allTxtRecords = txtRecords.flat()
    
    // Check if any TXT record contains our verification token
    const hasToken = allTxtRecords.some(record => 
      record.includes(`pieeye-verification=${token}`)
    )
    
    if (hasToken) {
      return {
        success: true,
        message: 'Domain ownership verified successfully!'
      }
    } else {
      return {
        success: false,
        message: 'Verification token not found. Please add the TXT record and try again.'
      }
    }
  } catch (error) {
    console.error('DNS verification error:', error)
    return {
      success: false,
      message: 'Failed to verify domain. Please check the domain name and try again.'
    }
  }
}

/**
 * Generates DNS verification instructions
 * @param domain - The domain to verify
 * @param token - The verification token
 * @returns Instructions for the user
 */
export function getDnsInstructions(domain: string, token: string): string {
  return `To verify ownership of ${domain}, add the following TXT record to your DNS settings:

Record Type: TXT
Name: @ (or leave blank for root domain)
Value: pieeye-verification=${token}
TTL: 300 (or default)

After adding the record, wait a few minutes for DNS propagation, then click "Verify Domain".`
}
