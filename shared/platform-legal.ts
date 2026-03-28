export const platformLegalLastUpdatedIso = '2026-03-28'
export const platformLegalLastUpdatedLabel = '28 March 2026'

export const platformOperatorName = 'Alexandru Gavrilescu'
export const platformOperatorAddress = 'Zentagasse 33/2, 1050 Vienna, Austria'
export const platformSupportEmail = 'support@codex-hackathons.com'
export const platformPrivacyEmail = 'privacy@codex-hackathons.com'
export const platformImprintContactApiPath = '/api/public/imprint-contact'
export const platformMinimumAge = 18

export const platformPrivacyPolicyMarkdown = `
## 1. Who we are

Codex Hackathons is operated by **${platformOperatorName}** as a private individual based in Vienna, Austria.

- Service address: ${platformOperatorAddress}
- Support contact: [${platformSupportEmail}](mailto:${platformSupportEmail})
- Privacy contact: [${platformPrivacyEmail}](mailto:${platformPrivacyEmail})

For data protection matters, the controller is ${platformOperatorName}. No separate data protection officer has been appointed.

## 2. What this policy covers

This Privacy Policy explains how we process personal data when you:

- visit the Codex Hackathons website
- create and use a platform account
- apply to hackathons
- join or manage teams
- submit projects
- participate in judging or hackathon administration
- redeem prizes
- contact us through the imprint contact form or by email

Hackathon-specific application terms, winner terms, and event materials may contain additional rules for a particular hackathon. This policy covers the platform-level processing behind those workflows as well.

## 3. Who can use the platform

The platform is intended for adults. You must be at least **${platformMinimumAge} years old** to create an account or use the platform.

We do not knowingly collect personal data from children under ${platformMinimumAge}. If you believe a minor under ${platformMinimumAge} has provided personal data to us, contact us at [${platformPrivacyEmail}](mailto:${platformPrivacyEmail}).

## 4. Categories of personal data we process

Depending on how you use the platform, we may process:

### Account and identity data

- Auth0 subject identifier
- email address
- display name, first name, and family name
- platform account status information

### Optional profile data

- X, LinkedIn, and GitHub profile links
- ChatGPT email
- OpenAI organization ID
- Luma username
- optional profile icon

### Hackathon participation data

- hackathons you apply to, join, administer, or judge
- application status and review metadata
- application responses, including optional motivation text and proof-of-execution URL
- in-person attendance commitment when required for a hackathon
- team-intent information and teammate hints you provide during application

### Team, submission, and judging data

- team membership and join-request records
- submission content such as project name, summary, repository URL, and demo URL
- judging assignments, scores, comments, eligibility decisions, and related workflow records
- admin actions and competition operations data

### Prize and legal-record data

- prize eligibility and redemption records
- legal name supplied for prize redemption
- acceptance records for platform documents and hackathon-specific terms documents, including the exact version accepted and acceptance timestamps

### Contact and support data

- information you include when you email us or use the imprint contact form, such as your name, email address, and message

### Technical and security data

- session and authentication state needed to keep you signed in
- request metadata, logs, and security-related technical information reasonably needed to operate and secure the platform

### Publicly displayed competition data

If a hackathon publishes results, we may publicly display winner and project information such as:

- participant or team names
- project names
- demo links
- repository links

## 5. Why we process your data and our legal bases

We process personal data for the following purposes:

### To provide and operate the platform

This includes account creation, sign-in, profile management, hackathon participation, team workflows, submissions, judging, prize operations, and hackathon administration.

**Legal basis:** performance of a contract with you or steps taken at your request before entering into a contract (Article 6(1)(b) GDPR).

### To maintain platform security, auditability, and service integrity

This includes preventing abuse, investigating incidents, preserving operational records, protecting the service, and maintaining competition integrity.

**Legal basis:** legitimate interests (Article 6(1)(f) GDPR) and, where applicable, compliance with legal obligations (Article 6(1)(c) GDPR).

### To comply with legal, accounting, tax, or regulatory obligations

This includes handling lawful requests, keeping records required by law, and preserving evidence relevant to disputes or compliance matters.

**Legal basis:** compliance with legal obligations (Article 6(1)(c) GDPR).

### To respond to support, privacy, and imprint contact requests

This includes handling messages you send through the imprint contact form or by email.

**Legal basis:** legitimate interests in responding to inquiries and operating the service (Article 6(1)(f) GDPR), and where your message relates to joining or using the service, steps taken at your request (Article 6(1)(b) GDPR).

### To publish and promote hackathon outcomes

This includes publishing winner details, team names, project names, demo links, repository links, and related showcase material where a hackathon publishes results.

**Legal basis:** legitimate interests in operating, documenting, and promoting the platform and its hackathons (Article 6(1)(f) GDPR), together with the platform and hackathon terms that apply to participation.

## 6. Where we get personal data from

We receive personal data:

- directly from you when you create an account, complete your profile, apply, participate, submit content, redeem prizes, or contact us
- from Auth0 when you authenticate and create or use your platform account
- from hackathon admins, judges, or team admins when they carry out workflow actions within the platform
- from technical systems that generate operational and security metadata while the service is used

## 7. Who receives personal data

We share personal data only where needed to run the platform and hackathons.

### Processors and infrastructure providers

At launch, the platform uses:

- **Auth0** for authentication and identity
- **Cloudflare** for application hosting, database, storage, and queue infrastructure
- **Resend** for transactional email delivery

These providers process data on our behalf according to their service terms and data-processing arrangements.

### Other users inside the platform

Depending on your role and the workflow:

- hackathon admins may view application, participation, submission, prize, and operational records needed to run a hackathon
- judges may access anonymized blind-judging data assigned to them
- team members and team admins may see team and submission information relevant to their team

### Public recipients

If a hackathon publishes results, winner and project information may become public as described above.

We do not sell personal data. We do not use participant data for advertising or profiling. At launch, we do not share participant data with sponsors, venue partners, or unrelated third parties outside the listed service providers.

## 8. International transfers

Some of our service providers may process personal data outside the EEA or make support, security, or infrastructure resources available from outside the EEA.

Where personal data is transferred internationally, we rely on available lawful transfer mechanisms such as adequacy decisions, standard contractual clauses, or other safeguards permitted by GDPR.

Although the Auth0 tenant is intended to be configured in the EU, some provider operations may still involve international processing.

## 9. Retention

We keep personal data only for as long as needed for the purposes described above or as long as required by law.

Our current platform-level retention approach is:

- inactive platform accounts: up to **2 years** after the last meaningful activity, unless deleted earlier or retention is needed for a dispute, security issue, or legal obligation
- rejected applications: up to **1 month after the relevant hackathon is closed**
- contact-form and support correspondence: for as long as needed to respond, handle follow-up, and document the request
- approved applications, team data, submissions, judging data, prize records, and audit records: retained for as long as reasonably necessary to operate the platform, preserve competition integrity, document outcomes, handle disputes, defend legal claims, and meet compliance needs

When an account is deleted, we may retain de-identified or pseudonymized operational records where reasonably necessary for compliance, security, auditability, or competition integrity.

## 10. Account deletion and de-identification

You can request deletion of your platform account through the platform functionality or by contacting us.

When you delete your account, we aim to:

- remove or replace direct account identifiers where appropriate
- remove platform-role and platform-document-acceptance records tied to your active account profile
- preserve operational records only where needed in de-identified or pseudonymized form

Deletion does not necessarily mean that every historical record disappears immediately if retention is required for legal, security, audit, dispute, or competition-integrity purposes.

## 11. Cookies and similar technologies

At launch, the platform does **not** use cookies for advertising, cross-site tracking, or behavioral profiling.

We do use technical mechanisms that are strictly necessary to run the service, such as:

- authentication and session state
- security and abuse-prevention controls
- functionality required to keep the platform working correctly

If we later introduce non-essential analytics, marketing, or profiling technologies, we will update the legal notices and any consent flows as needed.

## 12. Your rights

Depending on the circumstances, you may have the right to:

- access your personal data
- rectify inaccurate or incomplete data
- erase data
- restrict processing
- object to processing based on legitimate interests
- receive data portability where applicable
- withdraw consent where processing is based on consent
- lodge a complaint with a supervisory authority

To exercise your rights, contact [${platformPrivacyEmail}](mailto:${platformPrivacyEmail}).

You also have the right to lodge a complaint with the **Austrian Data Protection Authority (Datenschutzbehorde)** or with another competent supervisory authority in the EU. See [https://www.dsb.gv.at](https://www.dsb.gv.at).

## 13. Automated decision-making

We do not use solely automated decision-making or profiling that produces legal or similarly significant effects on you within the meaning of Article 22 GDPR.

## 14. Security

We use reasonable technical and organizational measures to protect the platform and personal data. No internet service can be completely secure, so we cannot guarantee absolute security.

## 15. Changes to this policy

We may update this Privacy Policy from time to time. The current platform version can be updated in the product's version-tracking records, and the public legal pages may also be updated in the repository-backed site content.

When required, we will take appropriate steps to notify users of material changes.
`.trim()

