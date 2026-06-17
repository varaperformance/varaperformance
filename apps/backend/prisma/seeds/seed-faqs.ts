import 'dotenv/config';
import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const FAQ_CATEGORIES = {
  GENERAL: 'faq-cat-0001-0001-0001-000000000001',
  COACHING: 'faq-cat-0001-0001-0001-000000000002',
  PRICING: 'faq-cat-0001-0001-0001-000000000003',
  TRAINING: 'faq-cat-0001-0001-0001-000000000004',
  ACCOUNT: 'faq-cat-0001-0001-0001-000000000005',
  SUPPORT: 'faq-cat-0001-0001-0001-000000000006',
};

const faqCategories = [
  {
    id: FAQ_CATEGORIES.GENERAL,
    name: 'General',
    slug: 'general',
    description: 'General questions about Vara Performance',
    order: 1,
    isActive: true,
  },
  {
    id: FAQ_CATEGORIES.COACHING,
    name: 'Coaching',
    slug: 'coaching',
    description: 'Questions about our coaching services and programs',
    order: 2,
    isActive: true,
  },
  {
    id: FAQ_CATEGORIES.PRICING,
    name: 'Pricing & Billing',
    slug: 'pricing-billing',
    description: 'Questions about plans, pricing, and payment',
    order: 3,
    isActive: true,
  },
  {
    id: FAQ_CATEGORIES.TRAINING,
    name: 'Training Programs',
    slug: 'training-programs',
    description: 'Questions about workout programs and exercises',
    order: 4,
    isActive: true,
  },
  {
    id: FAQ_CATEGORIES.ACCOUNT,
    name: 'Account & Settings',
    slug: 'account-settings',
    description: 'Questions about your account and preferences',
    order: 5,
    isActive: true,
  },
  {
    id: FAQ_CATEGORIES.SUPPORT,
    name: 'Support',
    slug: 'support',
    description: 'How to get help and troubleshooting',
    order: 6,
    isActive: true,
  },
];

