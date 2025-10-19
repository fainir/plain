import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Plain - AI Life Planning Assistant | Smart Project & Goal Manager',
  description: 'Free AI-powered life planner and project manager. Plan your health, finances, career, and personal goals with intelligent assistance. Create comprehensive plans based on your needs.',
  keywords: ['ai planner', 'project manager', 'life planner', 'goal planner', 'ai assistant', 'personal planning', 'smart planner', 'ai project management'],
  openGraph: {
    title: 'Plain - AI Life Planning Assistant',
    description: 'Transform your life with AI-powered planning. Health, finance, career, and more.',
    type: 'website',
  },
};

async function getCategories() {
  try {
    const res = await fetch('http://localhost:8000/api/planning/categories', {
      cache: 'no-store',
    });
    if (!res.ok) return { categories: [] };
    return await res.json();
  } catch {
    return { categories: [] };
  }
}

export default async function LandingPage() {
  const { categories } = await getCategories();

  const colorClasses: { [key: string]: string } = {
    emerald: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200',
    blue: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
    purple: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
    rose: 'bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200',
    amber: 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200',
    indigo: 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Your AI Life Planning Consultant
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-8">
            Transform your life with intelligent planning. Get personalized strategies for health, finance, career, relationships, and more.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/planner"
              className="px-8 py-4 bg-blue-600 text-white rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
            >
              Start Planning Now
            </Link>
            <a
              href="#how-it-works"
              className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg text-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-lg"
            >
              How It Works
            </a>
          </div>
        </div>
      </section>

      {/* What We Offer */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-4xl font-bold text-center mb-12">Plan Every Aspect of Your Life</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {categories.map((category: any) => (
            <Link
              key={category.id}
              href={`/plan/${category.slug}`}
              className="block p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
            >
              <div className={`inline-block p-3 rounded-lg mb-4 ${colorClasses[category.color] || 'bg-gray-100'}`}>
                <span className="text-3xl">{category.icon}</span>
              </div>
              <h3 className="text-2xl font-bold mb-2">{category.name}</h3>
              <p className="text-gray-600 dark:text-gray-400">{category.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="container mx-auto px-4 py-16 bg-white dark:bg-gray-800/50 rounded-3xl my-16">
        <h2 className="text-4xl font-bold text-center mb-12">How Plain Works</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              1
            </div>
            <h3 className="text-xl font-bold mb-2">Choose Your Focus</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Select the area of life you want to plan - health, finance, career, or any other aspect
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              2
            </div>
            <h3 className="text-xl font-bold mb-2">Chat with AI</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Answer questions about your goals, situation, and preferences. The AI learns about you
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-green-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              3
            </div>
            <h3 className="text-xl font-bold mb-2">Get Your Plan</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Receive a comprehensive, personalized plan with goals, actions, metrics, and timelines
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-4xl font-bold text-center mb-12">Powerful Features</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-xl font-bold mb-2">Goal Setting</h3>
            <p className="text-gray-600 dark:text-gray-400">Set and track meaningful goals with AI guidance</p>
          </div>
          <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-bold mb-2">Progress Tracking</h3>
            <p className="text-gray-600 dark:text-gray-400">Monitor your progress with charts and metrics</p>
          </div>
          <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-bold mb-2">AI Assistant</h3>
            <p className="text-gray-600 dark:text-gray-400">Get personalized advice and insights anytime</p>
          </div>
          <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="text-xl font-bold mb-2">Smart Planning</h3>
            <p className="text-gray-600 dark:text-gray-400">Organize tasks, timelines, and dependencies</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-4xl font-bold mb-6">Ready to Transform Your Life?</h2>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
          Join thousands using Plain to plan and achieve their goals. Start for free today.
        </p>
        <Link
          href="/planner"
          className="inline-block px-8 py-4 bg-blue-600 text-white rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
        >
          Get Started Free
        </Link>
      </section>
    </div>
  );
}
