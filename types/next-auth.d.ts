import NextAuth from "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
    interface User {
        id?: string
    }
    interface Session {
        user: User & {
            id?: string
            email?: string | null
            name?: string | null
            isAdmin?: boolean
        }
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        isAdmin?: boolean
    }
}
