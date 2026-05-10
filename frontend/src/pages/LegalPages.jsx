import { useState, useRef, useEffect } from 'react';
import { X, Shield, FileText, Check, ChevronDown } from 'lucide-react';
import { Button } from '../components/ui';

// ─── Shared helpers ───────────────────────────────────────────────────────────

const LEGAL_LS_KEY = 'hoa_legal_accepted_v1';

export function getLegalAcceptance() {
  try { return JSON.parse(localStorage.getItem(LEGAL_LS_KEY) || 'null'); } catch { return null; }
}

export function saveLegalAcceptance() {
  const now = new Date().toISOString();
  localStorage.setItem(LEGAL_LS_KEY, JSON.stringify({ terms: now, privacy: now, acceptedAt: now }));
}

// ─── Privacy Policy Content ───────────────────────────────────────────────────

function PrivacyContent() {
  return (
    <div className="prose prose-sm max-w-none text-slate-600 space-y-4 text-xs leading-relaxed">
      <p className="text-slate-400 text-[11px]">Effective Date: January 1, 2026 · Last Updated: May 1, 2026</p>

      <section>
        <h3 className="text-sm font-semibold text-slate-800 mb-1">1. Introduction</h3>
        <p>ChakrazAI HOA Management Platform ("ChakrazAI," "we," "our," or "us") is committed to protecting the privacy of homeowners, board members, property managers, and all users of our platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our software-as-a-service platform.</p>
        <p>By accessing or using the Platform, you agree to the collection and use of information in accordance with this Privacy Policy.</p>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-800 mb-1">2. Information We Collect</h3>
        <p><strong>Personal Information:</strong> We collect information you provide directly to us, including:</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Full name, unit number, and contact information (email, phone, mailing address)</li>
          <li>Co-owner and household member information</li>
          <li>Vehicle information (make, model, year, license plate) for parking management</li>
          <li>Financial information including HOA dues history, payment methods, and account balances</li>
          <li>Tenant information including lease terms and contact details</li>
          <li>Amenity access credentials (key fobs, access cards, parking tags)</li>
        </ul>
        <p className="mt-2"><strong>Automatically Collected Information:</strong> When you use the Platform, we automatically collect:</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Log data (IP address, browser type, pages visited, time and date of access)</li>
          <li>Device information (device type, operating system)</li>
          <li>Usage data and interaction patterns within the Platform</li>
        </ul>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-800 mb-1">3. How We Use Your Information</h3>
        <p>We use the information we collect to:</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Provide, operate, and maintain the HOA management services</li>
          <li>Process HOA dues payments and maintain financial records</li>
          <li>Send communications regarding violations, maintenance, meetings, and community notices</li>
          <li>Manage amenity access, parking, and facility reservations</li>
          <li>Conduct elections and ballot management in compliance with California Civil Code §§ 5100–5145</li>
          <li>Generate tax documents (Form 1120-H, 1099-NEC) and financial reports</li>
          <li>Comply with applicable laws, including the Davis-Stirling Common Interest Development Act</li>
          <li>Improve and optimize the Platform</li>
          <li>Respond to your requests and provide customer support</li>
        </ul>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-800 mb-1">4. Information Sharing and Disclosure</h3>
        <p>We do not sell, trade, or rent your personal information to third parties. We may share information in the following limited circumstances:</p>
        <ul className="list-disc pl-4 space-y-1">
          <li><strong>Within the Community:</strong> Board members and authorized property managers may access resident information necessary for HOA administration</li>
          <li><strong>Service Providers:</strong> We share information with third-party vendors who assist us in operating the Platform (payment processors, email delivery services, cloud infrastructure)</li>
          <li><strong>Legal Requirements:</strong> We may disclose information when required by law, court order, or government authority</li>
          <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets, your information may be transferred</li>
          <li><strong>Vendor Contractors:</strong> Vendor contact information may be shared with HOA administration for contract management purposes</li>
        </ul>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-800 mb-1">5. Data Security</h3>
        <p>We implement industry-standard security measures to protect your personal information, including:</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Encryption of data in transit (TLS/SSL) and at rest (AES-256)</li>
          <li>Role-based access controls limiting data access to authorized personnel</li>
          <li>Regular security audits and vulnerability assessments</li>
          <li>Secure authentication including multi-factor authentication options</li>
        </ul>
        <p>No method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your information, we cannot guarantee absolute security.</p>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-800 mb-1">6. Data Retention</h3>
        <p>We retain personal information for as long as necessary to provide the Platform services, comply with legal obligations, resolve disputes, and enforce agreements. Financial records are retained for a minimum of seven (7) years in compliance with federal and state tax requirements. Election and ballot records are retained for a minimum of two (2) years per California Civil Code § 5125.</p>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-800 mb-1">7. Your California Privacy Rights (CCPA)</h3>
        <p>Under the California Consumer Privacy Act (CCPA), California residents have the right to:</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Know what personal information is collected about them</li>
          <li>Know whether their personal information is sold or disclosed and to whom</li>
          <li>Opt out of the sale of personal information (we do not sell personal information)</li>
          <li>Access their personal information</li>
          <li>Request deletion of their personal information, subject to certain exceptions</li>
          <li>Non-discrimination for exercising their CCPA rights</li>
        </ul>
        <p>To exercise these rights, please contact us at privacy@chakrazai.com.</p>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-800 mb-1">8. Cookies and Tracking Technologies</h3>
        <p>We use cookies and similar tracking technologies to enhance your experience on the Platform. Essential cookies are required for Platform functionality. You may disable non-essential cookies through your browser settings, though this may affect certain Platform features.</p>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-800 mb-1">9. Children's Privacy</h3>
        <p>The Platform is not directed to individuals under the age of 18. We do not knowingly collect personal information from minors. If you believe a minor has provided us with personal information, please contact us immediately.</p>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-800 mb-1">10. Changes to This Privacy Policy</h3>
        <p>We may update this Privacy Policy from time to time. We will notify you of material changes by posting the new Privacy Policy on the Platform and updating the "Last Updated" date. Your continued use of the Platform after changes constitutes acceptance of the revised Policy.</p>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-800 mb-1">11. Contact Us</h3>
        <p>If you have questions or concerns about this Privacy Policy, please contact us at:</p>
        <p>ChakrazAI, Inc. · privacy@chakrazai.com · 1234 Innovation Drive, Suite 100, San Francisco, CA 94105</p>
      </section>
    </div>
  );
}

