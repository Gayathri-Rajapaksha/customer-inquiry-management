import { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import LoginPage from './components/LoginPage';
import InquiryDashboard from './components/InquiryDashboard';
import CreateInquiryModal from './components/CreateInquiryModal';
import InquiryDetailModal from './components/InquiryDetailModal';
import {
  parseInquiryIdFromUrl,
  resolveDeepLinkInquiry,
  updateInquiryUrlParam,
} from './utils/deepLink';

function MainApp() {
  const { user, loading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'diagnostics'
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [toastMessage, setToastMessage] = useState(null);
  const processedDeepLinkIdRef = useRef(null);

  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Callback when a new inquiry is successfully created
  const handleInquiryCreated = (newInquiry) => {
    setRefreshTrigger((prev) => prev + 1);
    showToast(`Inquiry #${newInquiry.id} created successfully for ${newInquiry.customer_name}.`);
  };

  // Callback when an inquiry status is updated
  const handleStatusUpdated = (updatedInquiry) => {
    setRefreshTrigger((prev) => prev + 1);
    showToast(`Inquiry #${updatedInquiry.id} status updated to ${updatedInquiry.status}.`);
  };

  // Select an inquiry and synchronize the URL parameter
  const handleSelectInquiry = (inquiry) => {
    setSelectedInquiry(inquiry);
    updateInquiryUrlParam(inquiry?.id);
  };

  // Close the inquiry detail modal and clear the URL parameter
  const handleCloseModal = () => {
    setSelectedInquiry(null);
    updateInquiryUrlParam(null);
    processedDeepLinkIdRef.current = null;
  };

  // Handle direct inquiry URLs (?inquiry=<id>) once authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    const controller = new AbortController();

    const checkDeepLink = () => {
      const parsed = parseInquiryIdFromUrl(window.location.search);
      if (!parsed) return;

      // Prevent duplicate fetches for the same ID
      if (processedDeepLinkIdRef.current === parsed.rawId) return;
      processedDeepLinkIdRef.current = parsed.rawId;

      resolveDeepLinkInquiry({
        searchOrUrl: window.location.search,
        isAuthenticated,
        fetchInquiryFn: async (id, signal) => {
          const res = await fetch(`/api/inquiries/${id}`, {
            headers: { 'Accept': 'application/json' },
            signal,
          });
          const data = await res.json();
          return { status: res.status, ok: res.ok, data };
        },
        onOpenInquiry: (inquiry) => {
          setSelectedInquiry(inquiry);
          setActiveTab('dashboard');
        },
        onError: (msg) => {
          showToast(msg, 'error');
        },
        onClearUrl: () => {
          updateInquiryUrlParam(null);
        },
        signal: controller.signal,
      });
    };

    checkDeepLink();

    // Support browser Back/Forward navigation
    const handlePopState = () => {
      const parsed = parseInquiryIdFromUrl(window.location.search);
      if (!parsed || !parsed.isValid) {
        setSelectedInquiry(null);
        processedDeepLinkIdRef.current = null;
      } else {
        processedDeepLinkIdRef.current = null;
        checkDeepLink();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      controller.abort();
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isAuthenticated]);

  // Full-screen loading while checking session
  if (loading) {
    return (
      <div className="app-loader-screen">
        <div className="app-loader-card">
          <div className="loader-coffee-logo">☕</div>
          <h2>Coffee Ninja Management</h2>
          <p>Verifying secure staff session...</p>
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  // If not authenticated, display the login page
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="app-layout">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className={`toast-notification toast-${toastMessage.type}`} role="status">
          <span className="toast-icon">
            {toastMessage.type === 'success' ? '✓' : toastMessage.type === 'error' ? '⚠️' : 'ℹ️'}
          </span>
          <span className="toast-text">{toastMessage.message}</span>
          <button
            type="button"
            className="toast-close"
            onClick={() => setToastMessage(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="main-viewport">
        <InquiryDashboard
          onSelectInquiry={handleSelectInquiry}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          refreshTrigger={refreshTrigger}
        />
      </main>

      {/* Create Inquiry Modal */}
      <CreateInquiryModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleInquiryCreated}
      />

      {/* Inquiry Detail & Status Update Modal */}
      <InquiryDetailModal
        inquiry={selectedInquiry}
        isOpen={!!selectedInquiry}
        onClose={handleCloseModal}
        onStatusUpdated={handleStatusUpdated}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
