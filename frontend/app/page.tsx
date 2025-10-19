'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import AuthModal from '@/components/AuthModal';

interface Workspace {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export default function Home() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<'signin' | 'signup'>('signup');

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        setIsAuthenticated(true);
        setUserEmail(session.user.email || null);

        // Fetch workspaces
        try {
          const response = await fetch('http://localhost:8000/api/workspaces', {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          });

          const data = await response.json();
          const allWorkspaces = data.workspaces || [];

          // Sort workspaces: Life Planner first, then others
          const sorted = allWorkspaces.sort((a: Workspace, b: Workspace) => {
            if (a.name === 'Life Planner') return -1;
            if (b.name === 'Life Planner') return 1;
            return a.name.localeCompare(b.name);
          });

          setWorkspaces(sorted);
        } catch (err) {
          console.error('Error fetching workspaces:', err);
        }
      } else {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    router.push('/auth/persist-plan');
  };

  const openAuthModal = (tab: 'signin' | 'signup' = 'signup') => {
    setAuthDefaultTab(tab);
    setShowAuthModal(true);
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('http://localhost:8000/api/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          name: newWorkspaceName,
          icon: '📁',
          description: ''
        })
      });

      const data = await response.json();
      if (data.id) {
        router.push(`/p/${data.id}`);
      }
    } catch (err) {
      console.error('Error creating workspace:', err);
    }
  };

  // Show loading state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Plain</h1>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show planner types for unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        {/* Header */}
        <header className="border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  🌿 Plain
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">AI-Powered Life Planning</p>
              </div>
              <button
                onClick={() => openAuthModal('signin')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Sign In
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-12">
          {/* Hero Section */}
          <div className="text-center mb-20 px-4">
            <div className="inline-block mb-4 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-700 dark:text-blue-300 text-sm font-semibold">
              ✨ Powered by Claude AI
            </div>
            <h2 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent leading-tight">
              Transform Your Goals<br/>Into Reality
            </h2>
            <p className="text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-8 leading-relaxed">
              The intelligent planning platform that turns conversations into actionable plans.
              <span className="block mt-2 text-lg">Start free—no credit card required.</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                href="/life"
                className="px-10 py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Start Planning Free →
              </Link>
              <Link
                href="#how-it-works"
                className="px-10 py-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all font-bold text-lg border-2 border-gray-200 dark:border-gray-700"
              >
                See How It Works
              </Link>
            </div>

            {/* Social Proof */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                <span className="font-semibold">Free to start</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                <span className="font-semibold">No credit card needed</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                <span className="font-semibold">Start in 30 seconds</span>
              </div>
            </div>
          </div>

          {/* Planner Types Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-20">
            {[
              { name: 'Life Planner', icon: '🙂', path: '/life', desc: 'Organize all aspects of your life' },
              { name: 'Food Planner', icon: '🍽️', path: '/food', desc: 'Meal planning and nutrition tracking' },
              { name: 'Fitness Tracker', icon: '🏋️', path: '/fitness', desc: 'Workout plans and health goals' },
              { name: 'Finance Manager', icon: '💰', path: '/finance', desc: 'Budget tracking and savings goals' },
              { name: 'Career Planner', icon: '💼', path: '/career', desc: 'Professional development and goals' },
              { name: 'Learning Tracker', icon: '📚', path: '/learning', desc: 'Educational goals and progress' },
            ].map((planner) => (
              <Link
                key={planner.path}
                href={planner.path}
                className="group p-8 bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-xl transition-all"
              >
                <div className="text-6xl mb-4">{planner.icon}</div>
                <h3 className="text-2xl font-bold mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {planner.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">{planner.desc}</p>
                <div className="mt-4 text-blue-600 dark:text-blue-400 font-medium">
                  Start Planning →
                </div>
              </Link>
            ))}
          </div>

          {/* How It Works */}
          <div id="how-it-works" className="max-w-6xl mx-auto mb-20 scroll-mt-20">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-bold mb-4">How Plain Works</h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                From conversation to execution in three simple steps
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-12">
              <div className="relative">
                <div className="text-center">
                  <div className="relative inline-block mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl">
                      <span className="text-4xl">💬</span>
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">1</div>
                  </div>
                  <h3 className="text-2xl font-bold mb-4">Chat Naturally</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    Tell our AI assistant about your goals in plain English. No forms, no complex setup—just conversation.
                  </p>
                </div>
                {/* Connecting line */}
                <div className="hidden md:block absolute top-10 left-full w-full h-0.5 bg-gradient-to-r from-blue-300 to-purple-300 dark:from-blue-700 dark:to-purple-700 -ml-6"></div>
              </div>
              <div className="relative">
                <div className="text-center">
                  <div className="relative inline-block mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl">
                      <span className="text-4xl">📊</span>
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">2</div>
                  </div>
                  <h3 className="text-2xl font-bold mb-4">AI Creates Structure</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    Watch as AI transforms your ideas into organized tables, timelines, and actionable steps—automatically.
                  </p>
                </div>
                <div className="hidden md:block absolute top-10 left-full w-full h-0.5 bg-gradient-to-r from-purple-300 to-green-300 dark:from-purple-700 dark:to-green-700 -ml-6"></div>
              </div>
              <div className="text-center">
                <div className="relative inline-block mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl">
                    <span className="text-4xl">✅</span>
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm">3</div>
                </div>
                <h3 className="text-2xl font-bold mb-4">Execute & Track</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Update progress, check off tasks, and evolve your plan. Your AI assistant adapts as you grow.
                </p>
              </div>
            </div>
          </div>

          {/* Why Plain? Value Propositions */}
          <div className="max-w-6xl mx-auto mb-20">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-bold mb-4">Why Choose Plain?</h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                The difference between scattered thoughts and organized success
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="group p-8 bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:shadow-2xl">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 text-3xl shadow-lg">
                    🤖
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">AI That Actually Understands</h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
                      Powered by Claude, our AI doesn't just follow templates—it understands context, adapts to your style, and creates truly personalized plans.
                    </p>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                        Natural language understanding
                      </li>
                      <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                        Context-aware suggestions
                      </li>
                      <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                        Learns your preferences
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="group p-8 bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 transition-all hover:shadow-2xl">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 text-3xl shadow-lg">
                    📊
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-3 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">From Chaos to Clarity</h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
                      Transform messy ideas into clean, structured workspaces. Tables, views, timelines—all organized automatically.
                    </p>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                        Multiple view types (table, kanban, timeline)
                      </li>
                      <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                        Custom filters and sorting
                      </li>
                      <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                        Real-time updates
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="group p-8 bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 transition-all hover:shadow-2xl">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center flex-shrink-0 text-3xl shadow-lg">
                    ⚡
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-3 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">Start Instantly, Scale Forever</h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
                      No learning curve. Start as a guest, upgrade when ready. Your data grows with you—from first idea to complete life system.
                    </p>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                        No signup required to try
                      </li>
                      <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                        Automatic save & sync
                      </li>
                      <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                        Unlimited workspaces
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="group p-8 bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-pink-500 dark:hover:border-pink-500 transition-all hover:shadow-2xl">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center flex-shrink-0 text-3xl shadow-lg">
                    🎯
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-3 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">Your Data, Your Way</h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
                      Full control over your information. Edit inline, create custom views, export anytime. No vendor lock-in.
                    </p>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-pink-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                        Inline editing
                      </li>
                      <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-pink-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                        Custom categories & tags
                      </li>
                      <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-pink-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                        Export to CSV/JSON
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Use Cases / Testimonials Section */}
          <div className="max-w-6xl mx-auto mb-20">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-bold mb-4">Built for Every Aspect of Life</h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Real people using Plain to achieve real goals
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800 p-8 rounded-2xl border border-blue-200 dark:border-gray-700">
                <div className="text-4xl mb-4">💼</div>
                <p className="text-gray-700 dark:text-gray-300 italic mb-4">
                  "Plain helped me organize my career transition. From skill gaps to networking—everything in one place. Got my dream job in 3 months."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full"></div>
                  <div>
                    <div className="font-bold">Sarah Chen</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Software Engineer</div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-800 p-8 rounded-2xl border border-green-200 dark:border-gray-700">
                <div className="text-4xl mb-4">🏋️</div>
                <p className="text-gray-700 dark:text-gray-300 italic mb-4">
                  "Tried every fitness app. Plain is different—it adapts to me. Lost 30 lbs and actually enjoying the process."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full"></div>
                  <div>
                    <div className="font-bold">Marcus Johnson</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Entrepreneur</div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-gray-800 dark:to-gray-800 p-8 rounded-2xl border border-pink-200 dark:border-gray-700">
                <div className="text-4xl mb-4">📚</div>
                <p className="text-gray-700 dark:text-gray-300 italic mb-4">
                  "Learning Japanese felt overwhelming. Plain broke it into daily steps. Now I'm conversational after 6 months!"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-500 rounded-full"></div>
                  <div>
                    <div className="font-bold">Emma Rodriguez</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Student</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Final CTA Section */}
          <div className="max-w-4xl mx-auto">
            <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl p-12 text-white shadow-2xl">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/3 translate-y-1/3"></div>
              </div>

              <div className="relative z-10 text-center">
                <h2 className="text-5xl md:text-6xl font-bold mb-6">Ready to Transform Your Life?</h2>
                <p className="text-2xl mb-4 text-white/90">
                  Join thousands achieving their goals with AI-powered planning
                </p>
                <p className="text-lg mb-10 text-white/75">
                  No credit card • No commitment • Start in 30 seconds
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                  <Link
                    href="/life"
                    className="px-12 py-5 bg-white text-blue-600 rounded-xl hover:bg-blue-50 transition-all font-bold text-xl shadow-xl hover:shadow-2xl transform hover:scale-105"
                  >
                    Start Free Now →
                  </Link>
                  <button
                    onClick={() => openAuthModal('signin')}
                    className="px-12 py-5 bg-transparent text-white rounded-xl hover:bg-white/10 transition-all font-bold text-xl border-2 border-white"
                  >
                    Sign In
                  </button>
                </div>

                <div className="flex items-center justify-center gap-6 text-sm text-white/80">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <span>Free forever</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <span>No spam</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <span>Cancel anytime</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-20 pt-12 border-t border-gray-200 dark:border-gray-700">
            <div className="max-w-6xl mx-auto text-center text-gray-600 dark:text-gray-400">
              <p className="mb-4">Built with Claude AI • Made for humans who dream big</p>
              <p className="text-sm">© 2025 Plain. Your life, organized.</p>
            </div>
          </footer>
        </main>
      </div>
    );
  }

  // Show workspace list for authenticated users
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">🌿 Plain</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Your Workspaces {userEmail && `(${userEmail})`}
              </p>
            </div>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                setIsAuthenticated(false);
                setWorkspaces([]);
              }}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {workspaces.map(workspace => (
            <Link
              key={workspace.id}
              href={`/p/${workspace.id}`}
              className="flex items-center justify-between p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg transition-all mb-4"
            >
              <div className="flex items-center gap-4">
                <span className="text-4xl">{workspace.icon || '⭐'}</span>
                <div>
                  <h3 className="text-2xl font-semibold">{workspace.name}</h3>
                  {workspace.description && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                      {workspace.description}
                    </p>
                  )}
                </div>
              </div>
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}

          {/* Add Workspace Button */}
          {isCreating ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateWorkspace();
                    if (e.key === 'Escape') {
                      setIsCreating(false);
                      setNewWorkspaceName('');
                    }
                  }}
                  placeholder="Workspace name..."
                  autoFocus
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleCreateWorkspace}
                  disabled={!newWorkspaceName.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setNewWorkspaceName('');
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg transition-all"
            >
              <div className="flex items-center gap-4">
                <span className="text-4xl">➕</span>
                <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400">Add Workspace</h3>
              </div>
            </button>
          )}
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
