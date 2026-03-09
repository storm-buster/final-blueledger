import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import AppLayout from './components/Layout/AppLayout';
import { Skeleton } from './components/ui-bits';
import { AuthProvider } from './contexts/AuthContext';
import { SupabaseService } from './lib/supabaseService';
import {
  mockAccounts,
  mockACVAs,
  mockValidations,
  mockVerifications
} from './data/mockData';
import { Verification, Project, Account, ACVA, Validation } from './types';

// Lazy load pages for better performance
const HomePage = lazy(() => import('./components/Pages/HomePage'));
const AuthPage = lazy(() => import('./components/Pages/AuthPage'));
const ProjectsPage = lazy(() => import('./components/Pages/ProjectsPage'));
const ProjectDetailsPage = lazy(() => import('./components/Pages/ProjectDetailsPage'));
const KYCPage = lazy(() => import('./components/Pages/KYCPage'));
const ACVAPage = lazy(() => import('./components/Pages/ACVAPage'));
const ValidationPage = lazy(() => import('./components/Pages/ValidationPage'));
const VerificationPage = lazy(() => import('./components/Pages/VerificationPage'));
const ApprovedVerificationsPage = lazy(() => import('./components/Pages/ApprovedVerificationsPage'));
const XAIPage = lazy(() => import('./components/Pages/XAIPage'));
const MapPage = lazy(() => import('./components/Pages/MapPage'));
const SettingsPage = lazy(() => import('./components/Pages/SettingsPage'));
const SatellitesPage = lazy(() => import('./components/Pages/SatellitesPage'));

// Loading fallback component
const PageLoader = () => (
  <div className="p-6 space-y-4">
    <Skeleton className="h-8 w-64" />
    <Skeleton className="h-4 w-96" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
    </div>
  </div>
);

function AppWrapper() { 
  return (
    <AuthProvider>
      <Router>
        <App />
      </Router>
    </AuthProvider>
  );
}

