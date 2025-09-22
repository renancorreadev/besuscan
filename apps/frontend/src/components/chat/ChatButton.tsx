import React, { useState, useEffect } from 'react';
import { MessageSquare, Bot, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ChatInterface from './ChatInterface';

export default function ChatButton() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [hasNewFeature, setHasNewFeature] = useState(true);

  const handleChatToggle = () => {
    console.log('Chat button clicked!', { isChatOpen });
    setIsChatOpen(!isChatOpen);
    if (hasNewFeature) {
      setHasNewFeature(false);
      localStorage.setItem('chat-feature-seen', 'true');
    }
  };

  // Verificar se o usuário já viu a nova funcionalidade
  useEffect(() => {
    const hasSeenFeature = localStorage.getItem('chat-feature-seen');
    if (hasSeenFeature) {
      setHasNewFeature(false);
    }
  }, []);

  console.log('ChatButton render:', { isChatOpen, hasNewFeature });

  return (
    <>
      {/* Floating Chat Button - Simplified */}
      <div 
        className="fixed bottom-6 right-6 z-50"
        style={{ zIndex: 9999 }}
      >
        <div className="relative">
          {/* Notification dot */}
          {hasNewFeature && (
            <div className="absolute -top-1 -right-1 z-10">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            </div>
          )}
          
          {/* Main Button */}
          <Button
            onClick={handleChatToggle}
            size="lg"
            className="h-14 w-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            {isChatOpen ? (
              <Bot className="h-6 w-6" />
            ) : (
              <MessageSquare className="h-6 w-6" />
            )}
          </Button>
        </div>

        {/* "NEW" Label */}
        {hasNewFeature && (
          <div className="absolute -top-10 left-1/2 transform -translate-x-1/2">
            <Badge className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 animate-bounce">
              <Sparkles className="h-3 w-3 mr-1" />
              NOVO
            </Badge>
          </div>
        )}
      </div>

      {/* Chat Interface Modal */}
      <ChatInterface 
        isOpen={isChatOpen} 
        onClose={() => {
          console.log('Closing chat');
          setIsChatOpen(false);
        }} 
      />
    </>
  );
} 