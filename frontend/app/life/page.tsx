'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAIChat } from '@/hooks/useAIChat';
import AuthModal from '@/components/AuthModal';
import { supabase } from '@/lib/supabase/client';

export default function LifePlannerPage() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<'signin' | 'signup'>('signup');
  const { messages, isLoading, guestWorkspaceId, sendMessage, isAuthenticated } = useAIChat('life');

  // Redirect to workspace after plan is created
  useEffect(() => {
    if (guestWorkspaceId) {
      router.push(`/p/${guestWorkspaceId}`);
    }
  }, [guestWorkspaceId, router]);

  const handleAuthSuccess = async () => {
    setShowAuthModal(false);

    // If there's a guest workspace, associate it with the authenticated user
    if (guestWorkspaceId) {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          await fetch('http://localhost:8000/api/workspaces/associate-guest', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
              workspaceId: guestWorkspaceId
            })
          });

          console.log('Guest workspace associated with user');
        }
      } catch (error) {
        console.error('Error associating workspace:', error);
      }
      router.push(`/p/${guestWorkspaceId}`);
    }
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                🙂 Life Planner
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">AI-powered comprehensive life planning</p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/"
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                ← Back to Home
              </Link>
              <button
                onClick={() => openAuthModal('signin')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        {/* Product Explanation - Enhanced Landing Page Content */}
        {messages.length === 0 && (
          <div className="mb-8">
            {/* Hero Section for Life Planner */}
            <div className="text-center mb-12">
              <div className="inline-block mb-4 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-700 dark:text-blue-300 text-sm font-semibold">
                🌟 Most Popular Planner
              </div>
              <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Your Complete Life Plan<br/>Starts with a Conversation
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-8">
                Organize every area of your life—health, career, relationships, finances, and more.
                Our AI transforms your thoughts into structured, actionable plans in minutes.
              </p>
            </div>

            {/* Value Props */}
            <div className="grid md:grid-cols-2 gap-6 mb-10">
              <div className="group p-6 bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:shadow-xl">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl">
                    💡
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">AI That Gets You</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                      Just talk naturally about your goals and challenges. AI understands context and creates personalized plans with actionable steps.
                    </p>
                  </div>
                </div>
              </div>

              <div className="group p-6 bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 transition-all hover:shadow-xl">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl">
                    🗂️
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Beautifully Organized</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                      Automatic organization into tables, views, and timelines. Annual goals, quarterly milestones, monthly actions—all structured for you.
                    </p>
                  </div>
                </div>
              </div>

              <div className="group p-6 bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 transition-all hover:shadow-xl">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl">
                    🔄
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Evolves With You</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                      Life changes. Your plan should too. Update anytime by chatting with AI—refine goals, shift priorities, add new dreams.
                    </p>
                  </div>
                </div>
              </div>

              <div className="group p-6 bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-pink-500 dark:hover:border-pink-500 transition-all hover:shadow-xl">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl">
                    📈
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Track Everything</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                      Monitor progress across all life areas. See what's working, what needs attention, and celebrate wins along the way.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Example Prompt CTA */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-2xl p-8 border-2 border-blue-200 dark:border-blue-900">
              <div className="flex items-start gap-4">
                <div className="text-4xl">💬</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-3">Try This Example</h3>
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-blue-300 dark:border-blue-700 mb-4">
                    <p className="text-gray-700 dark:text-gray-300 italic">
                      "Help me plan my year. I want to get healthier, advance my career, spend more time with family, and learn Spanish. Create a comprehensive life plan with specific goals and action steps."
                    </p>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>What happens next:</strong> AI creates a full workspace with tables for goals, habits, monthly actions, and tracking—all tailored to your specific situation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chat Interface */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 250px)' }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🙂</div>
                <h2 className="text-2xl font-bold mb-2">Welcome to Life Planner</h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                  Chat with AI to create a personalized life plan. Tell me about your goals, priorities, and what you'd like to achieve.
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
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
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sign-up prompt banner - shows when user has messages */}
          {messages.length > 0 && !isAuthenticated && (
            <div className="border-t border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">💾</div>
                  <div>
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100">Save your plan</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">Sign up to save your progress and continue working on your plan</p>
                  </div>
                </div>
                <button
                  onClick={() => openAuthModal('signup')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Sign Up Free
                </button>
              </div>
            </div>
          )}

          {/* Input */}
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
                placeholder="Tell me about your goals and priorities..."
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-2xl mb-2">🎯</div>
            <h3 className="font-semibold mb-1">Set Goals</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Define annual, quarterly, and monthly goals</p>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-2xl mb-2">✅</div>
            <h3 className="font-semibold mb-1">Track Actions</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Break down goals into actionable tasks</p>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-2xl mb-2">📊</div>
            <h3 className="font-semibold mb-1">Monitor Progress</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Track metrics and review regularly</p>
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
