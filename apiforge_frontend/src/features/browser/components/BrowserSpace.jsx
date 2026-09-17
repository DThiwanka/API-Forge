import { memo, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import useBrowser from '../hooks/useBrowser';
import BrowserTabs from './BrowserTabs';
import BrowserToolbar from './BrowserToolbar';
import BrowserViewport from './BrowserViewport';
import OpenInApiClientModal from './OpenInApiClientModal';

function BrowserSpaceComponent({ workspaceId }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [apiClientModal, setApiClientModal] = useState({
    isOpen: false,
    url: '',
    title: '',
  });
  const {
    tabs,
    activeTab,
    activeTabId,
    addressBarValue,
    setAddressBarValue,
    isLoading,
    error,
    clearError,
    switchTab,
    newTab,
    closeTab,
    navigate,
    back,
    forward,
    reload,
    closeSession,
  } = useBrowser(workspaceId);

  // Check searchParams for incoming URL from Request Workspace
  useEffect(() => {
    const openUrl = searchParams.get('openUrl');
    if (openUrl && openUrl.trim()) {
      const targetUrl = openUrl.trim();
      // Clear search param to prevent repeated navigation on re-render
      setSearchParams({}, { replace: true });

      // If active tab has no URL (e.g. blank new tab), navigate in current tab
      if (activeTab && !activeTab.url) {
        navigate(targetUrl);
      } else {
        newTab(targetUrl);
      }
    }
  }, [searchParams, setSearchParams, activeTab, navigate, newTab]);

  const handleOpenInApiClient = useCallback((targetTab = null) => {
    const tabToUse = targetTab || activeTab;
    if (!tabToUse?.url) return;

    setApiClientModal({
      isOpen: true,
      url: tabToUse.url,
      title: tabToUse.title || '',
    });
  }, [activeTab]);

  const handleCloseApiClientModal = useCallback(() => {
    setApiClientModal({
      isOpen: false,
      url: '',
      title: '',
    });
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-[#090a0f] overflow-hidden">
      {/* Tabs Strip */}
      <BrowserTabs
        tabs={tabs}
        activeTabId={activeTabId}
        onSwitchTab={switchTab}
        onNewTab={() => newTab()}
        onCloseTab={closeTab}
        onReload={reload}
        onOpenInApiClient={handleOpenInApiClient}
      />

      {/* Navigation Toolbar */}
      <BrowserToolbar
        activeTab={activeTab}
        addressBarValue={addressBarValue}
        onAddressBarChange={setAddressBarValue}
        onNavigate={navigate}
        onBack={back}
        onForward={forward}
        onReload={reload}
        onCloseSession={closeSession}
        onOpenInApiClient={() => handleOpenInApiClient()}
        isLoading={isLoading}
      />

      {/* Main Viewport */}
      <BrowserViewport
        tab={activeTab}
        isLoading={isLoading}
        error={error}
        onNavigate={navigate}
        onClearError={clearError}
        onOpenInApiClient={() => handleOpenInApiClient()}
      />

      {/* Open in API Client Modal */}
      <OpenInApiClientModal
        isOpen={apiClientModal.isOpen}
        onClose={handleCloseApiClientModal}
        workspaceId={workspaceId}
        url={apiClientModal.url}
        pageTitle={apiClientModal.title}
      />
    </div>
  );
}

export const BrowserSpace = memo(BrowserSpaceComponent);
export default BrowserSpace;

