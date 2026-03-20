import NextAuth, { type DefaultSession } from 'next-auth'

// Augment the built-in session/user types to include our custom fields
declare module 'next-auth' {
  interface Session {
    user: {
      username: string
      provider: 'github' | 'google' | 'web3' | string
      address: string | null
      image: string | null
    } & DefaultSession['user']
  }

  interface User {
    username?: string
    provider?: string
    address?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    username?: string
    provider?: string
    address?: string | null
    image?: string | null
  }
}
