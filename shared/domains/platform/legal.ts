export const platformLegalLastUpdatedIso = '2026-03-30'
export const platformLegalLastUpdatedLabel = '30 March 2026'

export const platformOperatorName = 'Alexandru Gavrilescu'
export const platformOperatorAddress = 'Zentagasse 33/2, 1050 Vienna, Austria'
export const platformSupportEmail = 'support@codex-hackathons.com'
export const platformPrivacyEmail = 'privacy@codex-hackathons.com'
export const platformImprintContactApiPath = '/api/public/imprint-contact'
export const platformMinimumAge = 18
export const platformLegalContactLanguages = 'German and English'
export const platformBusinessPurpose = 'Operation of Codex Hackathons, an online platform for hackathon discovery, applications, team formation, submissions, judging, winner publication, and prize-redemption workflows.'
export const platformEditorialLine = 'Information about Codex Hackathons, its hackathon programs, participation workflows, and published competition outcomes.'

export const platformPrivacyPolicyMarkdown = `
## 1. Controller and contact details

Codex Hackathons is operated by **${platformOperatorName}** from Vienna, Austria.

- Controller: ${platformOperatorName}
- Postal address: ${platformOperatorAddress}
- General support: [${platformSupportEmail}](mailto:${platformSupportEmail})
- Privacy contact: [${platformPrivacyEmail}](mailto:${platformPrivacyEmail})

No separate data protection officer has been appointed.

## 2. Scope of this policy

This Privacy Policy explains how we process personal data when you:

- visit the Codex Hackathons website
- create and use a platform account
- apply to hackathons
- join or manage teams
- submit projects
- participate in judging or hackathon administration
- redeem prizes
- contact us through the imprint contact form or by email

Hackathon-specific application terms, winner terms, and event materials may contain additional rules for a particular hackathon. This policy covers the platform-level processing behind those workflows as operated through Codex Hackathons.

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

- company and bio
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
- request metadata, logs, IP-address-related technical information, and security events reasonably needed to operate and secure the platform

### Publicly displayed competition data

If a hackathon publishes results, we may publicly display winner and project information such as:

- participant or team names
- project names
- demo links
- repository links

## 5. Purposes of processing and legal bases

We process personal data for the following purposes:

### To create accounts and operate the platform

This includes sign-in, account provisioning, profile management, hackathon participation, team workflows, submissions, judging, prize workflows, and hackathon administration.

**Legal basis:** performance of a contract with you or steps taken at your request before entering into a contract (Article 6(1)(b) GDPR).

### To run support, privacy, and legal-contact channels

This includes handling messages sent through the imprint contact form or by email, answering questions, and following up on your request.

**Legal basis:** legitimate interests (Article 6(1)(f) GDPR) in responding to inquiries and operating the service, and where your request concerns entering into or using the service, Article 6(1)(b) GDPR.

### To secure the service and preserve operational integrity

This includes preventing abuse, protecting accounts, investigating incidents, preserving audit trails, and defending the platform against misuse.

**Legal basis:** legitimate interests (Article 6(1)(f) GDPR) and, where applicable, compliance with legal obligations (Article 6(1)(c) GDPR).

### To comply with legal, tax, accounting, or regulatory obligations

This includes handling lawful requests, retaining records where required by law, and preserving evidence relevant to disputes or compliance matters.

**Legal basis:** compliance with legal obligations (Article 6(1)(c) GDPR).

### To publish and document hackathon outcomes

This includes publishing winner details, team names, project names, demo links, repository links, and related recap or showcase material where a hackathon publishes results.

**Legal basis:** legitimate interests (Article 6(1)(f) GDPR) in operating, documenting, and promoting the platform and its hackathons, together with the platform and hackathon terms that apply to participation.

Our legitimate interests include operating a secure hackathon platform, preventing abuse, answering inquiries, documenting competition outcomes, and defending legal claims.

## 6. Sources of personal data

We receive personal data:

- directly from you when you create an account, complete your profile, apply, participate, submit content, redeem prizes, or contact us
- from Auth0 when you authenticate and create or use your platform account
- from hackathon admins, judges, or team admins when they carry out workflow actions within the platform
- from technical systems that generate operational and security metadata while the service is used

We do not rely on publicly accessible sources for ordinary platform operation, except where you voluntarily provide public links such as social-profile URLs, repository URLs, or demo URLs.

## 7. Recipients of personal data

We share personal data only where needed to run the platform and hackathons.

### Processors and infrastructure providers

At launch, the platform uses:

- **Auth0** for authentication and identity
- **Cloudflare** for application hosting, database, storage, queue infrastructure, and transactional email delivery

These providers process data on our behalf according to their service terms and data-processing arrangements.

### Other users inside the platform

Depending on your role and the workflow:

- hackathon admins may view application, participation, submission, prize, and operational records needed to run a hackathon
- judges may access blind-judging data assigned to them
- team members and team admins may see team and submission information relevant to their team

### Public recipients

If a hackathon publishes results, winner and project information may become public as described above.

### Authorities and advisers

We may also disclose information to competent authorities, courts, insurers, auditors, or professional advisers where legally required or reasonably necessary to establish, exercise, or defend legal claims.

We do not sell personal data. We do not use participant data for advertising or behavioral profiling. At launch, we do not share participant data with sponsors, venue partners, or unrelated third parties outside the listed service providers unless a specific hackathon workflow clearly tells you otherwise.

## 8. International transfers

Some service providers may process personal data outside the EEA or make support, security, or infrastructure resources available from outside the EEA.

Where personal data is transferred internationally, we rely on lawful transfer mechanisms such as adequacy decisions, standard contractual clauses, or other safeguards permitted by GDPR.

You can request more information about relevant safeguards by contacting [${platformPrivacyEmail}](mailto:${platformPrivacyEmail}).

## 9. Retention

We keep personal data only for as long as needed for the purposes described above or as long as required by law.

Our current platform-level retention approach is:

- inactive platform accounts: up to **2 years** after the last meaningful activity, unless deleted earlier or retention is needed for a dispute, security issue, or legal obligation
- rejected applications: up to **1 month after the relevant hackathon is closed**
- contact-form and support correspondence: for as long as needed to respond, handle follow-up, document the request, and resolve any related legal or operational issue
- approved applications, team data, submissions, judging data, prize records, and audit records: retained for as long as reasonably necessary to operate the platform, preserve competition integrity, document outcomes, handle disputes, defend legal claims, and meet compliance needs

When an account is deleted, we may retain de-identified or pseudonymized operational records where reasonably necessary for compliance, security, auditability, or competition integrity.

## 10. When providing data is required

Some personal data is required so we can provide the service:

- if you do not provide the data required for account creation and authentication, you cannot create or use a platform account
- if you do not provide the fields required for a specific hackathon application or workflow, you may not be able to apply, join a team, submit a project, judge, administer the hackathon, or redeem a prize
- if you do not provide a working email address or enough information in a support or imprint-contact request, we may be unable to respond effectively

Providing optional profile fields is voluntary. Not providing optional fields may limit only the specific optional feature that uses them.

## 11. Cookies and similar technologies

At launch, the platform does **not** use cookies or similar technologies for advertising, cross-site tracking, or behavioral profiling.

We do use strictly necessary cookies and similar local storage mechanisms to run the service, such as:

- authentication and session state
- security and abuse-prevention controls
- site preferences such as selected theme and navigation state
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

You also have the right to lodge a complaint with the **Austrian Data Protection Authority (Datenschutzbehoerde)** or with another competent supervisory authority in the EU. See [https://www.dsb.gv.at](https://www.dsb.gv.at).

## 13. Automated decision-making

We do not use solely automated decision-making or profiling that produces legal or similarly significant effects on you within the meaning of Article 22 GDPR.

## 14. Security

We use reasonable technical and organizational measures to protect the platform and personal data. No internet service can be completely secure, so we cannot guarantee absolute security.

## 15. Changes to this policy

We may update this Privacy Policy from time to time. The current platform version can be updated in the product's version-tracking records, and the public legal pages may also be updated in the repository-backed site content.

When required, we will take appropriate steps to notify users of material changes.
`.trim()

