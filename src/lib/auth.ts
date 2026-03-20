import type { NextAuthOptions } from 'next-auth'
import GithubProvider from 'next-auth/providers/github'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { verifyMessage } from 'ethers'

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: String(profile.id),
          name: profile.name ?? profile.login,
          email: profile.email,
          image: profile.avatar_url,
          username: profile.login,
          provider: 'github',
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          username: profile.email?.split('@')[0] ?? profile.name,
          provider: 'google',
        }
      },
    }),
    CredentialsProvider({
      id: 'web3',
      name: 'Web3 Wallet',
      credentials: {
        address:   { label: 'Wallet Address', type: 'text' },
        signature: { label: 'Signature',      type: 'text' },
        message:   { label: 'Signed Message', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.address || !credentials?.signature || !credentials?.message) return null
        try {
          const recovered = verifyMessage(credentials.message, credentials.signature)
          if (recovered.toLowerCase() !== credentials.address.toLowerCase()) return null
          const short = `${credentials.address.slice(0, 6)}...${credentials.address.slice(-4)}`
          return {
            id: credentials.address.toLowerCase(),
            name: short,
            email: null,
            image: null,
            username: short,
            address: credentials.address,
            provider: 'web3',
          }
        } catch {
          return null
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.username = (user as any).username ?? user.name
        token.provider = (user as any).provider ?? account?.provider ?? 'unknown'
        token.address  = (user as any).address  ?? null
        token.image    = user.image ?? null
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).username = token.username
        ;(session.user as any).provider = token.provider
        ;(session.user as any).address  = token.address
        ;(session.user as any).image    = token.image
      }
      return session
    },
  },
  pages: { signIn: '/', error: '/' },
  secret: process.env.NEXTAUTH_SECRET,
}