const faqs = [
  // General FAQs
  {
    question: 'What is Vara Performance?',
    answer:
      'Vara Performance is a comprehensive fitness platform that connects you with certified coaches, personalized training programs, and a supportive community. Our mission is to help you achieve your fitness goals through expert guidance, data-driven insights, and proven methodologies.',
    categoryId: FAQ_CATEGORIES.GENERAL,
    order: 1,
    isActive: true,
    isFeatured: true,
  },
  {
    question: 'How do I get started?',
    answer:
      "Getting started is easy! Simply create an account, complete your fitness profile, and browse our available coaches. You can start with a free trial to explore the platform, view sample programs, and find the right coach for your goals. Once you're ready, choose a subscription plan that fits your needs.",
    categoryId: FAQ_CATEGORIES.GENERAL,
    order: 2,
    isActive: true,
    isFeatured: true,
  },
  {
    question: 'Is Vara Performance suitable for beginners?',
    answer:
      "Absolutely! Vara Performance caters to all fitness levels, from complete beginners to advanced athletes. Our coaches specialize in different areas and experience levels. When you sign up, we'll help match you with a coach who understands where you're starting from and can guide you appropriately.",
    categoryId: FAQ_CATEGORIES.GENERAL,
    order: 3,
    isActive: true,
    isFeatured: false,
  },
  {
    question: 'What equipment do I need?',
    answer:
      "It depends on your goals and chosen program! We offer programs for all setups: home workouts with no equipment, minimal equipment (resistance bands, dumbbells), and full gym access. During onboarding, tell us what equipment you have access to, and we'll tailor recommendations accordingly.",
    categoryId: FAQ_CATEGORIES.GENERAL,
    order: 4,
    isActive: true,
    isFeatured: false,
  },

  // Coaching FAQs
  {
    question: 'How are coaches vetted?',
    answer:
      'All Vara Performance coaches undergo a rigorous verification process. We verify certifications (NASM, ACE, NSCA, etc.), check professional references, review their coaching experience, and conduct interviews. Coaches must also complete our platform training to ensure they can effectively use our tools to support your progress.',
    categoryId: FAQ_CATEGORIES.COACHING,
    order: 1,
    isActive: true,
    isFeatured: true,
  },
  {
    question: 'Can I switch coaches?',
    answer:
      "Yes, you can switch coaches at any time. We understand that finding the right coach-client fit is important. If you feel your current coach isn't the right match, simply visit your account settings and request a coach change. Our support team can also help recommend coaches based on your feedback.",
    categoryId: FAQ_CATEGORIES.COACHING,
    order: 2,
    isActive: true,
    isFeatured: false,
  },
  {
    question: 'How do I communicate with my coach?',
    answer:
      'You can communicate with your coach through our built-in messaging system, which supports text, images, and video. Most coaches respond within 24 hours on business days. Some premium plans include video calls and real-time check-ins. Your coach will establish communication expectations during your onboarding session.',
    categoryId: FAQ_CATEGORIES.COACHING,
    order: 3,
    isActive: true,
    isFeatured: false,
  },
  {
    question: "What if I'm not satisfied with my coaching experience?",
    answer:
      "Your satisfaction is our priority. If you're not happy with your coaching experience, contact our support team within 14 days of your subscription start. We'll work with you to find a better coach match or provide a refund according to our satisfaction guarantee policy.",
    categoryId: FAQ_CATEGORIES.COACHING,
    order: 4,
    isActive: true,
    isFeatured: false,
  },

  // Pricing FAQs
  {
    question: 'What plans are available?',
    answer:
      'We offer several subscription tiers: **Basic** (self-guided programs with community access), **Standard** (async coaching with weekly check-ins), and **Premium** (dedicated 1-on-1 coaching with video calls). All plans include access to our exercise library and progress tracking tools. Visit our pricing page for current rates.',
    categoryId: FAQ_CATEGORIES.PRICING,
    order: 1,
    isActive: true,
    isFeatured: true,
  },
  {
    question: 'Is there a free trial?',
    answer:
      "Yes! We offer a 7-day free trial that gives you access to explore the platform, view sample programs, and connect with coaches. No credit card is required to start your trial. You'll have full access to decide if Vara Performance is right for you before committing.",
    categoryId: FAQ_CATEGORIES.PRICING,
    order: 2,
    isActive: true,
    isFeatured: true,
  },
  {
    question: 'How do I cancel my subscription?',
    answer:
      "You can cancel your subscription at any time from your Account Settings page. Navigate to Billing > Manage Subscription > Cancel. Your access will continue until the end of your current billing period. We don't offer prorated refunds for mid-cycle cancellations, but you won't be charged again.",
    categoryId: FAQ_CATEGORIES.PRICING,
    order: 3,
    isActive: true,
    isFeatured: false,
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'We accept all major credit cards (Visa, MasterCard, American Express, Discover) and PayPal. Payments are processed securely through Stripe, our payment provider. For enterprise or team accounts, we can also arrange invoicing.',
    categoryId: FAQ_CATEGORIES.PRICING,
    order: 4,
    isActive: true,
    isFeatured: false,
  },

  // Training Programs FAQs
  {
    question: 'How are training programs created?',
    answer:
      'Training programs are created by certified coaches using evidence-based methodologies. Programs are tailored to your fitness level, goals, available equipment, and schedule. Your coach will create and adjust your program based on your progress, feedback, and any constraints you have.',
    categoryId: FAQ_CATEGORIES.TRAINING,
    order: 1,
    isActive: true,
    isFeatured: false,
  },
  {
    question: 'Can I modify my workout schedule?',
    answer:
      'Yes! Life happens, and we get it. You can adjust workout days, swap exercises (with coach approval for similar movements), or request schedule modifications. Simply message your coach or use the reschedule feature in the app. Consistency is key, but flexibility helps maintain long-term adherence.',
    categoryId: FAQ_CATEGORIES.TRAINING,
    order: 2,
    isActive: true,
    isFeatured: false,
  },
  {
    question: 'Do you offer nutrition guidance?',
    answer:
      'Many of our coaches provide nutrition guidance as part of their coaching services. This typically includes macro recommendations, meal timing advice, and general nutritional education. Note that specific meal plans and medical dietary advice require coaches with appropriate nutrition certifications.',
    categoryId: FAQ_CATEGORIES.TRAINING,
    order: 3,
    isActive: true,
    isFeatured: false,
  },
  {
    question: 'How do I track my progress?',
    answer:
      'Vara Performance includes comprehensive progress tracking: workout logs, body measurements, progress photos, strength PRs, and performance metrics. Your dashboard shows trends over time, and your coach reviews this data during check-ins. You can also export your data at any time.',
    categoryId: FAQ_CATEGORIES.TRAINING,
    order: 4,
    isActive: true,
    isFeatured: true,
  },

  // Account FAQs
  {
    question: 'How do I update my profile?',
    answer:
      'Go to Settings > Profile to update your personal information, fitness goals, available equipment, and preferences. Keep your profile current so your coach can provide the most relevant guidance. You can update your profile photo, bio, and other details from the same page.',
    categoryId: FAQ_CATEGORIES.ACCOUNT,
    order: 1,
    isActive: true,
    isFeatured: false,
  },
  {
    question: 'Can I have multiple profiles?',
    answer:
      'Each account is tied to one user profile. If multiple family members want to use Vara Performance, each person needs their own account. We offer family discount codes periodically—check with support or watch our newsletter for promotions.',
    categoryId: FAQ_CATEGORIES.ACCOUNT,
    order: 2,
    isActive: true,
    isFeatured: false,
  },
  {
    question: 'How do I change my password?',
    answer:
      "Navigate to Settings > Security > Change Password. You'll need to enter your current password and then your new password twice for confirmation. We recommend using a strong, unique password and enabling two-factor authentication for additional security.",
    categoryId: FAQ_CATEGORIES.ACCOUNT,
    order: 3,
    isActive: true,
    isFeatured: false,
  },
  {
    question: 'Is my data secure?',
    answer:
      'Yes, we take data security seriously. All data is encrypted in transit (TLS 1.3) and at rest (AES-256). We follow industry best practices for security, conduct regular audits, and comply with GDPR and CCPA regulations. View our Privacy Policy for complete details on how we handle your data.',
    categoryId: FAQ_CATEGORIES.ACCOUNT,
    order: 4,
    isActive: true,
    isFeatured: true,
  },

  // Support FAQs
  {
    question: 'How do I contact support?',
    answer:
      'You can reach our support team through: the in-app Help Center, email at support@varaperformance.com, or the chat widget on our website. Business hours are Monday-Friday, 9 AM - 6 PM EST. We aim to respond to all inquiries within 24 hours.',
    categoryId: FAQ_CATEGORIES.SUPPORT,
    order: 1,
    isActive: true,
    isFeatured: false,
  },
  {
    question: "The app isn't working correctly. What should I do?",
    answer:
      'First, try these troubleshooting steps: 1) Refresh the page or restart the app, 2) Clear your browser cache, 3) Check your internet connection, 4) Try a different browser or device. If the issue persists, contact support with details about the problem, your device/browser, and any error messages.',
    categoryId: FAQ_CATEGORIES.SUPPORT,
    order: 2,
    isActive: true,
    isFeatured: false,
  },
  {
    question: 'How do I report a bug or suggest a feature?',
    answer:
      'We love feedback! Use the Feedback button in the app or email feedback@varaperformance.com. For bugs, please include: what you were trying to do, what happened instead, your device and browser info, and screenshots if possible. Feature suggestions help us prioritize our roadmap.',
    categoryId: FAQ_CATEGORIES.SUPPORT,
    order: 3,
    isActive: true,
    isFeatured: false,
  },
  {
    question: 'Where can I find tutorials and guides?',
    answer:
      'Check out our Help Center for video tutorials, written guides, and tips for getting the most out of Vara Performance. We also publish helpful content on our blog and YouTube channel. New to the platform? Start with our "Getting Started" guide in the Help Center.',
    categoryId: FAQ_CATEGORIES.SUPPORT,
    order: 4,
    isActive: true,
    isFeatured: false,
  },
];

async function main() {
  console.log('🚀 Starting FAQ seed...');

  // Seed FAQ Categories
  console.log('📁 Seeding FAQ categories...');
  for (const category of faqCategories) {
    await prisma.faqCategory.upsert({
      where: { id: category.id },
      update: category,
      create: category,
    });
    console.log(`  ✓ Category: ${category.name}`);
  }

  // Seed FAQs
  console.log('❓ Seeding FAQs...');
  for (const faq of faqs) {
    await prisma.faq.upsert({
      where: {
        id: `faq-${faq.categoryId.slice(-4)}-${String(faq.order).padStart(4, '0')}`,
      },
      update: faq,
      create: {
        id: `faq-${faq.categoryId.slice(-4)}-${String(faq.order).padStart(4, '0')}`,
        ...faq,
      },
    });
    console.log(`  ✓ FAQ: ${faq.question.slice(0, 50)}...`);
  }

  console.log('✅ FAQ seed completed!');
  console.log(`   - ${faqCategories.length} categories`);
  console.log(`   - ${faqs.length} FAQs`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