export const platformTermsMarkdown = `
## 1. Operator, scope, and contact points

These Terms and Conditions govern your use of the Codex Hackathons platform operated by **${platformOperatorName}** from Vienna, Austria.

- Service address: ${platformOperatorAddress}
- General support: [${platformSupportEmail}](mailto:${platformSupportEmail})
- Privacy contact: [${platformPrivacyEmail}](mailto:${platformPrivacyEmail})
- Digital Services Act point of contact for recipients of the service: [${platformSupportEmail}](mailto:${platformSupportEmail})
- Digital Services Act point of contact for Member State authorities, the Commission, and the European Board for Digital Services: [${platformSupportEmail}](mailto:${platformSupportEmail})
- Languages accepted for legal and DSA communications: ${platformLegalContactLanguages}

These terms apply to the platform itself. Individual hackathons may have additional application terms, winner terms, event rules, judging rules, or other program-specific documents. If a hackathon-specific document conflicts with these platform terms, the hackathon-specific document controls for that hackathon.

## 2. Eligibility and account responsibilities

You must be at least **${platformMinimumAge} years old** to create an account or use the platform.

By using the platform, you confirm that:

- you are legally able to agree to these terms
- the information you provide is accurate and current
- you will use the platform only for lawful purposes

The platform is currently offered free of charge for participants, judges, and admins.

You are responsible for:

- maintaining the confidentiality of your sign-in credentials
- all activity carried out through your account
- keeping your profile information reasonably accurate

We may suspend or restrict access where reasonably necessary to protect the platform, investigate abuse, prevent fraud, address security issues, or comply with legal obligations.

## 3. Platform roles and workflows

The platform supports different roles and workflows, including participant, judge, hackathon admin, and platform admin functions.

Using the platform does not guarantee admission to any hackathon, approval of an application, assignment as a judge, or receipt of a prize. Participation outcomes depend on the workflow rules and decisions applicable to the relevant hackathon.

Hackathon access, team formation, submissions, judging, winners, and prize redemption are governed by:

- the platform's permission and lifecycle model
- the applicable hackathon-specific terms
- operational decisions made by the authorized actors in the platform

## 4. Your content and the rights you grant

You retain ownership of content you submit to the platform, including application responses, team content, project submissions, repository links, demo links, and other materials you upload or provide.

By submitting or making content available through the platform, you grant ${platformOperatorName} a worldwide, non-exclusive, royalty-free license to host, store, reproduce, technically adapt, display, distribute within platform workflows, publish where the platform or a hackathon publishes outcomes, and archive that content to the extent reasonably necessary for:

- operating and improving the platform
- running hackathons and judging workflows
- publishing results and winner information
- promoting the platform, hackathons, and related community activities
- creating recaps, archives, showcases, and historical records

We may allow processors and service providers acting on our behalf to handle that content only to the extent needed to provide the service.

This license continues for as long as reasonably necessary for those purposes and survives termination to the extent content has already been published, incorporated into records, or retained in archives or compliance materials.

You represent that you have the rights needed to submit the content and to grant this license.

## 5. Restrictions on recipient-provided information and content moderation

You must not use the platform to provide or distribute information that is:

- unlawful, fraudulent, or misleading
- infringing of third-party intellectual-property, privacy, publicity, or other rights
- abusive, threatening, harassing, hateful, or defamatory
- intended to bypass platform permissions or access controls
- malicious, technically harmful, or intended to disrupt the security or availability of the platform
- incompatible with these terms or with clearly applicable hackathon-specific rules

To enforce these rules and comply with law, we may review notices we receive from users, rights holders, or authorities, and we may also review content or behavior on our own initiative where reasonably necessary for platform integrity and safety.

Measures we may take include:

- removing content
- disabling access to content
- restricting the visibility of content
- suspending or terminating access to the service in whole or in part
- suspending or terminating an account

When applying these restrictions, we aim to act diligently, objectively, proportionately, and with due regard to the rights and legitimate interests of all affected parties. At the time of this version, moderation decisions under these terms are not made solely by automated means; final restriction decisions are reviewed by a human.

If we take a restriction action against your content or account, we will generally send a statement of reasons to the electronic contact details associated with your account or notice, unless legal, security, or abuse-prevention reasons justify a limitation on what we can disclose.

## 6. Notices of illegal content and redress

If you want to notify us about allegedly illegal content or a violation of these terms, contact [${platformSupportEmail}](mailto:${platformSupportEmail}) and include enough information for us to identify the relevant account, content, submission, or URL and understand your concern.

If you are directly affected by a restriction decision under these terms, you may contest that decision by emailing [${platformSupportEmail}](mailto:${platformSupportEmail}) within six months after the decision notice. We will review the request and respond by email.

These contact channels do not limit any right you may have to seek judicial or administrative redress.

## 7. Publicity and winner publication

If you participate in a hackathon, and especially if you become a winner or finalist, the platform and the relevant hackathon may publicly display or announce information such as:

- your name or team name
- project name
- submission summary
- demo link
- repository link

This may appear on the platform, in recap materials, or in related promotional communications.

## 8. Suspension, termination, and preservation of records

We may suspend, restrict, or terminate access to the platform, or remove content, where reasonably necessary to:

- protect the platform or other users
- investigate suspected fraud, abuse, impersonation, or security issues
- respond to intellectual-property complaints or other legal claims
- comply with legal obligations or lawful requests
- enforce these platform terms or applicable hackathon-specific terms

Where appropriate, we may preserve audit records, security logs, and historical competition records after access ends.

You may stop using the platform at any time. Account deletion is handled according to the Privacy Policy and the platform's operational data-retention rules.

## 9. Third-party services and links

The platform relies on third-party services such as Auth0 and Cloudflare. Hackathon workflows may also include links to third-party services such as repository hosts or event pages.

We are not responsible for third-party services that we do not control. Your use of those services is subject to their own terms and privacy notices.

## 10. Availability and service changes

We may update, change, pause, or discontinue parts of the platform at any time.

We try to keep the platform available and functioning, but we do not guarantee uninterrupted, error-free, or permanent availability. Features may change as the platform evolves.

## 11. Consumer information

Nothing in these terms limits mandatory rights that apply to consumers under applicable law.

We are not currently obliged and do not currently agree to participate in alternative dispute resolution before a consumer arbitration body, unless mandatory law requires otherwise for a specific dispute.

## 12. Warranty and liability

Nothing in these terms excludes or limits liability where liability cannot be excluded or limited under applicable law, including liability for intent, gross negligence, death, personal injury, or fraudulent misrepresentation.

For slight negligence, liability is limited to breaches of essential contractual obligations and to the typical, foreseeable damage resulting from the breach, to the extent permitted by law. Otherwise, liability for slight negligence is excluded to the extent permitted by law.

Mandatory consumer-protection rights remain unaffected.

## 13. Governing law and jurisdiction

These terms are governed by Austrian law, excluding conflict-of-law rules, except to the extent mandatory consumer-protection law requires otherwise.

If a dispute must be brought before a court, the courts of Vienna, Austria will have jurisdiction to the extent permitted by applicable law. Mandatory venue rights of consumers remain unaffected.

## 14. Severability

If any provision of these terms is held invalid or unenforceable, the remaining provisions remain in effect.

## 15. Changes to these terms

We may update these Terms and Conditions when the service, law, security requirements, or operational model changes.

If a change materially affects your rights or obligations, we will take appropriate steps to give advance notice where reasonable and, where required, ask for renewed acceptance before continued use of affected features.
`.trim()

export const platformImprintMarkdown = `
## Operator

**${platformOperatorName}**  
${platformOperatorAddress}

## Media owner and publisher

**${platformOperatorName}**  
${platformOperatorAddress}

## Business purpose

${platformBusinessPurpose}

## Basic editorial line

${platformEditorialLine}

## Contact

- General support: [${platformSupportEmail}](mailto:${platformSupportEmail})
- Privacy and data protection: [${platformPrivacyEmail}](mailto:${platformPrivacyEmail})
- You can also use the contact form on this page

## Digital Services Act contact points

- Contact point for recipients of the service: [${platformSupportEmail}](mailto:${platformSupportEmail})
- Contact point for Member State authorities, the European Commission, and the European Board for Digital Services: [${platformSupportEmail}](mailto:${platformSupportEmail})
- Languages accepted for legal and DSA communications: ${platformLegalContactLanguages}

## Responsible for content

${platformOperatorName}  
${platformOperatorAddress}

## Legal note

This website and platform are operated from Vienna, Austria. Hackathon-specific rules may be supplemented by additional documents shown within the relevant hackathon workflows.
`.trim()
