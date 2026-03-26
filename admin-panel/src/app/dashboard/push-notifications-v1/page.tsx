'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
    collection,
    query,
    where,
    getDocs,
    orderBy,
    limit,
} from 'firebase/firestore';

interface Article {
    id: string;
    title: string;
    publishedDate: string;
}

interface QuestionSet {
    id: string;
    title: string;
    year: number;
    createdAt: string;
}

interface Notification {
    id: string;
    title: string;
    body: string;
    type: string;
    isRead: boolean;
    createdAt: string;
    recipientCount?: number;
    status?: string;
}

export default function PushNotificationsV1Page() {
    const [activeTab, setActiveTab] = useState<'send' | 'history'>('send');
    const [contentType, setContentType] = useState<'article' | 'question_set'>('article');

    // Content lists
    const [articles, setArticles] = useState<Article[]>([]);
    const [questionSets, setQuestionSets] = useState<QuestionSet[]>([]);
    const [selectedContent, setSelectedContent] = useState<string>('');

    // State
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [sending, setSending] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // Get recent articles
            const articlesRef = collection(db, 'articles');
            const articlesQuery = query(
                articlesRef,
                where('isPublished', '==', true),
                orderBy('publishedDate', 'desc'),
                limit(20)
            );
            const articlesSnapshot = await getDocs(articlesQuery);
            const articlesData: Article[] = articlesSnapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title || '',
                    publishedDate: data.publishedDate?.toDate?.() ? data.publishedDate.toDate().toISOString() : data.publishedDate || '',
                };
            });
            setArticles(articlesData);

            // Get recent question sets
            const qsRef = collection(db, 'question_sets');
            const qsQuery = query(
                qsRef,
                where('isPublished', '==', true),
                orderBy('createdAt', 'desc'),
                limit(20)
            );
            const qsSnapshot = await getDocs(qsQuery);
            const qsData: QuestionSet[] = qsSnapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title || '',
                    year: data.year || 0,
                    createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : data.createdAt || '',
                };
            });
            setQuestionSets(qsData);

            // Get notification history
            const notificationsRef = collection(db, 'notifications');
            const notifQuery = query(
                notificationsRef,
                orderBy('createdAt', 'desc'),
                limit(50)
            );
            const notifSnapshot = await getDocs(notifQuery);
            const notifData: Notification[] = notifSnapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title || '',
                    body: data.body || '',
                    type: data.type || '',
                    isRead: data.isRead || false,
                    createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : data.createdAt || '',
                    recipientCount: data.recipientCount || 0,
                    status: data.status || '',
                };
            });
            setNotifications(notifData);
        } catch (error) {
            console.error('Error loading data:', error);
        }
    };

    const sendNotification = async () => {
        let title = '';
        let body = '';
        let contentId = '';
        let contentUrl = '';

        if (contentType === 'article' && selectedContent) {
            const article = articles.find(a => a.id === selectedContent);
            if (article) {
                title = 'New Article Posted!';
                body = article.title;
                contentId = article.id;
                contentUrl = `/ArticleDetail?articleId=${article.id}`;
            }
        } else if (contentType === 'question_set' && selectedContent) {
            const qs = questionSets.find(q => q.id === selectedContent);
            if (qs) {
                title = 'New Question Bank Available!';
                body = `${qs.title} (${qs.year})`;
                contentId = qs.id;
                contentUrl = `/question-bank/${qs.id}`;
            }
        }

        if (!title || !body) {
            setMessage({ type: 'error', text: 'Please select content to notify about' });
            return;
        }

        setSending(true);
        setMessage(null);

        try {
            // Send notification via Engagespot API
            const response = await fetch('/api/push/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    body,
                    contentType,
                    contentId,
                    contentUrl,
                }),
            });

            const result = await response.json();

            if (response.ok) {
                setMessage({ type: 'success', text: 'Push notification sent via Engagespot!' });
                setSelectedContent('');
                loadData();
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to send notification' });
            }
        } catch (error: any) {
            console.error('Send error:', error);
            setMessage({ type: 'error', text: error.message || 'Failed to send notification' });
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Push Notifications (V1)</h1>
                <p className="text-gray-500 mt-1">Send real-time notifications to users using the legacy interface</p>
            </div>

            {/* Info Card */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 mb-6 text-white">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                    </div>
                    <div>
                        <div className="text-lg font-bold mb-1">Legacy Push Interface</div>
                        <div className="text-blue-100 text-sm">
                            This is the original push notification tool. Use this for quick broadcasts without advanced metadata selection.
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('send')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === 'send'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    Send Notification
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === 'history'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    History ({notifications.length})
                </button>
            </div>

            {activeTab === 'send' && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    {/* Content Type Selector */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            Notification Type
                        </label>
                        <div className="flex gap-3 flex-wrap">
                            <button
                                onClick={() => {
                                    setContentType('article');
                                    setSelectedContent('');
                                }}
                                className={`px-5 py-3 rounded-lg border-2 transition font-medium ${contentType === 'article'
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                                    }`}
                            >
                                Article
                            </button>
                            <button
                                onClick={() => {
                                    setContentType('question_set');
                                    setSelectedContent('');
                                }}
                                className={`px-5 py-3 rounded-lg border-2 transition font-medium ${contentType === 'question_set'
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                                    }`}
                            >
                                Question Bank
                            </button>
                        </div>
                    </div>

                    {/* Content Selector */}
                    {contentType === 'article' && (
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Article
                            </label>
                            <select
                                value={selectedContent}
                                onChange={(e) => setSelectedContent(e.target.value)}
                                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">-- Select an article --</option>
                                {articles.map((article) => (
                                    <option key={article.id} value={article.id}>
                                        {article.title} ({new Date(article.publishedDate).toLocaleDateString()})
                                    </option>
                                ))}
                            </select>
                            {articles.length === 0 && (
                                <p className="mt-2 text-sm text-gray-500">No published articles found</p>
                            )}
                        </div>
                    )}

                    {contentType === 'question_set' && (
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Question Bank
                            </label>
                            <select
                                value={selectedContent}
                                onChange={(e) => setSelectedContent(e.target.value)}
                                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">-- Select a question bank --</option>
                                {questionSets.map((qs) => (
                                    <option key={qs.id} value={qs.id}>
                                        {qs.title} ({qs.year})
                                    </option>
                                ))}
                            </select>
                            {questionSets.length === 0 && (
                                <p className="mt-2 text-sm text-gray-500">No published question banks found</p>
                            )}
                        </div>
                    )}

                    {/* Message */}
                    {message && (
                        <div className={`p-4 rounded-lg mb-6 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                            }`}>
                            {message.text}
                        </div>
                    )}

                    {/* Send Button */}
                    <button
                        onClick={sendNotification}
                        disabled={sending || !selectedContent}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {sending ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Sending...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                                Send Notification
                            </>
                        )}
                    </button>
                </div>
            )}

            {activeTab === 'history' && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-left p-4 font-medium text-gray-600">Notification</th>
                                <th className="text-left p-4 font-medium text-gray-600">Type</th>
                                <th className="text-left p-4 font-medium text-gray-600">Recipients</th>
                                <th className="text-left p-4 font-medium text-gray-600">Status</th>
                                <th className="text-left p-4 font-medium text-gray-600">Sent At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {notifications.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                                                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <p>No notifications sent yet</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                notifications.map((notif) => (
                                    <tr key={notif.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                                        <td className="p-4">
                                            <div className="font-medium text-gray-900">{notif.title}</div>
                                            <div className="text-sm text-gray-500 truncate max-w-xs">{notif.body}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${notif.type === 'article'
                                                ? 'bg-blue-50 text-blue-700 border-blue-100'
                                                : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                                }`}>
                                                {notif.type === 'question_set' ? 'Question Bank' : 'Article'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-1.5 text-gray-700">
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                                </svg>
                                                <span className="font-medium">{notif.recipientCount || 0}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="flex items-center gap-1.5 text-green-700 text-sm font-medium bg-green-50 px-2.5 py-1 rounded-full border border-green-100 w-fit">
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                {notif.status || 'Sent'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-500 text-sm">
                                            {new Date(notif.createdAt).toLocaleString(undefined, {
                                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
