import React from 'react';
import { ChatWindow } from '../components/Chatbot/ChatWindow';

interface ChatbotPageProps {
  onNavigate?: (tab: string) => void;
}

export const ChatbotPage: React.FC<ChatbotPageProps> = ({ onNavigate }) => {
  return <ChatWindow onNavigate={onNavigate} />;
};
