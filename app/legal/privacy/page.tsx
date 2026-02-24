'use client';

import LandingHeader from '@/components/LandingHeader';
import LandingFooter from '@/components/LandingFooter';
import LegalTabs from '@/components/LegalTabs';

export default function PrivacyPage() {
    return (
        <>
            <LandingHeader />
            <main className="min-h-screen w-full bg-neutral-50 px-4 py-16 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
                <div className="mx-auto max-w-3xl space-y-8">
                    <header className="space-y-3">
                        <h1 className="text-3xl font-semibold sm:text-4xl">Privacy Policy</h1>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Last updated February 23, 2026</p>
                        <p className="text-base text-neutral-600 dark:text-neutral-300">
                            This Privacy Policy explains what information Fitting In collects, how it is used, and the choices users have
                            regarding their information.
                        </p>
                    </header>

                    <LegalTabs />

                    <section className="space-y-6 rounded-3xl border border-neutral-200 bg-white p-6 text-sm leading-relaxed text-neutral-700 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200">
                        <div className="space-y-2">
                            <p>
                                <strong>Effective Date:</strong> February 23, 2026
                            </p>
                            <p>
                                <strong>Website Name:</strong> <strong>Fitting In</strong>
                            </p>
                            <p>
                                <strong>Website URL:</strong>{' '}
                                <a
                                    href="https://fittingin.co"
                                    className="underline underline-offset-2 hover:text-neutral-900 dark:hover:text-neutral-100"
                                >
                                    https://fittingin.co
                                </a>
                            </p>
                            <p>
                                <strong>Contact Email:</strong>{' '}
                                <a
                                    href="mailto:contactfittingin@gmail.com"
                                    className="underline underline-offset-2 hover:text-neutral-900 dark:hover:text-neutral-100"
                                >
                                    contactfittingin@gmail.com
                                </a>
                            </p>
                            <p>
                                This Privacy Policy describes how Fitting In (“<strong>Fitting In</strong>,” “<strong>we</strong>,” “
                                <strong>us</strong>,” or “<strong>our</strong>”) collects, uses, stores, and shares information when you use
                                our website, products, and services (collectively, the “<strong>Services</strong>”).
                            </p>
                            <p>
                                By using Fitting In, you agree to the practices described in this Privacy Policy. If you do not agree, do
                                not use the Services.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">1. Who We Are</h2>
                            <p>
                                Fitting In is a social networking platform for <strong>trainees, trainers, and gyms</strong> to connect, log
                                workouts/nutrition/wellness information, share content, communicate, and grow their networks and businesses.
                            </p>
                            <p>
                                If you have questions about this Privacy Policy, contact us at{' '}
                                <a
                                    href="mailto:contactfittingin@gmail.com"
                                    className="underline underline-offset-2 hover:text-neutral-900 dark:hover:text-neutral-100"
                                >
                                    contactfittingin@gmail.com
                                </a>
                                .
                            </p>
                        </div>

                        <div className="space-y-3">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                                2. Information We Collect
                            </h2>
                            <p>
                                We collect information you provide directly, information stored when you use platform features, and certain
                                technical/analytics information. The categories below reflect the types of data currently supported by our
                                database schema.
                            </p>

                            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                                A. Account and Authentication Information
                            </h3>
                            <ul className="list-disc space-y-1 pl-5">
                                <li>
                                    <strong>Account details:</strong> email address, username, display name, password credential (for
                                    email/password login), profile image URL, bio, role (trainee/trainer/gym), privacy setting (public/private),
                                    and general location text.
                                </li>
                                <li>
                                    <strong>Email verification data:</strong> email verification status/date and verification token records
                                    (such as token, identifier, and expiration).
                                </li>
                                <li>
                                    <strong>Session data:</strong> session token, user ID, and session expiration.
                                </li>
                                <li>
                                    <strong>Linked auth provider data (if used):</strong> provider name, provider account ID, token metadata
                                    (such as access/refresh tokens, scopes, token type, expiry, ID token, and session state).
                                </li>
                            </ul>

                            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                                B. Profile and Role-Specific Information
                            </h3>
                            <ul className="list-disc space-y-1 pl-5">
                                <li>
                                    <strong>Trainee profile data:</strong> goals, bio, city, state, country, and coordinates (latitude/longitude).
                                </li>
                                <li>
                                    <strong>Trainer profile data:</strong> services offered, bio, city/state/country, coordinates
                                    (latitude/longitude), hourly rate, and profile metrics (such as rating/client count).
                                </li>
                                <li>
                                    <strong>Gym profile data:</strong> gym name, address, phone number, website, fee, amenities, bio,
                                    city/state/country, coordinates (latitude/longitude), and profile metrics (such as rating/client count).
                                </li>
                            </ul>

                            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                                C. Social and Community Content
                            </h3>
                            <ul className="list-disc space-y-1 pl-5">
                                <li>
                                    <strong>Posts:</strong> title, content, optional image URL, author, and timestamps.
                                </li>
                                <li>
                                    <strong>Comments and replies:</strong> comment content, author, timestamps, and reply/thread relationships.
                                </li>
                                <li>
                                    <strong>Likes:</strong> records of which users liked which posts.
                                </li>
                                <li>
                                    <strong>Follows:</strong> follower/following relationships, follow status (e.g., pending/accepted), and timestamps.
                                </li>
                                <li>
                                    <strong>Ratings/reviews:</strong> star ratings, optional review comments, status (e.g., pending/approved/declined),
                                    and timestamps for trainer/gym reviews.
                                </li>
                                <li>
                                    <strong>Search gallery images:</strong> image URLs you save/use in search gallery features.
                                </li>
                            </ul>

                            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                                D. Messaging and Sharing Data
                            </h3>
                            <ul className="list-disc space-y-1 pl-5">
                                <li>
                                    <strong>Conversations:</strong> conversation records, participant membership, optional conversation name,
                                    direct-message key (if used), and timestamps.
                                </li>
                                <li>
                                    <strong>Messages:</strong> message content, sender, conversation ID, image URLs attached to messages,
                                    created/read timestamps, and shared references (such as shared users or shared posts).
                                </li>
                            </ul>

                            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                                E. Notifications and Platform Activity
                            </h3>
                            <ul className="list-disc space-y-1 pl-5">
                                <li>
                                    <strong>Notifications:</strong> notification type (e.g., follow request/followed you/request accepted),
                                    recipient, actor, optional linked follow record, read status, and timestamps.
                                </li>
                                <li>
                                    <strong>Dashboard sharing permissions:</strong> which users share dashboards with which viewers and whether
                                    workout, wellness, and/or nutrition dashboard data is shared.
                                </li>
                            </ul>

                            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                                F. Workout, Cardio, Nutrition, Bodyweight, and Wellness Data
                            </h3>
                            <ul className="list-disc space-y-1 pl-5">
                                <li>
                                    <strong>Workout exercise library:</strong> exercise names you create.
                                </li>
                                <li>
                                    <strong>Workout sets:</strong> exercise, weight, sets, reps, and workout date.
                                </li>
                                <li>
                                    <strong>Cardio activity entries:</strong> named cardio activities you create.
                                </li>
                                <li>
                                    <strong>Cardio sessions:</strong> activity, date, time (minutes), optional distance, distance unit,
                                    optional calories, and created timestamp.
                                </li>
                                <li>
                                    <strong>Custom foods:</strong> food name, grams, calories, and macro values (protein/carbs/fat).
                                </li>
                                <li>
                                    <strong>Nutrition entries:</strong> date, meal type, food name, servings, calories, macro values,
                                    optional time, and created timestamp.
                                </li>
                                <li>
                                    <strong>Bodyweight entries:</strong> date and bodyweight.
                                </li>
                                <li>
                                    <strong>Nutrition settings:</strong> calorie/protein/fat/carb goals and optional heatmap settings data.
                                </li>
                                <li>
                                    <strong>Sleep entries:</strong> date and hours slept (including nullable/no-data days).
                                </li>
                                <li>
                                    <strong>Water entries:</strong> date, liters consumed, and created timestamp.
                                </li>
                                <li>
                                    <strong>Wellness settings:</strong> water goal and optional unit/bodyweight range preferences.
                                </li>
                            </ul>

                            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                                G. Technical and Analytics Information
                            </h3>
                            <ul className="list-disc space-y-1 pl-5">
                                <li>
                                    <strong>Usage and analytics data:</strong> information collected through analytics tools (such as Google
                                    Analytics), including interactions, page visits, and device/browser-related data.
                                </li>
                                <li>
                                    <strong>Cookies and similar technologies:</strong> used for session management, preferences, analytics,
                                    and platform functionality.
                                </li>
                            </ul>

                            <p>
                                <strong>We do not currently offer paid features</strong> and do not currently collect payment card data
                                through the platform.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                                3. How We Use Information
                            </h2>
                            <p>We use collected information to operate, maintain, and improve Fitting In, including to:</p>
                            <ul className="list-disc space-y-1 pl-5">
                                <li>create and manage user accounts and role-based profiles,</li>
                                <li>authenticate users, manage sessions, and support account security,</li>
                                <li>verify email addresses and process account-related tokens,</li>
                                <li>display profiles, posts, comments, likes, ratings, and social connections,</li>
                                <li>enable messaging, conversations, and content sharing between users,</li>
                                <li>support workout, cardio, nutrition, bodyweight, and wellness tracking features,</li>
                                <li>support dashboard sharing permissions between users,</li>
                                <li>support location-based filtering and user discovery,</li>
                                <li>generate and deliver notifications,</li>
                                <li>respond to support requests and communicate platform updates,</li>
                                <li>send transactional emails (such as verification and password reset emails),</li>
                                <li>analyze usage and improve performance, reliability, and user experience,</li>
                                <li>detect, prevent, and investigate spam, abuse, fraud, and policy violations, and</li>
                                <li>comply with legal obligations and enforce our Terms of Service.</li>
                            </ul>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                                4. How We Share Information
                            </h2>
                            <p>We do not sell your personal information. We may share information as described below:</p>
                            <ul className="list-disc space-y-1 pl-5">
                                <li>
                                    <strong>With other users:</strong> information you choose to make visible (such as profile information,
                                    posts, comments, likes, follow relationships, ratings/reviews, and certain shared dashboard data) may be
                                    visible to other users depending on your settings and platform features.
                                </li>
                                <li>
                                    <strong>With messaging participants:</strong> messages, attachments, and shared content references are
                                    visible to participants in the relevant conversation.
                                </li>
                                <li>
                                    <strong>With service providers:</strong> vendors who help operate the platform (such as email delivery and
                                    analytics providers) may process data on our behalf.
                                </li>
                                <li>
                                    <strong>For legal/safety reasons:</strong> when required by law or when reasonably necessary to protect
                                    users, the platform, or others; investigate abuse; or enforce our Terms.
                                </li>
                                <li>
                                    <strong>Business transfer:</strong> if Fitting In is sold, merged, reorganized, or transferred
                                    (including to a future LLC or other entity), information may be transferred as part of that transaction.
                                </li>
                            </ul>
                            <p>
                                We may also use or share aggregated/de-identified information that does not reasonably identify an individual.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                                5. Third-Party Services
                            </h2>
                            <p>We currently use third-party services including:</p>
                            <ul className="list-disc space-y-1 pl-5">
                                <li>
                                    <strong>Resend</strong> for transactional emails (such as verification and password reset emails), and
                                </li>
                                <li>
                                    <strong>Google Analytics</strong> for analytics and usage insights.
                                </li>
                            </ul>
                            <p>
                                These providers may process certain information on our behalf. Their handling of data is governed by their own
                                privacy policies and terms.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                                6. Cookies and Similar Technologies
                            </h2>
                            <p>
                                We and our service providers may use cookies and similar technologies to keep you signed in, support session
                                management, remember preferences, analyze usage, and improve the Services.
                            </p>
                            <p>
                                Your browser may allow you to control cookies through browser settings. Disabling cookies may affect the
                                functionality of parts of the Services.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                                7. Data Retention
                            </h2>
                            <p>
                                We retain information for as long as reasonably necessary to provide the Services, maintain platform
                                operations, comply with legal obligations, resolve disputes, and enforce agreements.
                            </p>
                            <p>
                                Retention periods vary based on the type of information. Some records may be removed when accounts or related
                                content are deleted, and some related data may be deleted automatically through database relationships.
                            </p>
                            <p>
                                We may retain certain information for longer where necessary for security, fraud prevention, compliance,
                                auditing, backups, or recordkeeping.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                                8. Data Security
                            </h2>
                            <p>
                                We take reasonable administrative, technical, and organizational measures to protect information from
                                unauthorized access, loss, misuse, or alteration.
                            </p>
                            <p>
                                However, no online service, database, or storage system is 100% secure, and we cannot guarantee absolute
                                security.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                                9. Your Choices and Rights
                            </h2>
                            <p>
                                Depending on where you live, you may have rights regarding your personal information. These may include the
                                right to:
                            </p>
                            <ul className="list-disc space-y-1 pl-5">
                                <li>access information we hold about you,</li>
                                <li>request correction of inaccurate information,</li>
                                <li>request deletion of your information (subject to legal/operational exceptions),</li>
                                <li>object to or restrict certain processing, and</li>
                                <li>request a copy of certain information you provided to us.</li>
                            </ul>
                            <p>
                                You may also be able to update some information directly in your account/profile settings (such as profile
                                fields, content, and tracking entries).
                            </p>
                            <p>
                                For privacy-related requests, contact us at{' '}
                                <a
                                    href="mailto:contactfittingin@gmail.com"
                                    className="underline underline-offset-2 hover:text-neutral-900 dark:hover:text-neutral-100"
                                >
                                    contactfittingin@gmail.com
                                </a>
                                .
                            </p>
                        </div>

                        <div className="space-y-3">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                                10. Messaging and User Communications
                            </h2>
                            <p>
                                Fitting In includes messaging and social communication features. Message content, attachments (including image
                                URLs), and related metadata are stored to provide the messaging service.
                            </p>
                            <p>
                                Messages are intended for communication between users, but they may be reviewed or acted upon in limited
                                circumstances, such as user reports, safety or abuse concerns, suspected violations of our Terms, or legal
                                requirements.
                            </p>
                            <p>
                                Please do not share highly sensitive information through the platform that you would not want exposed in the
                                event of a security issue or legal disclosure.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                                11. Location Information
                            </h2>
                            <p>
                                We support location-based discovery features and may store location information you provide, including
                                city/state/country and, for some profile types, latitude/longitude coordinates.
                            </p>
                            <p>
                                This information may be used to support distance-based filtering and discovery. You are responsible for the
                                accuracy of the information you choose to provide.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                                12. Children’s Privacy
                            </h2>
                            <p>
                                Fitting In is not intended for children under <strong>13</strong>, and we do not knowingly collect personal
                                information from children under 13.
                            </p>
                            <p>
                                If you believe a child under 13 has provided personal information, contact us at{' '}
                                <a
                                    href="mailto:contactfittingin@gmail.com"
                                    className="underline underline-offset-2 hover:text-neutral-900 dark:hover:text-neutral-100"
                                >
                                    contactfittingin@gmail.com
                                </a>{' '}
                                and we will take reasonable steps to review and delete the information as appropriate.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                                13. International Users
                            </h2>
                            <p>
                                Fitting In is operated from the United States. If you access the Services from outside the United States, you
                                understand that your information may be transferred to, stored in, and processed in the United States and
                                other countries where our service providers operate.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                                14. Changes to This Privacy Policy
                            </h2>
                            <p>
                                We may update this Privacy Policy from time to time. If we make material changes, we will take reasonable
                                steps to notify users (for example, by updating the “Last updated” date or posting a notice on the platform).
                            </p>
                            <p>
                                Your continued use of the Services after changes become effective means you accept the updated Privacy Policy.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">15. Contact Us</h2>
                            <p>
                                If you have questions, requests, or concerns about this Privacy Policy or our privacy practices, contact:
                            </p>
                            <p>
                                <strong>Email:</strong>{' '}
                                <a
                                    href="mailto:contactfittingin@gmail.com"
                                    className="underline underline-offset-2 hover:text-neutral-900 dark:hover:text-neutral-100"
                                >
                                    contactfittingin@gmail.com
                                </a>
                            </p>
                            <p>
                                <strong>Website:</strong>{' '}
                                <a
                                    href="https://fittingin.co"
                                    className="underline underline-offset-2 hover:text-neutral-900 dark:hover:text-neutral-100"
                                >
                                    https://fittingin.co
                                </a>
                            </p>
                        </div>
                    </section>
                </div>
            </main>
            <LandingFooter />
        </>
    );
}
