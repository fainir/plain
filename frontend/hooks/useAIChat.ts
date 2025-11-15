import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface GuestPlan {
  plannerType: string;
  messages: Message[];
  timestamp: number;
  workspaceData?: any;
}

const GUEST_PLAN_KEY = 'plain_guest_plan';

export function useAIChat(plannerType: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [guestWorkspaceId, setGuestWorkspaceId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const syncAuthState = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session?.user);
    };

    syncAuthState();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load existing guest plan from localStorage if available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPlan = localStorage.getItem(GUEST_PLAN_KEY);
      if (savedPlan) {
        try {
          const plan: GuestPlan = JSON.parse(savedPlan);
          if (plan.plannerType === plannerType) {
            setMessages(plan.messages);
          }
        } catch (e) {
          console.error('Failed to load saved plan:', e);
        }
      }
    }
  }, [plannerType]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      const plan: GuestPlan = {
        plannerType,
        messages,
        timestamp: Date.now()
      };
      localStorage.setItem(GUEST_PLAN_KEY, JSON.stringify(plan));
    }
  }, [messages, plannerType]);

  useEffect(() => {
    // Create a temporary project ID for guest users
    const tempProjectId = 'guest-' + Math.random().toString(36).substring(7);

    // Connect to WebSocket
    const ws = new WebSocket(`ws://localhost:8000/ws/chat/${tempProjectId}`);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'message') {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.content
        }]);
        setIsLoading(false);
      } else if (data.type === 'workspace_created') {
        // AI generated a workspace - store the guest workspace ID
        console.log('Guest workspace created:', data.workspaceId);
        setGuestWorkspaceId(data.workspaceId);
        if (typeof window !== 'undefined') {
          localStorage.setItem('guest_workspace_id', data.workspaceId);
        }

        // Save to localStorage
        const plan: GuestPlan = {
          plannerType,
          messages,
          timestamp: Date.now(),
          workspaceData: { workspaceId: data.workspaceId, workspaceName: data.workspaceName }
        };
        localStorage.setItem(GUEST_PLAN_KEY, JSON.stringify(plan));
      } else if (data.type === 'error') {
        console.error('Chat error:', data.content);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.'
        }]);
        setIsLoading(false);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
      setIsLoading(false);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    wsRef.current = ws;

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const sendMessage = (content: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return;
    }

    // Add user message to state
    setMessages(prev => [...prev, { role: 'user', content }]);
    setIsLoading(true);

    // Send message through WebSocket
    wsRef.current.send(JSON.stringify({
      message: content,
      plannerType
    }));
  };

  const clearGuestPlan = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(GUEST_PLAN_KEY);
    }
  };

  return {
    messages,
    isLoading,
    isConnected,
    guestWorkspaceId,
    sendMessage,
    clearGuestPlan,
    isAuthenticated
  };
}

// Export utility to get guest plan from localStorage
export function getGuestPlan(): GuestPlan | null {
  if (typeof window === 'undefined') return null;

  const savedPlan = localStorage.getItem(GUEST_PLAN_KEY);
  if (!savedPlan) return null;

  try {
    return JSON.parse(savedPlan);
  } catch (e) {
    console.error('Failed to parse guest plan:', e);
    return null;
  }
}
