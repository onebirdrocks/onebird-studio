import React, { useRef, useEffect } from 'react';
import { useModelSelection } from '../hooks/useModelSelection';
import { useChatStore } from '../stores/chatStore';

export function ChatStream() {
  const {
    messages,
    isLoading,
    error,
    sendMessage
  } = useChatStore();

  const { selectedModel } = useModelSelection();
  const [inputValue, setInputValue] = React.useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading || !selectedModel) return;
    
    const message = inputValue.trim();
    setInputValue('');
    await sendMessage(message, selectedModel);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`mb-4 p-3 rounded ${
              message.role === 'user' ? 'bg-blue-100' : 'bg-gray-100'
            }`}
          >
            <div className="font-bold mb-1">
              {message.role === 'user' ? 'You' : 'Assistant'}
            </div>
            <div className="whitespace-pre-wrap">{message.content}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4">
        {error && <div className="text-red-500 mb-2">{error}</div>}
        <div className="flex gap-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 p-2 border rounded resize-none"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !inputValue.trim() || !selectedModel}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
} 