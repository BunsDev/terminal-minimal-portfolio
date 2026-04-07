import { cache } from 'react'
import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { DefaultSession, Account } from 'next-auth'

import { ENV } from './constants'
import { db } from './prisma'

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string
    } & DefaultSession['user']
    accessToken?: string
  }
}

const {
  auth: uncachedAuth,
  handlers,
  signIn,
  signOut
} = NextAuth({
  secret: ENV.AUTH_SECRET,
  adapter: PrismaAdapter(db),
  providers: [
    GitHub({
      clientId: ENV.GITHUB_CLIENT_ID || '',
      clientSecret: ENV.GITHUB_CLIENT_SECRET || '',
      authorization: {
        params: {
          scope: 'read:user user:email repo workflow gist admin:org'
        }
      }
    })
  ],
  callbacks: {
    session: async ({ session, user }) => {
      // Fetch access token from the account table
      const account = await db.account.findFirst({
        where: {
          userId: user.id,
          provider: 'github'
        }
      })
      
      return {
        ...session,
        user: {
          ...session.user,
          id: user.id
        },
        accessToken: account?.access_token ?? undefined
      }
    }
  },
  pages: {
    error: '/'
  }
})

const auth = cache(uncachedAuth)

export { auth, handlers, signIn, signOut }
