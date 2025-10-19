'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAIChat } from '@/hooks/useAIChat';
import AuthModal from '@/components/AuthModal';

export default function FoodPlannerPage() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<'signin' | 'signup'>('signup');
  const { messages, isLoading, guestWorkspaceId, sendMessage } = useAIChat('food');

  useEffect(() => {
    if (guestWorkspaceId) {
      router.push(`/guest/${guestWorkspaceId}`);
    }
  }, [guestWorkspaceId, router]);

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    router.push('/auth/persist-plan');
  };

  const openAuthModal = (tab: 'signin' | 'signup' = 'signup') => {
    setAuthDefaultTab(tab);
    setShowAuthModal(true);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage = input.trim();
    setInput('');
    sendMessage(userMessage);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-yellow-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-yellow-600 bg-clip-text text-transparent">
                🍽️ Food Planner
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Meal planning and nutrition tracking</p>
            </div>
            <div className="flex gap-3">
              <Link href="/" className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                ← Back to Home
              </Link>
              <button
                onClick={() => openAuthModal('signin')}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Product Explanation - Landing Page Content */}
        {messages.length === 0 && (
          <div className="mb-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold mb-3">Smart Meal Planning with AI</h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Stop struggling with meal planning. Chat with AI to create personalized meal plans,
                track nutrition, and simplify your relationship with food.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="flex gap-3">
                <div className="text-2xl">🥗</div>
                <div>
                  <h3 className="font-bold mb-1">Custom Meal Plans</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Tell AI your dietary preferences, goals, and restrictions. Get weekly meal plans tailored to you.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="text-2xl">📊</div>
                <div>
                  <h3 className="font-bold mb-1">Nutrition Tracking</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Track calories, macros, and micronutrients in organized tables. See your nutrition at a glance.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="text-2xl">🛒</div>
                <div>
                  <h3 className="font-bold mb-1">Auto Shopping Lists</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    AI generates shopping lists from your meal plans. Never forget an ingredient again.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="text-2xl">🍽️</div>
                <div>
                  <h3 className="font-bold mb-1">Recipe Database</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Get recipe suggestions, cooking instructions, and prep time estimates for every meal.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4 border border-green-200 dark:border-green-900">
              <p className="text-sm text-green-900 dark:text-green-100">
                <strong>💬 Try it:</strong> "I want to eat healthier, lose 10 pounds, and need low-carb meal ideas for the week"
              </p>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 250px)' }}>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🍽️</div>
                <h2 className="text-2xl font-bold mb-2">Welcome to Food Planner</h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                  Chat with AI to create personalized meal plans and track your nutrition. Tell me about your dietary goals and preferences.
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user' ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-3">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sign-up prompt banner */}
          {messages.length > 0 && (
            <div className="border-t border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">💾</div>
                  <div>
                    <h4 className="font-semibold text-green-900 dark:text-green-100">Save your plan</h4>
                    <p className="text-sm text-green-700 dark:text-green-300">Sign up to save your progress and continue working on your plan</p>
                  </div>
                </div>
                <button
                  onClick={() => openAuthModal('signup')}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Sign Up Free
                </button>
              </div>
            </div>
          )}

          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Tell me about your dietary goals..."
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-2xl mb-2">🥗</div>
            <h3 className="font-semibold mb-1">Meal Plans</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Weekly meal planning and prep guides</p>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-2xl mb-2">📊</div>
            <h3 className="font-semibold mb-1">Nutrition Tracking</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Monitor macros and micronutrients</p>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-2xl mb-2">📝</div>
            <h3 className="font-semibold mb-1">Shopping Lists</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Auto-generated grocery lists</p>
          </div>
        </div>
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
        defaultTab={authDefaultTab}
      />
    </div>
  );
}
