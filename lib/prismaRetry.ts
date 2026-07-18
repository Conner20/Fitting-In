import { Prisma } from "@prisma/client";

const RETRY_DELAYS_MS = [150, 400];

function isClosedConnectionError(error: unknown) {
    return (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P1017"
    );
}

/**
 * Retries read-only work when a serverless function receives a stale PostgreSQL
 * connection. Do not use this for writes unless the operation is idempotent.
 */
export async function withPrismaReadRetry<T>(operation: () => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt += 1) {
        try {
            return await operation();
        } catch (error) {
            const delay = RETRY_DELAYS_MS[attempt];
            if (!isClosedConnectionError(error) || delay === undefined) throw error;
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
}
