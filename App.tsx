
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ContentCreator from './components/ContentCreator';
import CRM from './components/CRM';
import CampaignCalendar from './components/CampaignCalendar';
import TemplateLibrary from './components/TemplateLibrary';
import MarketingTools from './components/MarketingTools';
import LegacyFunnels from './components/LegacyFunnels';
import Connectors from './components/Connectors';
import AssetVault from './components/AssetVault';
import ChatBot from './components/ChatBot';
import { SocialPost, ContentIdea } from './types';
import { COLORS } from './constants';

const SettingsView = () => (
  <div className="max-w-3xl mx-auto space-y-8 animate-fadeIn">
    <header>
      <h1 className="text-3xl font-bold text-slate-900">Account Management</h1>
      <p className="text-slate-500">PA DOI License #1268820 | NIPR #21638507</p>
    </header>

    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-8 border-b border-slate-100">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Regional Data Control</h2>
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-rose-50 rounded-2xl border border-rose-100">
            <div>
              <h4 className="font-bold text-rose-900">Wipe Strategic Cache</h4>
              <p className="text-sm text-rose-700">Remove all current drafts and local session metadata.</p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="bg-white text-rose-600 border border-rose-200 px-6 py-2 rounded-xl font-bold hover:bg-rose-600 hover:text-white transition-all shadow-sm"
            >
              Reset Session
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [scheduledPosts, setScheduledPosts] = useState<SocialPost[]>([]);
  const [preFillTopic, setPreFillTopic] = useState<string | null>(null);
  const [generatedIdeasFromAsset, setGeneratedIdeasFromAsset] = useState<ContentIdea[]>([]);

  useEffect(() => {
    const handleTabChange = (e: any) => {
      setActiveTab(e.detail);
    };
    window.addEventListener('changeTab', handleTabChange);
    return () => window.removeEventListener('changeTab', handleTabChange);
  }, []);

  const handleAddScheduledPost = (post: SocialPost) => {
    setScheduledPosts(prev => [...prev, post]);
  };

  const handleAddBulkPosts = (posts: SocialPost[]) => {
    setScheduledPosts(prev => [...prev, ...posts]);
  };

  const handleRemoveScheduledPost = (postId: string) => {
    setScheduledPosts(prev => prev.filter(p => p.id !== postId));
  };

  const handleUseTemplate = (structure: string) => {
    setPreFillTopic(structure);
    setActiveTab('creator');
  };

  const handleIdeasFromAsset = (ideas: ContentIdea[]) => {
    // If ideas were generated from a carrier document, we could show them in a specific UI or navigate to creator
    // For now, let's navigate to Creator and potentially pre-fill (or we could add a new state for 'suggestions' in Creator)
    // Actually, let's just alert for now or navigate to creator.
    setActiveTab('creator');
    // We could pass these ideas to ContentCreator via state if we wanted to show them immediately.
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard scheduledPosts={scheduledPosts} />;
      case 'crm':
        return <CRM />;
      case 'library':
        return <TemplateLibrary onUseTemplate={handleUseTemplate} />;
      case 'vault':
        return <AssetVault onIdeasGenerated={handleIdeasFromAsset} />;
      case 'creator':
        return (
          <ContentCreator 
            onPostScheduled={handleAddScheduledPost} 
            preFillTopic={preFillTopic}
            onClearPreFill={() => setPreFillTopic(null)}
            scheduledPosts={scheduledPosts}
          />
        );
      case 'tools':
        return <MarketingTools onBulkSchedule={handleAddBulkPosts} />;
      case 'funnels':
        return <LegacyFunnels />;
      case 'calendar':
        return (
          <CampaignCalendar 
            posts={scheduledPosts} 
            onRemovePost={handleRemoveScheduledPost}
            onAddPost={handleAddScheduledPost}
          />
        );
      case 'connectors':
        return <Connectors />;
      case 'settings':
        return <SettingsView />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 ml-64 min-h-screen pb-24">
        <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex justify-between items-center z-10">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-full border-2 p-0.5" style={{ borderColor: COLORS.gold }}>
                <img src="https://picsum.photos/seed/latimore/100/100" className="w-full h-full rounded-full object-cover" alt="User" />
             </div>
             <div className="hidden sm:block">
                <p className="text-sm font-black text-slate-800 tracking-tight">Jackson M. Latimore Sr.</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Founder & CEO • Schuylkill Focus</p>
             </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex gap-4 text-slate-400">
               <a href="https://www.facebook.com/LatimoreLegacyLLC" target="_blank" className="hover:text-blue-600 transition-colors"><i className="fa-brands fa-facebook text-xl"></i></a>
               <a href="https://www.linkedin.com/in/startwithjacksongfi/" target="_blank" className="hover:text-blue-800 transition-colors"><i className="fa-brands fa-linkedin text-xl"></i></a>
            </div>
            <button 
              onClick={() => setActiveTab('settings')}
              className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200"
            >
              Account Management
            </button>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>

      <ChatBot />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
        .animate-slideUp { animation: slideUp 0.5s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default App;
