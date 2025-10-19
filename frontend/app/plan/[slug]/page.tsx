import { Metadata } from 'next';
import Link from 'next/link';
import PlanningChat from '@/components/PlanningChat';

interface PageProps {
  params: {
    slug: string;
  };
}

async function getCategory(slug: string) {
  try {
    const res = await fetch(`http://localhost:8000/api/planning/category/${slug}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const category = await getCategory(params.slug);

  if (!category) {
    return {
      title: 'Category Not Found - Plain',
    };
  }

  return {
    title: category.seoTitle,
    description: category.seoDescription,
    keywords: category.seoKeywords,
    openGraph: {
      title: category.seoTitle,
      description: category.seoDescription,
      type: 'website',
    },
  };
}

export default async function PlanningCategoryPage({ params }: PageProps) {
  const category = await getCategory(params.slug);

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Category Not Found</h1>
          <Link href="/landing" className="text-blue-600 hover:underline">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const colorClasses: { [key: string]: string } = {
    emerald: 'from-emerald-500 to-emerald-600',
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    rose: 'from-rose-500 to-rose-600',
    amber: 'from-amber-500 to-amber-600',
    indigo: 'from-indigo-500 to-indigo-600',
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/landing" className="text-2xl font-bold">
            Plain
          </Link>
          <Link href="/planner" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Go to Planner
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className={`bg-gradient-to-r ${colorClasses[category.color] || 'from-blue-500 to-purple-600'} text-white py-20`}>
        <div className="container mx-auto px-4 text-center">
          <div className="text-6xl mb-4">{category.icon}</div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{category.name}</h1>
          <p className="text-xl md:text-2xl opacity-90 max-w-3xl mx-auto">
            {category.longDescription}
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">What You'll Get</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {category.features.map((feature: string, idx: number) => (
            <div key={idx} className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
              <div className="flex items-start gap-3">
                <span className="text-2xl">✓</span>
                <p className="text-lg">{feature}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Planning Chat Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">Start Your {category.name} Plan</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Chat with our AI consultant to create your personalized plan
            </p>
          </div>

          <PlanningChat category={category} />
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-16 bg-white dark:bg-gray-800 rounded-3xl my-16">
        <h2 className="text-3xl font-bold text-center mb-12">How the Planning Process Works</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              1
            </div>
            <h3 className="text-xl font-bold mb-2">Answer Questions</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Our AI will ask you key questions about your goals and situation
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              2
            </div>
            <h3 className="text-xl font-bold mb-2">AI Analyzes</h3>
            <p className="text-gray-600 dark:text-gray-400">
              The AI understands your needs and creates a tailored strategy
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-green-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              3
            </div>
            <h3 className="text-xl font-bold mb-2">Get Your Plan</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Receive a complete plan with goals, actions, metrics, and timelines
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Common Questions</h2>
        <div className="max-w-3xl mx-auto space-y-4">
          <details className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <summary className="font-semibold cursor-pointer text-lg">
              How long does it take to create a plan?
            </summary>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              The planning conversation typically takes 5-10 minutes. The AI will generate your comprehensive plan instantly after gathering your information.
            </p>
          </details>
          <details className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <summary className="font-semibold cursor-pointer text-lg">
              Can I modify my plan later?
            </summary>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Yes! Your plan is fully editable. You can adjust goals, actions, timelines, and all other aspects as your situation changes.
            </p>
          </details>
          <details className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <summary className="font-semibold cursor-pointer text-lg">
              Is my data private?
            </summary>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Absolutely. All your planning data is private and secure. We never share your information with third parties.
            </p>
          </details>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-4xl font-bold mb-6">Ready to Start Your {category.name} Journey?</h2>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
          Let our AI consultant guide you to success. Start planning for free today.
        </p>
        <a
          href="#start"
          className="inline-block px-8 py-4 bg-blue-600 text-white rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
        >
          Start Planning Now
        </a>
      </section>
    </div>
  );
}
