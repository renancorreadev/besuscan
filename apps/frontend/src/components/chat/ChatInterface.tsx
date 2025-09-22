import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Bot, User, Loader2, Copy, Database, HelpCircle, X, Sparkles, Zap, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
  query_result?: QueryResult;
  metadata?: Record<string, any>;
}

interface QueryResult {
  original_query: string;
  generated_sql: string;
  explanation: string;
  results: Record<string, any>[];
  row_count: number;
  success: boolean;
  error?: string;
}

interface QuerySuggestion {
  category: string;
  title: string;
  description: string;
  query: string;
}

interface ChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatInterface({ isOpen, onClose }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Record<string, QuerySuggestion[]>>({});
  const [activeTab, setActiveTab] = useState('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end',
          inline: 'nearest'
        });
      }
    }, 200);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) {
      loadSuggestions();
      // Focus input when chat opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
      
      // Add welcome message
      if (messages.length === 0) {
        const welcomeMessage: ChatMessage = {
          id: 'welcome',
          type: 'assistant',
          content: '👋 **Olá! Sou seu assistente blockchain inteligente!**\n\n🚀 **Consultas Instantâneas:**\n• "últimas 5 transações"\n• "contratos mais ativos"\n• "total de transações"\n\n🤖 **Consultas Personalizadas:**\n• "Transações acima de 1000 ETH"\n• "Contratos criados esta semana"\n\n💡 **Dica:** Use a aba Sugestões para mais exemplos!',
          timestamp: new Date().toISOString(),
        };
        setMessages([welcomeMessage]);
      }
    }
  }, [isOpen]);

  const loadSuggestions = async () => {
    try {
      const response = await fetch('/api/llm-chat/chat/suggestions');
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.data || {});
      } else {
        console.warn('Failed to load suggestions, using empty state');
        setSuggestions({});
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
      setSuggestions({});
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/llm-chat/chat/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: input }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        // Ensure the response has the correct structure
        const assistantMessage: ChatMessage = {
          id: data.data.id || Date.now().toString(),
          type: 'assistant',
          content: data.data.content || 'Consulta processada com sucesso!',
          timestamp: data.data.timestamp || new Date().toISOString(),
          query_result: data.data.query_result,
          metadata: data.data.metadata,
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        const errorMessage: ChatMessage = {
          id: Date.now().toString(),
          type: 'assistant',
          content: `❌ **Erro:** ${data.error || data.message || 'Não foi possível processar sua consulta'}`,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        content: '❌ **Erro de conexão.** Verifique se o serviço está rodando.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: QuerySuggestion) => {
    setInput(suggestion.query);
    setActiveTab('chat');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="w-full h-full max-w-5xl max-h-screen flex flex-col bg-white dark:bg-gray-900 shadow-2xl rounded-none sm:rounded-2xl border-0 sm:border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header - Fixed Height */}
        <div className="flex-shrink-0 flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg flex-shrink-0">
              <Bot className="w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">Chat AI Blockchain</h2>
              <p className="text-xs text-gray-600 dark:text-gray-400 hidden sm:block">Assistente inteligente para consultas</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="h-8 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 flex-shrink-0"
          >
            <X className="w-4" />
          </Button>
        </div>

        {/* Content Area - Flexible */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            {/* Tabs Header - Fixed Height */}
            <div className="flex-shrink-0 p-3 sm:p-4 pb-0">
              <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-800 h-9">
                <TabsTrigger 
                  value="chat" 
                  className="flex items-center gap-2 text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
                >
                  <MessageSquare className="w-4" />
                  <span className="hidden sm:inline">Chat</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="suggestions" 
                  className="flex items-center gap-2 text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
                >
                  <HelpCircle className="w-4" />
                  <span className="hidden sm:inline">Sugestões</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Chat Tab Content */}
            <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 px-3 sm:px-4 pb-3 sm:pb-4">
              {/* Messages Area - Flexible with proper constraints */}
              <div className="flex-1 min-h-0 mb-3">
                <ScrollArea 
                  ref={scrollAreaRef} 
                  className="h-full w-full"
                >
                  <div className="space-y-3 sm:space-y-4 p-1">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex gap-2 sm:gap-3 animate-in slide-in-from-bottom-2 duration-300",
                          message.type === 'user' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <div
                          className={cn(
                            "flex gap-2 sm:gap-3 max-w-[90%] sm:max-w-[85%]",
                            message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                          )}
                        >
                          {/* Avatar */}
                          <div className={cn(
                            "w-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-md",
                            message.type === 'user' 
                              ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white' 
                              : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-gray-600 dark:text-gray-300'
                          )}>
                            {message.type === 'user' ? <User className="w-4" /> : <Bot className="w-4" />}
                          </div>

                          {/* Message Content */}
                          <div className={cn(
                            "rounded-2xl px-4 py-3 shadow-sm min-w-0 flex-1",
                            message.type === 'user'
                              ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                              : 'bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700'
                          )}>
                            {/* Message Text */}
                            <div className="whitespace-pre-wrap text-sm leading-relaxed break-words">
                              {message.content}
                            </div>
                            
                            {/* Query Results */}
                            {message.query_result && message.query_result.success && message.query_result.results && message.query_result.results.length > 0 && (
                              <div className="mt-4 space-y-2">
                                {/* Results Table */}
                                <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
                                  <table className="w-full text-sm">
                                    <thead className="bg-gray-100/50 dark:bg-gray-700/50">
                                      <tr>
                                        {Object.keys(message.query_result.results[0]).map((key) => (
                                          <th key={key} className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300 capitalize">
                                            {key.replace(/_/g, ' ')}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                      {message.query_result.results.map((result, idx) => (
                                        <tr key={idx} className="bg-white/50 dark:bg-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                                          {Object.values(result).map((value, valueIdx) => (
                                            <td key={valueIdx} className="px-4 py-2 text-gray-600 dark:text-gray-300">
                                              {value === null ? '-' : String(value)}
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>

                                {/* Pagination Info - Only show if more than 8 results */}
                                {message.query_result.results.length > 8 && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
                                    Mostrando 8 de {message.query_result.results.length} resultados
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Timestamp */}
                            <div className="text-xs opacity-60 mt-2 text-right">
                              {formatTimestamp(message.timestamp)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Loading indicator */}
                    {isLoading && (
                      <div className="flex gap-2 sm:gap-3 animate-in slide-in-from-bottom-2 duration-300">
                        <div className="w-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center shadow-md">
                          <Bot className="w-4 text-gray-600 dark:text-gray-300" />
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm border border-gray-200 dark:border-gray-700">
                          <Loader2 className="h-4 w-4 animate-spin text-blue-600 flex-shrink-0" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm">Processando sua consulta...</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              ⚡ Consultas rápidas ou 🤖 IA (~30s)
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Scroll anchor */}
                    <div ref={messagesEndRef} className="h-2" />
                  </div>
                </ScrollArea>
              </div>

              {/* Input Area - Fixed Height */}
              <div className="flex-shrink-0 flex gap-2 sm:gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Digite sua pergunta sobre a blockchain..."
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  className="flex-1 border-0 bg-transparent focus:ring-0 focus-visible:ring-0 text-sm min-w-0"
                />
                <Button
                  onClick={sendMessage}
                  disabled={isLoading || !input.trim()}
                  size="sm"
                  className="h-9 w-9 bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-md flex-shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </TabsContent>

            {/* Suggestions Tab Content */}
            <TabsContent value="suggestions" className="flex-1 min-h-0 px-3 sm:px-4 pb-3 sm:pb-4">
              <ScrollArea className="h-full">
                <div className="space-y-4 sm:space-y-6 pr-2 sm:pr-4">
                  {Object.entries(suggestions).map(([category, categorySuggestions]) => (
                    <div key={category}>
                      <h3 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3 text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-blue-600" />
                        {category}
                      </h3>
                      <div className="grid gap-2">
                        {categorySuggestions.map((suggestion, idx) => (
                          <Card
                            key={idx}
                            className="cursor-pointer hover:shadow-md transition-all duration-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
                            onClick={() => handleSuggestionClick(suggestion)}
                          >
                            <CardContent className="p-3">
                              <div className="font-medium text-sm text-gray-800 dark:text-gray-200 mb-1">{suggestion.title}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">{suggestion.description}</div>
                              <div className="text-xs text-blue-600 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-900/30 p-2 rounded border border-blue-200 dark:border-blue-700 break-all">
                                "{suggestion.query}"
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
} 