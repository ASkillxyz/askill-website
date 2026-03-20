/**
 * Web3 Sign-In helper
 *
 * Flow:
 *  1. Detect window.ethereum (MetaMask / injected wallet)
 *  2. Request account access → get wallet address
 *  3. Build a human-readable sign-in message (SIWE-style)
 *  4. Ask wallet to sign the message (eth_sign / personal_sign)
 *  5. Return { address, message, signature } for NextAuth CredentialsProvider
 */

export interface Web3Credentials {
  address: string
  message: string
  signature: string
}

export type WalletType = 'metamask' | 'coinbase' | 'walletconnect' | 'injected'

/** Detected wallet providers in window.ethereum */
export function detectWallets(): WalletType[] {
  if (typeof window === 'undefined') return []
  const eth = (window as any).ethereum
  if (!eth) return []
  const wallets: WalletType[] = ['injected']
  if (eth.isMetaMask)     wallets.push('metamask')
  if (eth.isCoinbaseWallet) wallets.push('coinbase')
  return wallets
}

/** Check if any injected wallet is available */
export function hasInjectedWallet(): boolean {
  return typeof window !== 'undefined' && !!(window as any).ethereum
}

/** Build the human-readable SIWE-style sign-in message */
function buildSignMessage(address: string, nonce: string): string {
  const domain  = typeof window !== 'undefined' ? window.location.host : 'openclaw.skills'
  const issuedAt = new Date().toISOString()
  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    address,
    '',
    'Sign in to OpenClaw Skills.',
    '',
    `URI: https://${domain}`,
    'Version: 1',
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join('\n')
}

/** Generate a random nonce (8 hex chars) */
function randomNonce(): string {
  return Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0')
}

/**
 * Request wallet connection and sign the message.
 * Returns credentials ready to pass into NextAuth `signIn('web3', credentials)`.
 */
export async function connectAndSign(): Promise<Web3Credentials> {
  const eth = (window as any).ethereum
  if (!eth) throw new Error('NO_WALLET')

  // Request accounts
  const accounts: string[] = await eth.request({ method: 'eth_requestAccounts' })
  if (!accounts || accounts.length === 0) throw new Error('NO_ACCOUNTS')

  const address = accounts[0]
  const nonce   = randomNonce()
  const message = buildSignMessage(address, nonce)

  // Sign with personal_sign (safer than eth_sign, supported everywhere)
  const msgHex  = '0x' + Buffer.from(message, 'utf8').toString('hex')
  const signature: string = await eth.request({
    method: 'personal_sign',
    params: [msgHex, address],
  })

  return { address, message, signature }
}