function App() {
  const location = useLocation();
  const [activeSection, setActiveSection] = useState('projects');

  // Add state to hold selected project for details page
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  // Add state for real-time data from Supabase
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<any>({ totalProjects: 0, totalCarbonRemoved: 0, totalCreditsIssued: 0, totalBufferCredits: 0 });
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [acvas, setACVAs] = useState<ACVA[]>([]);
  const [validations, setValidations] = useState<Validation[]>([]);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Load real-time data from Supabase
  useEffect(() => {
    const loadAllData = async () => {
      try {
        const [supabaseProjects, supabaseStats] = await Promise.all([
          SupabaseService.getProjects(),
          SupabaseService.getDashboardStats()
        ]);
        
        if (supabaseProjects.length > 0) {
          setProjects(supabaseProjects);
          setStats(supabaseStats);
        } else {
          // Fallback to mock data if no real data
          const { mockProjects, mockStats } = await import('./data/mockData');
          setProjects(mockProjects);
          setStats(mockStats);
        }

        // Load other data types
        const [userAccounts, userNotifications] = await Promise.all([
          SupabaseService.getUserAccounts(),
          SupabaseService.getNotifications()
        ]);
        
        setAccounts(userAccounts.map(user => ({
          id: user.id,
          companyName: user.name,
          projects: [], // Will be populated based on actual project assignments
          kycDocument: user.additional_data?.kycDocument || '',
          accountType: (user.role as 'Project Proponent' | 'Trader') || 'Project Proponent',
          email: user.email,
          registrationDate: user.member_since || '',
          kycStatus: 'Done'
        })) as Account[]);

        setNotifications(userNotifications);
        setACVAs(mockACVAs); // Keep mock for now
        setValidations(mockValidations); // Keep mock for now

      } catch (error) {
        console.error('Error loading data from Supabase:', error);
        // Fallback to mock data on error
        import('./data/mockData').then(({ mockProjects, mockStats, mockAccounts, mockACVAs, mockValidations, mockVerifications }) => {
          setProjects(mockProjects);
          setStats(mockStats);
          setAccounts(mockAccounts);
          setACVAs(mockACVAs);
          setValidations(mockValidations);
          setVerifications(mockVerifications);
        });
      }
    };

    loadAllData();

    // Subscribe to real-time updates
    const projectsSubscription = SupabaseService.subscribeToProjects((updatedProjects) => {
      setProjects(updatedProjects);
    });

    const evidenceSubscription = SupabaseService.subscribeToEvidence((updatedEvidence) => {
      // Update notifications when new evidence is added
      setNotifications(prev => [
        {
          id: Date.now().toString(),
          type: 'evidence',
          message: 'New evidence uploaded',
          count: updatedEvidence.length,
          timestamp: new Date().toISOString()
        },
        ...prev
      ]);
    });

    const usersSubscription = SupabaseService.subscribeToUsers((updatedUsers) => {
      setAccounts(updatedUsers.map(user => ({
        id: user.id,
        companyName: user.name,
        projects: [],
        kycDocument: user.additional_data?.kycDocument || '',
        accountType: user.role || 'Project Proponent',
        email: user.email,
        registrationDate: user.member_since || '',
        kycStatus: 'Done'
      })));
    });

    return () => {
      projectsSubscription?.unsubscribe();
      evidenceSubscription?.unsubscribe();
      usersSubscription?.unsubscribe();
    };
  }, []);

  // Sync activeSection with current path
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/projects')) {
      setActiveSection('projects');
    } else if (path.startsWith('/satellites')) {
      setActiveSection('satellites');
    } else if (path.startsWith('/map')) {
      setActiveSection('map');
    } else if (path.startsWith('/kyc')) {
      setActiveSection('kyc');
    } else if (path.startsWith('/acva')) {
      setActiveSection('acva');
    } else if (path.startsWith('/validation')) {
      setActiveSection('validation');
    } else if (path.startsWith('/verification')) {
      setActiveSection('verification');
    } else if (path.startsWith('/xai')) {
      setActiveSection('xai');
    } else if (path.startsWith('/settings')) {
      setActiveSection('settings');
    } else if (path === '/' || path === '/home') {
      setActiveSection('home');
    }
  }, [location]);

  const [view, setView] = useState<'verification' | 'approved'>('verification');

  // Handler to select project and navigate to details page
  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setActiveSection('projectDetails');
  };

  // Handler to go back to projects list
  const handleBackToProjects = () => {
    setSelectedProject(null);
    setActiveSection('projects');
  };

  const handleUpdateVerification = (updatedVerifications: Verification[]) => {
    setVerifications(updatedVerifications);
  };

  const handleReview = () => {
    setView('verification');
  };

  return (
    <AppLayout activeSection={activeSection} onSectionChange={setActiveSection}>
      <div className="w-full px-4 sm:px-6 lg:px-8 space-y-12">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<AuthPage mode="login" />} />
                <Route path="/signup" element={<AuthPage mode="signup" />} />
                <Route path="/" element={<HomePage stats={stats} onNavigateToProjects={() => setActiveSection('projects')} />} />
                <Route path="/projects" element={<ProjectsPage projects={projects} onSelectProject={handleSelectProject} />} />
                <Route path="/projects/:projectId" element={<ProjectDetailsPage project={selectedProject!} onBack={handleBackToProjects} />} />
                <Route path="/kyc" element={<KYCPage accounts={accounts} />} />
                <Route path="/acva" element={<ACVAPage acvas={acvas} />} />
                <Route path="/validation" element={<ValidationPage validations={validations} />} />
                <Route path="/verification" element={
                  view === 'verification' ? (
                    <VerificationPage verifications={verifications} onUpdateVerification={handleUpdateVerification} />
                  ) : (
                    <ApprovedVerificationsPage verifications={verifications} onReview={handleReview} />
                  )
                } />
                <Route path="/xai" element={<XAIPage />} />
                <Route path="/map" element={<MapPage />} />
                <Route path="/satellites" element={<SatellitesPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </Suspense>
            {activeSection === 'verification' && (
              <div className="mt-4 flex space-x-4 readable-surface p-4">
                <button
                  onClick={() => setView('verification')}
                  className={`px-4 py-2 rounded ${view === 'verification' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                >
                  Verification Management
                </button>
                <button
                  onClick={() => setView('approved')}
                  className={`px-4 py-2 rounded ${view === 'approved' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                >
                  Approved Verifications
                </button>
              </div>
            )}
        </div>
    </AppLayout>
  );
}

export default AppWrapper;