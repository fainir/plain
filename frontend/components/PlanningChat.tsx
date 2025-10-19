'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface PlanningChatProps {
  category: any;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function PlanningChat({ category }: PlanningChatProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [projectId, setProjectId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Create project when user starts planning
  const createProject = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${category.name} Plan`,
          category: category.id
        })
      });
      const data = await response.json();
      setProjectId(data.id);
      return data.id;
    } catch (err) {
      console.error('Error creating project:', err);
      return null;
    }
  };

  useEffect(() => {
    // Create project and connect to WebSocket
    const initializeChat = async () => {
      const newProjectId = await createProject();
      if (!newProjectId) return;

      const ws = new WebSocket(`ws://localhost:8000/ws/chat/${newProjectId}`);

      ws.onopen = () => {
        setIsConnected(true);
        // Send initial greeting
        const greeting = `Hi! I'm your AI planning consultant for ${category.name}. I'll help you create a personalized plan by asking you a few questions. Let's get started!\n\n${category.questions[0]}`;
        setMessages([{ role: 'assistant', content: greeting }]);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'message') {
          setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
          setIsLoading(false);

          // Check if planning is complete
          if (data.content.includes('plan is ready') || data.content.includes('next steps')) {
            // After a delay, redirect to project
            setTimeout(() => {
              router.push(`/planner/${newProjectId}`);
            }, 3000);
          } else if (currentQuestionIndex < category.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
          }
        } else if (data.type === 'error') {
          setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.content}` }]);
          setIsLoading(false);
        }
      };

      ws.onerror = () => {
        setIsConnected(false);
        setIsLoading(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsLoading(false);
      };

      wsRef.current = ws;
    };

    initializeChat();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [category, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || !isConnected || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);

    // Build context for the AI
    const contextMessage = `Category: ${category.name}\nUser's answer to "${category.questions[currentQuestionIndex]}": ${input}\n\nPlease provide guidance and ${currentQuestionIndex < category.questions.length - 1 ? `ask the next question: ${category.questions[currentQuestionIndex + 1]}` : 'summarize the plan and next steps. Let the user know their plan is ready and they will be redirected to their project dashboard.'}`;

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ message: contextMessage }));
      setIsLoading(true);
    }

    setInput('');
  };

  const suggestedAnswers = currentQuestionIndex < category.questions.length
    ? category.questions[currentQuestionIndex].includes('goals')
      ? ['Lose 20 pounds', 'Run a marathon', 'Improve overall fitness']
      : category.questions[currentQuestionIndex].includes('time')
      ? ['1-2 hours per day', '30 minutes per day', '3-4 hours per week']
      : []
    : [];

  return (
    <div id="start" className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
      {/* Connection Status */}
      <div className="bg-gray-100 dark:bg-gray-700 px-6 py-3 flex items-center justify-between">
        <h3 className="font-semibold">AI Planning Consultant</h3>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-xs text-gray-500">{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      {/* Messages */}
      <div className="h-96 overflow-y-auto p-6 space-y-4 bg-gray-50 dark:bg-gray-900">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-4 rounded-2xl ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-none shadow'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl rounded-bl-none shadow">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Answers */}
      {suggestedAnswers.length > 0 && (
        <div className="px-6 py-3 bg-gray-100 dark:bg-gray-700 flex flex-wrap gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400 w-full mb-1">Quick answers:</span>
          {suggestedAnswers.map((answer, idx) => (
            <button
              key={idx}
              onClick={() => setInput(answer)}
              className="text-sm px-3 py-1 bg-white dark:bg-gray-600 rounded-full hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
            >
              {answer}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-6 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your answer..."
            disabled={!isConnected || isLoading}
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!isConnected || isLoading || !input.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
