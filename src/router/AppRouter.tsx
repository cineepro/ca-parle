// src/router/AppRouter.tsx — Ça Parle
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { ModeratorRoute } from './ModeratorRoute';

import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import VerifyEmailPage from '@/pages/VerifyEmailPage';
import EmailConfirmedPage from '@/pages/EmailConfirmedPage';
import HomePage from '@/pages/HomePage';
import CreateStoryPage from '@/pages/CreateStoryPage';
import StoryDetailPage from '@/pages/StoryDetailPage';
import ProfilePage from '@/pages/ProfilePage';
import ReferencePage from '@/pages/ReferencePage';
import ModerationPage from '@/pages/ModerationPage';
import NotificationsPage from '@/pages/NotificationsPage';
import TrendingPage from '@/pages/TrendingPage';
import CaSertPage from '@/pages/CaSertPage';
import MessagesPage from '@/pages/MessagesPage';
import ConversationPage from '@/pages/ConversationPage';
import TermsPage from '@/pages/TermsPage';
import PrivacyPage from '@/pages/PrivacyPage';
import DocumentationPage from '@/pages/DocumentationPage';
import NotFoundPage from '@/pages/NotFoundPage';
import UnsubscribePage from '@/pages/UnsubscribePage';
import SearchPage from '@/pages/SearchPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import MyReferencesPage from '@/pages/MyReferencesPage';

export const AppRouter = () => {
    return (
        <BrowserRouter>
            <Routes>
                {/* Publiques */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route path="/email-confirmed" element={<EmailConfirmedPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/documentation" element={<DocumentationPage />} />
                <Route path="/unsubscribe" element={<UnsubscribePage />} />

                {/* Protégées */}
                <Route
                    path="/accueil"
                    element={
                        <ProtectedRoute>
                            <HomePage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/publier"
                    element={
                        <ProtectedRoute>
                            <CreateStoryPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/histoire/:id"
                    element={
                        <ProtectedRoute>
                            <StoryDetailPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/profil"
                    element={
                        <ProtectedRoute>
                            <ProfilePage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/reference/:slug"
                    element={
                        <ProtectedRoute>
                            <ReferencePage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/moderation"
                    element={
                        <ModeratorRoute>
                            <ModerationPage />
                        </ModeratorRoute>
                    }
                />
                <Route
                    path="/notifications"
                    element={
                        <ProtectedRoute>
                            <NotificationsPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/tendances"
                    element={
                        <ProtectedRoute>
                            <TrendingPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/ca-sert"
                    element={
                        <ProtectedRoute>
                            <CaSertPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/messages"
                    element={
                        <ProtectedRoute>
                            <MessagesPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/messages/:id"
                    element={
                        <ProtectedRoute>
                            <ConversationPage />
                        </ProtectedRoute>
                    }
                />

                {/* Défaut */}
                <Route path="/" element={<Navigate to="/accueil" replace />} />
                <Route
                    path="/recherche"
                    element={
                        <ProtectedRoute>
                            <SearchPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/mes-references"
                    element={
                        <ProtectedRoute>
                            <MyReferencesPage />
                        </ProtectedRoute>
                    }
                />
                <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </BrowserRouter>
    );
};