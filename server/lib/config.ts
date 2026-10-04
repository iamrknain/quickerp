
export const config = {
  site: {
    url: process.env.NEXT_PUBLIC_SITE_URL! || 'https://quickerp.rknain.com',
    name: 'QuickERP - Fast, Secure Login for IIT Kharagpur ERP',
    description: 'Chrome extension that automates your ERP login with Gmail OTP integration. One-click access to your IIT KGP ERP account with bank-level security.',
  },
  contact: {
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL! || 'quickerp@rknain.com',
  },
  github: {
    url: process.env.NEXT_PUBLIC_GITHUB_URL! || 'https://github.com/iamrknain/quickerp',
  },
  extension: {
    url: process.env.NEXT_PUBLIC_EXTENSION_URL! || 'https://chromewebstore.google.com/detail/quickerp/gafmfinhhfaocnchccamogkeemjfboin',
  },
} as const

// Validate required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_CONTACT_EMAIL', 
  'NEXT_PUBLIC_GITHUB_URL',
  'NEXT_PUBLIC_EXTENSION_URL',
] as const

export function validateConfig() {
  const missing = requiredEnvVars.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}