// ─── Terms of Use Content ─────────────────────────────────────────────────────

function TermsContent() {
  return (
    <div className="prose prose-sm max-w-none text-slate-600 space-y-4 text-xs leading-relaxed">
      <p className="text-slate-400 text-[11px]">Effective Date: January 1, 2026 · Last Updated: May 1, 2026</p>

      <section>
        <h3 className="text-sm font-semibold text-slate-800 mb-1">1. Acceptance of Terms</h3>
        <p>These Terms of Use ("Terms") constitute a legally binding agreement between you and ChakrazAI, Inc. ("ChakrazAI," "we," "our," or "us") governing your use of the ChakrazAI HOA Management Platform ("Platform"). By accessing or using the Platform, you confirm that you have read, understood, and agree to be bound by these Terms. If you do not agree to these Terms, you must not access or use the Platform.</p>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-800 mb-1">2. Platform Description</h3>
        <p>ChakrazAI provides a software-as-a-service platform for homeowner association management, including but not limited to: dues and payment processing, violation tracking, maintenance work order management, vendor management, document storage, community communications, election and ballot management, and amenity administration. The Platform is intended for use by HOA boards, property managers, and homeowners.</p>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-800 mb-1">3. User Accounts and Eligibility</h3>
        <p>To access the Platform, you must:</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Be at least 18 years of age</li>
          <li>Be an authorized user designated by your HOA or property management company</li>
          <li>Provide accurate, current, and complete registration information</li>
          <li>Maintain the security of your account credentials</li>
          <li>Promptly notify ChakrazAI of any unauthorized use of your account</li>
        </ul>
        <p>You are responsible for all activities that occur under your account. ChakrazAI reserves the right to suspend or terminate accounts that violate these Terms.</p>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-800 mb-1">4. Authorized Use</h3>
        <p>You may use the Platform solely for lawful HOA management purposes in accordance with these Terms. You agree not to:</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Use the Platform for any unlawful purpose or in violation of applicable laws</li>
          <li>Share access credentials with unauthorized individuals</li>
          <li>Attempt to gain unauthorized access to any part of the Platform or other users' accounts</li>
          <li>Upload, transmit, or distribute malware, viruses, or other harmful code</li>
          <li>Scrape, crawl, or use automated tools to extract data from the Platform</li>
          <li>Reverse engineer, decompile, or disassemble any portion of the Platform</li>
          <li>Use the Platform to harass, discriminate against, or harm any person</li>
          <li>Violate the Fair Housing Act or any applicable anti-discrimination law</li>
          <li>Misrepresent resident information, financial data, or election results</li>
          <li>Use the Platform in a manner that could damage, disable, or impair the service</li>
        </ul>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-800 mb-1">5. Davis-Stirling Act Compliance</h3>
        <p>For California HOA communities, the Platform includes features designed to assist with compliance with the Davis-Stirling Common Interest Development Act (California Civil Code §§ 4000–6150). You acknowledge that:</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>ChakrazAI is a technology platform and does not provide legal advice</li>
          <li>You are solely responsible for ensuring your HOA's compliance with applicable laws</li>
          <li>Election and ballot features are tools to assist compliance with §§ 5100–5145 but do not guarantee legal compliance</li>
          <li>Fine and assessment features include AB 130 guidance but you must consult legal counsel for enforcement decisions</li>
          <li>All governing documents, meeting minutes, and financial records remain the property of the HOA</li>
        </ul>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-800 mb-1">6. Payment Terms</h3>
        <p>Subscription fees are billed in advance on a monthly or annual basis as selected at signup. All fees are non-refundable except as required by applicable law. You authorize ChakrazAI to charge your payment method for all fees incurred. ChakrazAI reserves the right to modify pricing with 30 days' notice. Failure to pay may result in suspension of Platform access.</p>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-800 mb-1">7. Intellectual Property</h3>
        <p>The Platform and all its content, features, and functionality (including software, text, graphics, logos, and interfaces) are owned by ChakrazAI and are protected by copyright, trademark, patent, and other intellectual property laws. You are granted a limited, non-exclusive, non-transferable license to use the Platform solely for your HOA management purposes. You retain ownership of all data and content you submit to the Platform.</p>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-800 mb-1">8. Data and Privacy</h3>
        <p>Your use of the Platform is also governed by our Privacy Policy, which is incorporated into these Terms by reference. You represent that you have obtained all necessary consents and authorizations to submit personal information of homeowners, tenants, and other individuals to the Platform, in compliance with applicable privacy laws including the California Consumer Privacy Act (CCPA).</p>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-800 mb-1">9. Disclaimer of Warranties</h3>
        <p>THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR UNINTERRUPTED SERVICE. CHAKRAZAI DOES NOT WARRANT THAT THE PLATFORM WILL BE ERROR-FREE, SECURE, OR AVAILABLE AT ALL TIMES.</p>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-800 mb-1">10. Limitation of Liability</h3>
        <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, CHAKRAZAI AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE PLATFORM, INCLUDING BUT NOT LIMITED TO LOSS OF DATA, REVENUE, OR GOODWILL, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. CHAKRAZAI'S TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT PAID BY YOU IN THE TWELVE MONTHS PRECEDING THE CLAIM.</p>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-800 mb-1">11. Indemnification</h3>
        <p>You agree to indemnify and hold harmless ChakrazAI and its affiliates from any claims, losses, liabilities, damages, costs, and expenses (including reasonable attorneys' fees) arising from your use of the Platform, violation of these Terms, or violation of any applicable law or third-party rights.</p>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-800 mb-1">12. Termination</h3>
        <p>ChakrazAI may suspend or terminate your access to the Platform at any time for violation of these Terms or for any other reason with reasonable notice. Upon termination, your right to use the Platform ceases immediately. You may export your community data within 30 days of termination. ChakrazAI will delete your data in accordance with our data retention policy.</p>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-800 mb-1">13. Governing Law and Dispute Resolution</h3>
        <p>These Terms are governed by the laws of the State of California without regard to conflict of law principles. Any disputes shall be resolved by binding arbitration under the American Arbitration Association rules in San Francisco, California, except that either party may seek injunctive relief in court for intellectual property violations. You waive the right to participate in class action lawsuits.</p>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-800 mb-1">14. Changes to Terms</h3>
        <p>ChakrazAI reserves the right to modify these Terms at any time. Material changes will be communicated via the Platform or email with at least 14 days' notice. Continued use of the Platform after changes take effect constitutes acceptance of the revised Terms.</p>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-800 mb-1">15. Contact</h3>
        <p>For questions about these Terms, please contact: ChakrazAI, Inc. · legal@chakrazai.com · 1234 Innovation Drive, Suite 100, San Francisco, CA 94105</p>
      </section>
    </div>
  );
}

// ─── Full page views ──────────────────────────────────────────────────────────

export function PrivacyPolicyPage() {
  return (
    <div className="page-enter max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-navy-50 rounded-xl flex items-center justify-center flex-shrink-0">
          <Shield size={18} className="text-navy-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Privacy Policy</h1>
          <p className="text-xs text-slate-400">ChakrazAI HOA Management Platform</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <PrivacyContent />
      </div>
    </div>
  );
}

export function TermsOfUsePage() {
  return (
    <div className="page-enter max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-navy-50 rounded-xl flex items-center justify-center flex-shrink-0">
          <FileText size={18} className="text-navy-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Terms of Use</h1>
          <p className="text-xs text-slate-400">ChakrazAI HOA Management Platform</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <TermsContent />
      </div>
    </div>
  );
}

// ─── Acceptance Modal ─────────────────────────────────────────────────────────

export function LegalAcceptanceModal({ onAccept }) {
  const [activeTab, setActiveTab] = useState('terms');
  const [termsRead, setTermsRead]     = useState(false);
  const [privacyRead, setPrivacyRead] = useState(false);
  const [termsChecked, setTermsChecked]     = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const termsRef   = useRef(null);
  const privacyRef = useRef(null);

  const canProceed = termsChecked && privacyChecked;

  const handleScroll = (ref, setRead) => {
    const el = ref.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) setRead(true);
  };

  const handleAccept = () => {
    saveLegalAcceptance();
    onAccept();
  };

  const tabs = [
    { id: 'terms',   label: 'Terms of Use',   icon: FileText, done: termsChecked },
    { id: 'privacy', label: 'Privacy Policy', icon: Shield,   done: privacyChecked },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-navy-700 rounded-xl flex items-center justify-center flex-shrink-0">
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Before you continue</h2>
              <p className="text-xs text-slate-400 mt-0.5">Please review and accept our Terms of Use and Privacy Policy</p>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-2 mt-4">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === t.id ? 'bg-navy-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                }`}>
                {t.done
                  ? <Check size={11} className={activeTab === t.id ? 'text-emerald-300' : 'text-emerald-500'} />
                  : <t.icon size={11} />}
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable content */}
        {activeTab === 'terms' && (
          <div
            ref={termsRef}
            onScroll={() => handleScroll(termsRef, setTermsRead)}
            className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
            <TermsContent />
            {!termsRead && (
              <div className="sticky bottom-0 py-2 text-center">
                <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                  <ChevronDown size={11} className="animate-bounce" /> Scroll to the bottom to accept
                </span>
              </div>
            )}
          </div>
        )}
        {activeTab === 'privacy' && (
          <div
            ref={privacyRef}
            onScroll={() => handleScroll(privacyRef, setPrivacyRead)}
            className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
            <PrivacyContent />
            {!privacyRead && (
              <div className="sticky bottom-0 py-2 text-center">
                <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                  <ChevronDown size={11} className="animate-bounce" /> Scroll to the bottom to accept
                </span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex-shrink-0 space-y-3">
          {activeTab === 'terms' && (
            <label className={`flex items-start gap-3 cursor-pointer ${!termsRead ? 'opacity-40 pointer-events-none' : ''}`}>
              <div onClick={() => termsRead && setTermsChecked(v => !v)}
                className={`w-4 h-4 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all cursor-pointer ${
                  termsChecked ? 'bg-navy-600 border-navy-600' : 'border-slate-300'
                }`}>
                {termsChecked && <Check size={10} className="text-white" />}
              </div>
              <span className="text-xs text-slate-600">
                I have read and agree to the <strong>Terms of Use</strong> of ChakrazAI HOA Management Platform.
              </span>
            </label>
          )}
          {activeTab === 'privacy' && (
            <label className={`flex items-start gap-3 cursor-pointer ${!privacyRead ? 'opacity-40 pointer-events-none' : ''}`}>
              <div onClick={() => privacyRead && setPrivacyChecked(v => !v)}
                className={`w-4 h-4 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all cursor-pointer ${
                  privacyChecked ? 'bg-navy-600 border-navy-600' : 'border-slate-300'
                }`}>
                {privacyChecked && <Check size={10} className="text-white" />}
              </div>
              <span className="text-xs text-slate-600">
                I have read and agree to the <strong>Privacy Policy</strong> of ChakrazAI HOA Management Platform.
              </span>
            </label>
          )}

          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-1.5">
              {tabs.map(t => (
                <div key={t.id} className={`w-2 h-2 rounded-full transition-colors ${t.done ? 'bg-emerald-500' : 'bg-slate-200'}`} />
              ))}
              <span className="text-[10px] text-slate-400 ml-1">
                {[termsChecked, privacyChecked].filter(Boolean).length}/2 accepted
              </span>
            </div>
            {!canProceed ? (
              <div className="flex gap-2">
                {!termsChecked && (
                  <Button variant="secondary" size="sm" onClick={() => setActiveTab('terms')}>
                    <FileText size={11} />Review Terms
                  </Button>
                )}
                {!privacyChecked && (
                  <Button variant="secondary" size="sm" onClick={() => setActiveTab('privacy')}>
                    <Shield size={11} />Review Privacy
                  </Button>
                )}
              </div>
            ) : (
              <Button variant="primary" size="sm" onClick={handleAccept}>
                <Check size={12} />Accept & Continue
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
