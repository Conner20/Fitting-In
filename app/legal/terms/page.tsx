'use client';

import LandingHeader from '@/components/LandingHeader';
import LandingFooter from '@/components/LandingFooter';
import LegalTabs from '@/components/LegalTabs';

export default function TermsPage() {
    return (
        <>
            <LandingHeader />
            <main className="min-h-screen w-full bg-neutral-50 px-4 py-16 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
                <div className="mx-auto max-w-3xl space-y-8">
                    <header className="space-y-3">
                        <h1 className="text-3xl font-semibold sm:text-4xl">Terms of Service</h1>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Last updated February 24, 2026</p>
                        <p className="text-base text-neutral-600 dark:text-neutral-300">
                            These Terms of Service govern access to and use of Fitting In, including content, features, and services offered
                            through the platform.
                        </p>
                    </header>

                    <LegalTabs />

                    <section className="space-y-6 rounded-3xl border border-neutral-200 bg-white p-6 text-sm leading-relaxed text-neutral-700 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200">
                        <div className="space-y-2">
                            <p>
                                <strong>Effective Date:</strong> February 23, 2026
                            </p>
                            <p>
                                <strong>Website Name:</strong> <strong>Fitting In</strong> (“<strong>Platform</strong>”)
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
                                These Terms of Service (“<strong>Terms</strong>”) govern your access to and use of the Platform, including
                                any content, features, and services offered on or through the Platform (collectively, the “
                                <strong>Services</strong>”).
                            </p>
                            <p>
                                By creating an account, accessing, or using the Services, you agree to be bound by these Terms. If you do
                                not agree, do not use the Services.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">1. Who We Are</h2>
                            <p>
                                The Services are owned and operated by <strong>Conner Morgan</strong> (“<strong>we</strong>,” “
                                <strong>us</strong>,” or “<strong>our</strong>”).
                            </p>
                            <p>
                                <strong>Support/Contact:</strong>{' '}
                                <a
                                    href="mailto:contactfittingin@gmail.com"
                                    className="underline underline-offset-2 hover:text-neutral-900 dark:hover:text-neutral-100"
                                >
                                    contactfittingin@gmail.com
                                </a>
                            </p>
                            <p>
                                If we later form an LLC or other entity, you agree we may assign or transfer these Terms and the operation
                                of the Services to that entity.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                                2. What the Platform Does
                            </h2>
                            <p>
                                Fitting In is a social networking service for <strong>trainees, trainers, and gyms</strong> to:
                            </p>
                            <ul className="list-disc space-y-1 pl-5">
                                <li>log and share exercise and nutrition information,</li>
                                <li>post content and interact socially,</li>
                                <li>message other users,</li>
                                <li>leave reviews/ratings, and</li>
                                <li>
                                    discover and connect with others using location-based filtering (e.g., distance based on a user’s city).
                                </li>
                            </ul>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">3. Eligibility</h2>
                            <p>
                                You must be at least <strong>13 years old</strong> to use the Services. If you are under <strong>18</strong>,
                                you represent that you have permission from a parent or legal guardian, and that your parent/guardian agrees
                                to these Terms on your behalf.
                            </p>
                            <p>You may not use the Services if you are prohibited from doing so under applicable law.</p>
                            <p>
                                If we learn or reasonably believe that an account belongs to a child under <strong>13</strong>, we may
                                suspend or terminate the account and remove related content/data as appropriate.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                                4. Accounts and Security
                            </h2>
                            <ol className="list-decimal space-y-1 pl-5">
                                <li>
                                    <strong>Account Creation.</strong> Accounts are created using email and password.
                                </li>
                                <li>
                                    <strong>Accurate Information.</strong> You agree to provide accurate information and keep it updated.
                                </li>
                                <li>
                                    <strong>Security.</strong> You are responsible for maintaining the confidentiality of your login
                                    credentials and for all activity under your account.
                                </li>
                                <li>
                                    <strong>Account Misuse.</strong> You agree not to share accounts, create accounts using someone else’s
                                    identity, or access the Services in an unauthorized manner.
                                </li>
                            </ol>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">5. User Roles</h2>
                            <p>The Platform supports three user roles:</p>
                            <ul className="list-disc space-y-1 pl-5">
                                <li>Trainee</li>
                                <li>Trainer</li>
                                <li>Gym</li>
                            </ul>
                            <p>
                                Your role may affect which features you can access. We may add, remove, or modify role features over time.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                                6. User Content and Ownership
                            </h2>
                            <p>
                                “<strong>User Content</strong>” means any content you submit to the Services, including posts, comments,
                                messages, images, videos, workout logs, nutrition logs, reviews, ratings, profile details, and any other
                                materials.
                            </p>
                            <ol className="list-decimal space-y-1 pl-5">
                                <li>
                                    <strong>You Own Your Content.</strong> As between you and us, you retain ownership of your User Content.
                                </li>
                                <li>
                                    <strong>License You Grant Us.</strong> You grant us a worldwide, non-exclusive, royalty-free,
                                    transferable, sublicensable license to host, store, use, reproduce, modify (for formatting/technical
                                    purposes), display, publish, perform, distribute, and make available your User Content as necessary to
                                    operate, improve, and provide the Services.
                                </li>
                                <li>
                                    <strong>Public vs. Private.</strong> Some User Content may be visible to others depending on your
                                    settings and how you use the Services (e.g., posts/reviews are typically public; messages are intended to
                                    be private between participants, but see Section 10).
                                </li>
                                <li>
                                    <strong>Your Responsibilities.</strong> You represent and warrant that:
                                    <ul className="mt-1 list-disc space-y-1 pl-5">
                                        <li>you have all rights needed to submit the User Content,</li>
                                        <li>your User Content does not violate any law or any person’s rights,</li>
                                        <li>your User Content complies with these Terms, and</li>
                                        <li>
                                            you are solely responsible for your User Content and any consequences arising from it, including any
                                            violations of law, third-party rights, or these Terms.
                                        </li>
                                    </ul>
                                </li>
                                <li>
                                    <strong>Feedback.</strong> If you submit ideas, suggestions, or feedback about the Services, you agree
                                    that we may use, modify, and implement that feedback without restriction or compensation to you.
                                </li>
                            </ol>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                                7. Acceptable Use and Prohibited Conduct
                            </h2>
                            <p>
                                You agree not to do any of the following. You also agree to follow any community guidelines or similar
                                platform rules we publish from time to time, which are incorporated into these Terms by reference.
                            </p>
                            <ul className="list-disc space-y-1 pl-5">
                                <li>
                                    <strong>Harassment / Hate / Threats:</strong> harass, bully, threaten, defame, or discriminate against
                                    others; or promote violence or hate.
                                </li>
                                <li>
                                    <strong>Spam / Unsolicited Promotions:</strong> send spam, bulk messages, or unsolicited promotions.
                                </li>
                                <li>
                                    <strong>Impersonation / Fake Accounts:</strong> impersonate any person or entity, create fake accounts,
                                    or misrepresent affiliations.
                                </li>
                                <li>
                                    <strong>Fraud / Scams / Misrepresentation:</strong> run scams, phishing attempts, deceptive offers, or
                                    misrepresent qualifications, certifications, licenses, or experience.
                                </li>
                                <li>
                                    <strong>Illegal Activity:</strong> use the Services to facilitate unlawful activity or violate
                                    applicable law.
                                </li>
                                <li>
                                    <strong>Content Violations:</strong> post content that is obscene, pornographic, exploitative, infringes
                                    intellectual property rights, or is otherwise inappropriate.
                                </li>
                                <li>
                                    <strong>Privacy Violations:</strong> share another person’s private or identifying information without
                                    permission.
                                </li>
                                <li>
                                    <strong>Dangerous Content:</strong> post or promote dangerous activity, unsafe fitness challenges, or
                                    instructions likely to cause harm.
                                </li>
                                <li>
                                    <strong>Interference / Abuse:</strong> disrupt or interfere with the Services (including scraping,
                                    probing, attacking, reverse engineering, bypassing security, or unauthorized automation/bots).
                                </li>
                                <li>
                                    <strong>Malicious Content:</strong> distribute malware, malicious code, or harmful/deceptive links or
                                    files.
                                </li>
                                <li>
                                    <strong>Data Misuse:</strong> harvest user data without permission or use it for unsolicited outreach.
                                </li>
                                <li>
                                    <strong>Platform Evasion:</strong> evade enforcement actions, including creating replacement accounts
                                    after suspension or termination.
                                </li>
                            </ul>
                            <p>
                                We may investigate suspected violations and take action at our discretion, including removing content,
                                restricting features, or suspending/terminating accounts.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                                8. Reviews and Ratings
                            </h2>
                            <p>The Services may allow reviews and ratings of trainers, gyms, and other users. You agree that:</p>
                            <ul className="list-disc space-y-1 pl-5">
                                <li>reviews must be truthful and based on your genuine experience,</li>
                                <li>you will not post reviews that are defamatory, harassing, or misleading, and</li>
                                <li>
                                    you will not offer or accept compensation for reviews (unless explicitly allowed by the Platform).
                                </li>
                            </ul>
                            <p>We may remove reviews or ratings at our discretion.</p>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                                9. Location-Based Filtering
                            </h2>
                            <p>
                                The Platform may use city-level or similar location information you provide to show distance-based or
                                location-based results.
                            </p>
                            <p>
                                You are responsible for the accuracy of the location information you provide. We do not guarantee that
                                distance calculations are accurate.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">10. Messaging</h2>
                            <p>
                                The Services include messaging features. You agree to use messaging responsibly and in compliance with these
                                Terms. While messages are intended to be private between participants, you understand that:
                            </p>
                            <ul className="list-disc space-y-1 pl-5">
                                <li>messages may be reported by recipients,</li>
                                <li>
                                    we may review or take action on messages in response to reports, safety concerns, legal requests, or
                                    suspected violations, and
                                </li>
                                <li>no system can guarantee perfect confidentiality or security.</li>
                            </ul>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                                11. Health, Fitness, and Nutrition Disclaimer
                            </h2>
                            <p>
                                <strong>
                                    The Platform does not provide medical, health, nutrition, or fitness advice. Content on the Platform is
                                    user-generated and may be inaccurate, incomplete, or inappropriate for you.
                                </strong>
                            </p>
                            <p>
                                Use of the Services does <strong>not</strong> create a doctor-patient, dietitian-client, trainer-client, or
                                other professional relationship between you and the Platform.
                            </p>
                            <p>
                                We do not guarantee outcomes, results, or the accuracy, safety, or suitability of any workout, nutrition,
                                wellness content, or user recommendations. Results vary by individual.
                            </p>
                            <ul className="list-disc space-y-1 pl-5">
                                <li>
                                    Always seek the advice of a qualified professional regarding medical conditions, nutrition, or fitness
                                    programming.
                                </li>
                                <li>Never disregard professional advice because of something you read on the Platform.</li>
                                <li>If you believe you may have a medical emergency, call emergency services immediately.</li>
                            </ul>
                            <p>
                                Physical exercise, nutrition changes, and training activities carry risks, including injury, illness, or
                                death. You assume full responsibility for your decisions and activities and for any resulting harm.
                            </p>
                            <p>
                                The Platform and support channels are <strong>not emergency services</strong> and may not be monitored at all
                                times.
                            </p>
                            <p>You use the Services and rely on content at your own risk.</p>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                                12. Trainers and Gyms Are Independent
                            </h2>
                            <p>Trainers and gyms on the Platform are independent third parties. We do not:</p>
                            <ul className="list-disc space-y-1 pl-5">
                                <li>employ, endorse, certify, or guarantee any trainer or gym,</li>
                                <li>verify professional credentials, insurance, or licensing (unless explicitly stated), or</li>
                                <li>supervise or control services offered by trainers or gyms.</li>
                            </ul>
                            <p>
                                We are not a party to, and are not responsible for, any agreements, payments, services, conduct, injuries,
                                disputes, or outcomes arising from interactions between users, trainers, or gyms.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                                13. Our Right to Moderate and Remove Content
                            </h2>
                            <p>You acknowledge and agree that we may, at our discretion:</p>
                            <ul className="list-disc space-y-1 pl-5">
                                <li>remove or restrict access to User Content,</li>
                                <li>limit messaging or other features,</li>
                                <li>issue warnings,</li>
                                <li>suspend or terminate accounts,</li>
                                <li>change or discontinue any part of the Services, and</li>
                                <li>preserve records as reasonably necessary for safety review, legal compliance, or enforcement.</li>
                            </ul>
                            <p>
                                We may take these actions to enforce these Terms, respond to reports, or protect the Platform and its users.
                                Repeat violations may result in permanent account removal.
                            </p>
                            <p>
                                If you believe content was removed or your account was restricted in error, you may contact support to
                                request review. A review request does not guarantee reversal.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                                14. Copyright Complaints (Including DMCA for U.S.)
                            </h2>
                            <p>
                                If you believe content on the Platform infringes your copyright, you may submit a notice to:
                            </p>
                            <p>
                                <strong>Email:</strong>{' '}
                                <a
                                    href="mailto:contactfittingin@gmail.com"
                                    className="underline underline-offset-2 hover:text-neutral-900 dark:hover:text-neutral-100"
                                >
                                    contactfittingin@gmail.com
                                </a>
                                <br />
                                <strong>Subject Line:</strong> “Copyright Takedown Request”
                            </p>
                            <p>Your notice should include:</p>
                            <ul className="list-disc space-y-1 pl-5">
                                <li>identification of the copyrighted work,</li>
                                <li>identification of the allegedly infringing material (with URL or sufficient detail),</li>
                                <li>your contact information (name and email; we may request additional info if needed),</li>
                                <li>a statement that you have a good-faith belief the use is unauthorized, and</li>
                                <li>
                                    a statement under penalty of perjury that the information is accurate and you are the copyright owner (or
                                    authorized agent), plus your signature (typed is OK).
                                </li>
                            </ul>
                            <p>We may remove content and, where appropriate, terminate repeat infringers.</p>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                                15. Third-Party Services
                            </h2>
                            <p>We may use third-party services to operate the Platform, such as:</p>
                            <ul className="list-disc space-y-1 pl-5">
                                <li>
                                    <strong>Resend</strong> (transactional email delivery), and
                                </li>
                                <li>
                                    <strong>Google Analytics</strong> (usage analytics).
                                </li>
                            </ul>
                            <p>
                                Your use of the Services may be subject to the terms and policies of these third parties. We are not
                                responsible for third-party services.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">16. Payments</h2>
                            <p>
                                There are <strong>no paid features</strong> at this time. If paid subscriptions or other payment features are
                                introduced later, we will update these Terms and provide additional billing/refund/cancellation details.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">17. Privacy</h2>
                            <p>
                                Our collection, use, and sharing of information is described in our <strong>Privacy Policy</strong>, which is
                                incorporated into these Terms by reference. Please review the Privacy Policy carefully before using the
                                Services.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                                18. Changes to the Services and Terms
                            </h2>
                            <p>
                                We may update the Services and these Terms from time to time. If we make material changes, we will take
                                reasonable steps to notify users (e.g., by posting an updated effective date or providing an in-app notice).
                                Continued use of the Services after changes become effective constitutes acceptance of the updated Terms.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">19. Termination</h2>
                            <p>
                                You may stop using the Services at any time. We may suspend or terminate your access at any time for any
                                reason, including suspected violations of these Terms.
                            </p>
                            <p>
                                Sections that by their nature should survive termination will survive (including Sections on User Content
                                license, disclaimers, limitation of liability, indemnification, dispute resolution/arbitration, and governing
                                law/venue).
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                                20. Disclaimer of Warranties
                            </h2>
                            <p className="font-medium uppercase tracking-wide text-neutral-800 dark:text-neutral-100">
                                The services are provided “as is” and “as available.” To the maximum extent permitted by law, we disclaim all
                                warranties, express or implied, including implied warranties of merchantability, fitness for a particular
                                purpose, and non-infringement.
                            </p>
                            <p>
                                We do not guarantee that the Services will be uninterrupted, secure, error-free, or that content will be
                                accurate.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                                21. Limitation of Liability
                            </h2>
                            <p className="font-medium uppercase tracking-wide text-neutral-800 dark:text-neutral-100">
                                To the maximum extent permitted by law, we will not be liable for any damages of any kind, including direct,
                                indirect, incidental, special, consequential, exemplary, or punitive damages, or any loss of profits, data,
                                use, goodwill, or other intangible losses, arising out of or related to your access to or use of (or inability
                                to access or use) the services, user content, third-party services, or interactions with other users.
                            </p>
                            <p>
                                (Some jurisdictions do not allow certain exclusions or limitations of liability. In those cases, this Section
                                applies to the greatest extent permitted by law.)
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">22. Indemnification</h2>
                            <p>
                                You agree to indemnify, defend, and hold harmless Conner Morgan from and against any claims, liabilities,
                                damages, losses, and expenses (including reasonable attorneys’ fees) arising out of or related to:
                            </p>
                            <ul className="list-disc space-y-1 pl-5">
                                <li>your access to or use of the Services,</li>
                                <li>your User Content,</li>
                                <li>your interactions with other users, or</li>
                                <li>your violation of these Terms or applicable law.</li>
                            </ul>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                                23. Dispute Resolution; Binding Arbitration
                            </h2>
                            <p>
                                To the maximum extent permitted by law, you and Fitting In agree that any dispute, claim, or controversy
                                arising out of or relating to these Terms or the Services will be resolved by binding arbitration, rather than
                                in court, except where prohibited by applicable law.
                            </p>
                            <p>
                                The arbitration will be conducted in the District of Columbia, or remotely if permitted, and administered by an
                                arbitration provider selected by Fitting In. The arbitrator’s decision will be final and binding, and judgment
                                on the award may be entered in any court of competent jurisdiction.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                                24. Governing Law and Venue
                            </h2>
                            <p>
                                These Terms are governed by the laws of the <strong>District of Columbia</strong>, without regard to conflict
                                of law principles.
                            </p>
                            <p>
                                Subject to Section 23, you agree that disputes arising out of or relating to these Terms or the Services that
                                are not required to be arbitrated will be brought exclusively in the state or federal courts located in{' '}
                                <strong>Washington, D.C.</strong>, and you consent to personal jurisdiction there.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">25. Miscellaneous</h2>
                            <ul className="list-disc space-y-1 pl-5">
                                <li>
                                    <strong>Severability.</strong> If any provision is found unenforceable, the remainder will remain in
                                    effect.
                                </li>
                                <li>
                                    <strong>No Waiver.</strong> Our failure to enforce a provision is not a waiver.
                                </li>
                                <li>
                                    <strong>Assignment.</strong> You may not assign these Terms without our consent; we may assign them in
                                    connection with a merger, acquisition, reorganization, or sale of assets (including forming an LLC to
                                    operate the Platform).
                                </li>
                                <li>
                                    <strong>Entire Agreement.</strong> These Terms and the Privacy Policy are the entire agreement between
                                    you and us regarding the Services.
                                </li>
                            </ul>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">26. Contact</h2>
                            <p>
                                Questions about these Terms? Contact:{' '}
                                <a
                                    href="mailto:contactfittingin@gmail.com"
                                    className="underline underline-offset-2 hover:text-neutral-900 dark:hover:text-neutral-100"
                                >
                                    contactfittingin@gmail.com
                                </a>
                            </p>
                            <p>
                                You may also use this email for support requests, privacy-related requests, abuse reports, and copyright
                                complaints (use the subject line “Copyright Takedown Request” for copyright notices).
                            </p>
                        </div>
                    </section>
                </div>
            </main>
            <LandingFooter />
        </>
    );
}