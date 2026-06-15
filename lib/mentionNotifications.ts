import { db } from "@/prisma/client";
import { extractMentionUsernames } from "@/lib/mentions";

export async function createPostMentionNotifications({
    actorId,
    postId,
    title,
    content,
}: {
    actorId: string;
    postId: string;
    title: string;
    content: string;
}) {
    const usernames = extractMentionUsernames(title, content);
    if (!usernames.length) return;

    const mentionedUsers = await db.user.findMany({
        where: {
            id: { not: actorId },
            username: { in: usernames },
        },
        select: { id: true },
    });
    if (!mentionedUsers.length) return;

    await db.notification.createMany({
        data: mentionedUsers.map((user) => ({
            type: "TAGGED_IN_POST",
            userId: user.id,
            actorId,
            postId,
        })),
    });
}

export async function createCommentMentionNotifications({
    actorId,
    postId,
    commentId,
    content,
}: {
    actorId: string;
    postId: string;
    commentId: string;
    content: string;
}) {
    const usernames = extractMentionUsernames(content);
    if (!usernames.length) return;

    const mentionedUsers = await db.user.findMany({
        where: {
            id: { not: actorId },
            username: { in: usernames },
        },
        select: { id: true },
    });
    if (!mentionedUsers.length) return;

    await db.notification.createMany({
        data: mentionedUsers.map((user) => ({
            type: "TAGGED_IN_COMMENT",
            userId: user.id,
            actorId,
            postId,
            commentId,
        })),
    });
}

export async function createCommentNotifications({
    actorId,
    postId,
    commentId,
    postAuthorId,
    parentAuthorId,
}: {
    actorId: string;
    postId: string;
    commentId: string;
    postAuthorId: string;
    parentAuthorId?: string | null;
}) {
    const notifications: {
        type: "POST_COMMENT" | "COMMENT_REPLY";
        userId: string;
        actorId: string;
        postId: string;
        commentId: string;
    }[] = [];

    if (parentAuthorId && parentAuthorId !== actorId) {
        notifications.push({
            type: "COMMENT_REPLY",
            userId: parentAuthorId,
            actorId,
            postId,
            commentId,
        });
    }

    if (postAuthorId !== actorId && postAuthorId !== parentAuthorId) {
        notifications.push({
            type: "POST_COMMENT",
            userId: postAuthorId,
            actorId,
            postId,
            commentId,
        });
    }

    if (!notifications.length) return;

    await db.notification.createMany({
        data: notifications,
    });
}
