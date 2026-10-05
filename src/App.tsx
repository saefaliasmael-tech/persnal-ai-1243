import React, { useEffect, useState } from 'react';
import { WindowsTitlebar } from './components/titlebar/WindowsTitlebar.tsx';
import { Sidebar } from './components/navigation/Sidebar.tsx';
import { WindowManager } from './components/windows/WindowManager.tsx';
import { PermissionDialog } from './components/dialogs/PermissionDialog.tsx';
import { NewProjectModal } from './components/dialogs/NewProjectModal.tsx';
import { ConnectAIModal } from './components/dialogs/ConnectAIModal.tsx';
import { AddKnowledgeModal } from './components/dialogs/AddKnowledgeModal.tsx';

import { HomeView } from './components/views/HomeView.tsx';
import { ChatView } from './components/views/ChatView.tsx';
import { AgentView } from './components/views/AgentView.tsx';
import { ProjectsView } from './components/views/ProjectsView.tsx';
import { KnowledgeView } from './components/views/KnowledgeView.tsx';
import { TrainingView } from './components/views/TrainingView.tsx';
import { TestingView } from './components/views/TestingView.tsx';
import { BrowserView } from './components/views/BrowserView.tsx';
import { TerminalView } from './components/views/TerminalView.tsx';
import { ActivityView } from './components/views/ActivityView.tsx';
import { SettingsView } from './components/views/SettingsView.tsx';

import { permissionService } from './services/permissionService.ts';
import { aiService } from './services/aiService.ts';
import { agentService } from './services/agentService.ts';
import type { NavSection, PermissionRequest, ServiceConnectionStatus } from './types/models.ts';

export default function App() {
  const [currentSection, setCurrentSection] = useState<NavSection>('chat');
  const [aiStatus, setAiStatus] = useState<ServiceConnectionStatus>(aiService.getStatus());
  const [agentStatus, setAgentStatus] = useState<ServiceConnectionStatus>(agentService.getStatus());
  const [permissionRequests, setPermissionRequests] = useState<PermissionRequest[]>(permissionService.getActiveRequests());

  // Child popup window states
  const [terminalPopupOpen, setTerminalPopupOpen] = useState(false);
  const [browserPopupOpen, setBrowserPopupOpen] = useState(false);

  // Modals
  const [newProjectModalOpen, setNewProjectModalOpen] = useState(false);
  const [connectAIModalOpen, setConnectAIModalOpen] = useState(false);
  const [addKnowledgeModalOpen, setAddKnowledgeModalOpen] = useState(false);

  useEffect(() => {
    const unsubPerms = permissionService.subscribe((_, requests) => {
      setPermissionRequests(requests);
    });
    const unsubAi = aiService.subscribe((status) => {
      setAiStatus(status);
    });

    // Listen for custom bridge events when Agent opens popups
    const handleOpenPopupEvent = (e: any) => {
      if (e.detail?.type === 'terminal') {
        setTerminalPopupOpen(true);
      } else if (e.detail?.type === 'browser') {
        setBrowserPopupOpen(true);
      }
    };

    const handleClosePopupEvent = (e: any) => {
      if (e.detail?.type === 'terminal') {
        setTerminalPopupOpen(false);
      } else if (e.detail?.type === 'browser') {
        setBrowserPopupOpen(false);
      }
    };

    window.addEventListener('personalai:open-popup', handleOpenPopupEvent);
    window.addEventListener('personalai:close-popup', handleClosePopupEvent);

    return () => {
      unsubPerms();
      unsubAi();
      window.removeEventListener('personalai:open-popup', handleOpenPopupEvent);
      window.removeEventListener('personalai:close-popup', handleClosePopupEvent);
    };
  }, []);

  const handleRespondPermission = (requestId: string, allowed: boolean) => {
    permissionService.respondToRequest(requestId, allowed);
  };

  const renderCurrentView = () => {
    switch (currentSection) {
      case 'home':
        return (
          <HomeView
            onNavigate={(sec) => setCurrentSection(sec)}
            onOpenConnectAI={() => setConnectAIModalOpen(true)}
            onOpenTerminalPopup={() => setTerminalPopupOpen(true)}
            onOpenBrowserPopup={() => setBrowserPopupOpen(true)}
          />
        );
      case 'chat':
        return (
          <ChatView
            onOpenConnectAI={() => setConnectAIModalOpen(true)}
            onOpenTerminalPopup={() => setTerminalPopupOpen(true)}
            onOpenBrowserPopup={() => setBrowserPopupOpen(true)}
          />
        );
      case 'agent':
        return (
          <AgentView
            onOpenTerminalPopup={() => setTerminalPopupOpen(true)}
            onOpenBrowserPopup={() => setBrowserPopupOpen(true)}
          />
        );
      case 'projects':
        return <ProjectsView onOpenNewProjectModal={() => setNewProjectModalOpen(true)} />;
      case 'knowledge':
        return <KnowledgeView onOpenAddKnowledge={() => setAddKnowledgeModalOpen(true)} />;
      case 'training':
        return <TrainingView />;
      case 'testing':
        return <TestingView />;
      case 'browser':
        return <BrowserView onOpenPopup={() => setBrowserPopupOpen(true)} />;
      case 'terminal':
        return <TerminalView onOpenPopup={() => setTerminalPopupOpen(true)} />;
      case 'activity':
        return <ActivityView />;
      case 'settings':
        return <SettingsView />;
      default:
        return (
          <HomeView
            onNavigate={(sec) => setCurrentSection(sec)}
            onOpenConnectAI={() => setConnectAIModalOpen(true)}
            onOpenTerminalPopup={() => setTerminalPopupOpen(true)}
            onOpenBrowserPopup={() => setBrowserPopupOpen(true)}
          />
        );
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-neutral-950 text-neutral-100 font-sans overflow-hidden">
      {/* Top Windows 10 Titlebar */}
      <WindowsTitlebar
        onOpenTerminalPopup={() => setTerminalPopupOpen(!terminalPopupOpen)}
        onOpenBrowserPopup={() => setBrowserPopupOpen(!browserPopupOpen)}
        terminalPopupOpen={terminalPopupOpen}
        browserPopupOpen={browserPopupOpen}
      />

      {/* Main App Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar Navigation */}
        <Sidebar
          currentSection={currentSection}
          onSelectSection={(sec) => setCurrentSection(sec)}
          aiStatus={aiStatus}
          agentStatus={agentStatus}
          onOpenConnectAI={() => setConnectAIModalOpen(true)}
        />

        {/* Viewport Content */}
        <main className="flex-1 overflow-hidden relative bg-neutral-950">
          {renderCurrentView()}
        </main>
      </div>

      {/* Dedicated Child Windows Layer (Terminal & Browser) */}
      <WindowManager
        terminalOpen={terminalPopupOpen}
        browserOpen={browserPopupOpen}
        onCloseTerminal={() => setTerminalPopupOpen(false)}
        onCloseBrowser={() => setBrowserPopupOpen(false)}
      />

      {/* Security Permission Request Dialog */}
      <PermissionDialog
        requests={permissionRequests}
        onRespond={handleRespondPermission}
      />

      {/* Modals */}
      <NewProjectModal
        isOpen={newProjectModalOpen}
        onClose={() => setNewProjectModalOpen(false)}
      />
      <ConnectAIModal
        isOpen={connectAIModalOpen}
        onClose={() => setConnectAIModalOpen(false)}
      />
      <AddKnowledgeModal
        isOpen={addKnowledgeModalOpen}
        onClose={() => setAddKnowledgeModalOpen(false)}
      />
    </div>
  );
}