export const platformTermsMarkdown = `
## 1. Operator and scope

These Terms and Conditions govern your use of the Codex Hackathons platform operated by **${platformOperatorName}** from Vienna, Austria.

- Service address: ${platformOperatorAddress}
- Support contact: [${platformSupportEmail}](mailto:${platformSupportEmail})
- Privacy contact: [${platformPrivacyEmail}](mailto:${platformPrivacyEmail})

These terms apply to the platform itself. Individual hackathons may have additional application terms, winner terms, event rules, judging rules, or other program-specific documents. If a hackathon-specific document conflicts with these platform terms, the hackathon-specific document controls for that hackathon.

## 2. Eligibility

You must be at least **${platformMinimumAge} years old** to create an account or use the platform.

By using the platform, you confirm that:

- you are legally able to agree to these terms
- the information you provide is accurate and current
- you will use the platform only for lawful purposes

The platform is free to use for participants, judges, and admins. No fee is charged for platform access.

## 3. Platform account

You may create a platform account to browse, apply to hackathons, participate in teams, judge, or administer hackathons, depending on your permissions.

You are responsible for:

- maintaining the confidentiality of your sign-in credentials
- all activity carried out through your account
- keeping your profile information reasonably accurate

We may suspend or restrict access where reasonably necessary to protect the platform, investigate abuse, prevent fraud, address security issues, or comply with legal obligations.

## 4. Platform roles and hackathon workflows

The platform supports different roles and workflows, including participant, judge, hackathon admin, and platform admin functions.

Using the platform does not guarantee admission to any hackathon, approval of an application, assignment as a judge, or receipt of a prize. Participation outcomes depend on the workflow rules and decisions applicable to the relevant hackathon.

Hackathon access, team formation, submissions, judging, winners, and prize redemption are governed by:

- the platform's permission and lifecycle model
- the applicable hackathon-specific terms
- operational decisions made by the authorized actors in the platform

## 5. Your content and submissions

You retain ownership of content you submit to the platform, including application responses, team content, project submissions, repository links, demo links, and other materials you upload or provide.

However, by submitting or making content available through the platform, you grant ${platformOperatorName} a worldwide, non-exclusive, royalty-free, transferable, sublicensable license to host, store, reproduce, adapt for formatting, publish, display, distribute, promote, archive, and otherwise use that content for:

- operating and improving the platform
- running hackathons and judging workflows
- publishing results and winner information
- promoting the platform, hackathons, and related community activities
- creating recaps, archives, showcases, and historical records

This license continues for as long as reasonably necessary for those purposes and survives termination to the extent content has already been published, incorporated into records, or retained in archives or compliance materials.

You represent that you have the rights needed to submit the content and to grant this license.

## 6. Publicity and winner publication

If you participate in a hackathon, and especially if you become a winner or finalist, the platform and the relevant hackathon may publicly display or announce information such as:

- your name or team name
- project name
- submission summary
- demo link
- repository link

This may appear on the platform, in recap materials, or in related promotional communications.

## 7. Acceptable use

You must not use the platform to:

- break the law
- interfere with platform security or availability
- access data or workflows you are not authorized to access
- impersonate another person
- submit content you do not have the right to use
- upload malicious code or misuse the platform to attack other systems

Hackathon-specific codes of conduct and event rules may impose additional restrictions.

## 8. Suspension, removal, and termination

We may suspend, restrict, or terminate access to the platform, or remove content, where reasonably necessary to:

- protect the platform or other users
- investigate suspected fraud, abuse, impersonation, or security issues
- respond to intellectual-property complaints or other legal claims
- comply with legal obligations or lawful requests
- enforce these platform terms or applicable hackathon-specific terms

Where appropriate, we may also preserve audit records, security logs, and historical competition records after access ends.

You may stop using the platform at any time. Account deletion is handled according to the Privacy Policy and the platform's operational data-retention rules.

## 9. Third-party services and links

The platform relies on third-party services such as Auth0, Cloudflare, and Resend. Hackathon workflows may also include links to third-party services such as repository hosts or event pages.

We are not responsible for third-party services that we do not control. Your use of those services is subject to their own terms and privacy notices.

## 10. Availability and changes

We may update, change, pause, or discontinue parts of the platform at any time.

We try to keep the platform available and functioning, but we do not guarantee uninterrupted, error-free, or permanent availability. Features may change as the platform evolves.

## 11. No warranty

To the maximum extent permitted by law, the platform is provided on an "as is" and "as available" basis. We do not make warranties that the platform will always be uninterrupted, secure, error-free, or fit for a particular purpose.

Nothing in these terms excludes rights that cannot be excluded under applicable law.

## 12. Limitation of liability

To the maximum extent permitted by law, ${platformOperatorName} is not liable for indirect, incidental, special, consequential, or punitive damages, loss of profits, loss of opportunity, loss of goodwill, or loss of data arising from or related to the use of the platform.

Nothing in these terms excludes or limits liability for intent, gross negligence, death, personal injury, fraudulent misrepresentation, or any liability that cannot be limited under applicable law.

If mandatory consumer-protection law gives you additional rights, those rights remain unaffected.

## 13. Governing law

These terms are governed by Austrian law, excluding conflict-of-law rules, except to the extent mandatory consumer-protection law requires otherwise.

If a dispute must be brought before a court, the courts of Vienna, Austria will have jurisdiction to the extent permitted by applicable law. Mandatory venue rights of consumers remain unaffected.

## 14. Severability

If any provision of these terms is held invalid or unenforceable, the remaining provisions remain in effect.

## 15. Changes to these terms

We may update these Terms and Conditions from time to time.

Where required, we will take appropriate steps to notify users of material changes. Continued use of the platform after an update becomes effective means you accept the updated terms, unless applicable law requires a different process.
`.trim()

export const platformImprintMarkdown = `
## Operator

**${platformOperatorName}**  
${platformOperatorAddress}

## Contact

- General support: [${platformSupportEmail}](mailto:${platformSupportEmail})
- Privacy and data protection: [${platformPrivacyEmail}](mailto:${platformPrivacyEmail})
- You can also use the contact form on this page

## Responsible for content

${platformOperatorName}  
${platformOperatorAddress}

## Service description

Codex Hackathons is an online platform for hackathon discovery, applications, team formation, submissions, judging, winner publication, and prize-redemption workflows.

## Legal note

This website and platform are operated from Vienna, Austria. Hackathon-specific rules may be supplemented by additional documents shown within the relevant hackathon workflows.
`.trim()
