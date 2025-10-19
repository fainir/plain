'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAIChat } from '@/hooks/useAIChat';
import AuthModal from '@/components/AuthModal';

export default function FitnessPlannerPage() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<'signin' | 'signup'>('signup');
  const { messages, isLoading, guestWorkspaceId, sendMessage } = useAIChat('fitness');

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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                🏋️ Fitness Tracker
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Workout plans and health goals</p>
            </div>
            <div className="flex gap-3">
              <Link href="/" className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                ← Back to Home
              </Link>
              <button
                onClick={() => openAuthModal('signin')}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
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
              <h2 className="text-3xl font-bold mb-3">AI-Powered Fitness Planning</h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Achieve your fitness goals faster. Chat with AI to create personalized workout plans,
                track progress, and stay motivated on your fitness journey.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="flex gap-3">
                <div className="text-2xl">💪</div>
                <div>
                  <h3 className="font-bold mb-1">Custom Workout Plans</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    AI designs workout routines based on your fitness level, available equipment, and time constraints.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="text-2xl">📈</div>
                <div>
                  <h3 className="font-bold mb-1">Progress Tracking</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Log workouts, track strength gains, monitor body measurements, and see your improvements over time.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="text-2xl">🎯</div>
                <div>
                  <h3 className="font-bold mb-1">Goal Setting</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Set specific fitness goals—weight loss, muscle gain, endurance—and get AI guidance to achieve them.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="text-2xl">📅</div>
                <div>
                  <h3 className="font-bold mb-1">Workout Scheduling</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Get weekly schedules that fit your life, with rest days, active recovery, and progressive overload.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 dark:bg-orange-950 rounded-lg p-4 border border-orange-200 dark:border-orange-900">
              <p className="text-sm text-orange-900 dark:text-orange-100">
                <strong>💬 Try it:</strong> "Create a 3-day strength training plan for building muscle. I have dumbbells and can workout 45 minutes per session"
              </p>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 250px)' }}>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🏋️</div>
                <h2 className="text-2xl font-bold mb-2">Welcome to Fitness Tracker</h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                  Chat with AI to create personalized workout plans and track your fitness journey. Tell me about your fitness goals.
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user' ? 'bg-orange-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
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
            <div className="border-t border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">💾</div>
                  <div>
                    <h4 className="font-semibold text-orange-900 dark:text-orange-100">Save your plan</h4>
                    <p className="text-sm text-orange-700 dark:text-orange-300">Sign up to save your progress and continue working on your plan</p>
                  </div>
                </div>
                <button
                  onClick={() => openAuthModal('signup')}
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
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
                placeholder="Tell me about your fitness goals..."
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-2xl mb-2">💪</div>
            <h3 className="font-semibold mb-1">Workout Plans</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Customized exercise routines</p>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-2xl mb-2">📈</div>
            <h3 className="font-semibold mb-1">Progress Tracking</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Monitor strength and endurance gains</p>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-2xl mb-2">🎯</div>
            <h3 className="font-semibold mb-1">Health Goals</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Set and achieve fitness milestones</p>
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
