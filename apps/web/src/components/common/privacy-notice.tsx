import { Link } from 'react-router';
import { ShieldCheck } from 'lucide-react';

type PrivacyNoticeVariant = 'health' | 'payment' | 'profile';

const notices: Record<PrivacyNoticeVariant, string> = {
  health:
    'Your health data is encrypted at rest (AES-256-GCM) and processed under HIPAA authorization. You can export or delete it at any time from Settings.',
  payment:
    'Payment info is processed by Stripe and never stored on our servers. Shipping details are kept only to fulfill your order.',
  profile:
    'Your profile information is used to personalize your experience. You can update or delete your data at any time from Settings.',
};

export function PrivacyNotice({ variant }: { variant: PrivacyNoticeVariant }) {
  return (
    <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
      <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
      <span>
        {notices[variant]}{' '}
        <Link
          to="/legal/privacy-policy"
          className="underline underline-offset-2 hover:text-foreground"
        >
          Privacy&nbsp;Policy
        </Link>
      </span>
    </p>
  );
}
