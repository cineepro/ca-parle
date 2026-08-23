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
import MessagesPage from '@/pages/MessagesPage';
import ConversationPage from '@/pages/ConversationPage';

export const AppRouter = () => {
    return (
        <BrowserRouter>
            <Routes>
                {/* Publiques */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route path="/email-confirmed" element={<EmailConfirmedPage />} />

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
                <Route path="*" element={<Navigate to="/accueil" replace />} />
            </Routes>
        </BrowserRouter>
    );
};