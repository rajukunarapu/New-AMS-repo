import React, { useState } from 'react';
import { Layout } from './components/Layout/Layout';
import { DashboardPage } from './pages/Dashboard';
import { ChatbotPage } from './pages/Chatbot';
import { CustomGraphPage } from './components/Graph/CustomGraphPage';
import { UploadPage } from './pages/Upload';
import { AnalyticsPage } from './pages/Analytics';
import { NotFoundPage } from './pages/NotFound';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage onNavigate={setActiveTab} />;
      case 'graph':
        return <CustomGraphPage />;
      case 'chat':
        return <ChatbotPage onNavigate={setActiveTab} />;
      case 'upload':
        return <UploadPage onUploadSuccess={() => setActiveTab('dashboard')} />;
      case 'Data_Explorer':
      case 'analytics':
        return <AnalyticsPage />;
      default:
        return <NotFoundPage />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

export default App;
