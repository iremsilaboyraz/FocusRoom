import React, { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import HomePage from './components/HomePage';
import FocusRoom from './components/FocusRoom';
import FocusHistory from './components/FocusHistory';
import Login from './components/Login';
import { supabase } from './supabaseClient';

// API Key configuration
const API_KEY = process.env.REACT_APP_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

function App() {
    const [page, setPage] = useState('home'); // 'home' | 'room' | 'history'
    const [selectedEnv, setSelectedEnv] = useState(null); // 'library' | 'cafe' | 'cozy' | 'nature'
    const [aiTheme, setAiTheme] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);

    // Global focus state customization
    const [userMood, setUserMood] = useState('distracted'); // 'full' | 'distracted' | 'tired'
    const [buddyType, setBuddyType] = useState('shiba'); // 'shiba' | 'panda' | 'kitty'
    const [buddyActive, setBuddyActive] = useState(true);

    // Authentication States
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    // Initial session loading & Auth listener
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setAuthLoading(false);
        }).catch(err => {
            console.error("Initial session error:", err);
            setAuthLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setUser(session?.user ?? null);
            setAuthLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Dynamic AI response handler
    const askGeminiMood = async (mood, currentEnvId = null) => {
        setAiLoading(true);
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            
            let prompt = '';
            if (!currentEnvId) {
                // User is on the homepage. Gemini needs to select the most appropriate environment.
                prompt = `
Kullanıcı şu anki ruh halini ve çalışma isteğini belirtti: "${mood}".
Bu ruh haline en uygun çalışma ortamını tasarla.
Dört ortam seçeneğin var: 
1. "library" (Kütüphane - sessiz, odaklanma)
2. "cafe" (Akustik Kafe - fincan sesleri, yaratıcı akış)
3. "cozy" (Cozy Room - lo-fi müzik, konforlu odaklanma)
4. "nature" (Doğa Gezintisi - orman sesleri, zihinsel tazelenme)

Aşağıdaki JSON formatında SADECE ham JSON döndür, açıklama veya markdown kod blokları ekleme.

{
  "recommendedEnvId": "Bu dört seçenekten en uygun olanının ID'si: 'library', 'cafe', 'cozy' veya 'nature'",
  "backgroundColor": "Seçilen ortama uygun, cıvıl cıvıl ve enerjik ama göz yormayan, açık pastel tonlarda bir HEX renk kodu (örn: kütüphane için krem/açık nane #f0fdf4, kafe için şeftali/sarı tonu #fffbeb, cozy için açık pembe/lavanta #fdf4ff, doğa için çok hafif gökyüzü mavisi #f0f9ff)",
  "textColor": "#1e293b",
  "accentColor": "Detaylar ve butonlar için neşeli ve enerjik bir pastel HEX renk kodu (örn: kütüphane için zümrüt nane #10b981, kafe için amber sarısı #fbbf24, cozy için rose pembe #f472b6, doğa için gök mavisi #38bdf8)",
  "ambientName": "Önerilen ortam için yaratıcı bir Türkçe isim (Örn: Güneşli Kütüphane Köşesi, Akustik Melodi Kafesi, Cozy Lo-fi Sığınağı, Esintili Doğa Gezintisi)",
  "aiMessage": "Kullanıcının ruh haline doğrudan hitap eden, Focus Buddy (AI çalışma arkadaşı) ağzından yazılmış, son derece sevimli, tatlı, motive edici ve Türkçe 1-2 cümlelik bir yapay zeka mesajı."
}
`;
            } else {
                // User is inside a specific room. Keep the env, but change visuals/motivation.
                const envNames = { library: 'Kütüphane', cafe: 'Kafe', cozy: 'Cozy Room', nature: 'Doğa' };
                prompt = `
Kullanıcı şu an "${envNames[currentEnvId]}" ortamında çalışıyor.
Kullanıcı şu anki ruh halini veya hislerini şöyle paylaştı: "${mood}".
Bu ortama bağlı kalarak renkleri optimize et ve motive edici bir asistan mesajı üret.
Aşağıdaki JSON formatında SADECE ham JSON döndür, açıklama veya markdown kod blokları ekleme.

{
  "backgroundColor": "Mevcut ortama uygun, cıvıl cıvıl ve enerjik ama göz yormayan, açık pastel tonlarda bir HEX renk kodu (örn: kütüphane için krem/açık nane #f0fdf4, kafe için şeftali/sarı tonu #fffbeb, cozy için açık pembe/lavanta #fdf4ff, doğa için çok hafif gökyüzü mavisi #f0f9ff)",
  "textColor": "#1e293b",
  "accentColor": "Detaylar ve butonlar için neşeli ve enerjik bir pastel HEX renk kodu (örn: kütüphane için zümrüt nane #10b981, kafe için amber sarısı #fbbf24, cozy için rose pembe #f472b6, doğa için gök mavisi #38bdf8)",
  "ambientName": "Mevcut ortamın ruh haline göre özelleştirilmiş ismi (Örn: Fırtınalı Kütüphane Odağı, Caz Saati Kafesi, Yağmurlu Şömine Köşesi, Sisli Sabah Ormanı)",
  "aiMessage": "Kullanıcının yazdığı ruh haline doğrudan hitap eden, Focus Buddy (AI çalışma arkadaşı) ağzından yazılmış, son derece sevimli, tatlı, motive edici ve Türkçe 1-2 cümlelik bir yapay zeka mesajı."
}
`;
            }

            const result = await model.generateContent(prompt);
            const responseText = result.response.text();
            
            // Clean markdown block responses if Gemini includes them
            const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsedData = JSON.parse(cleanJson);

            setAiTheme(parsedData);

            if (!currentEnvId && parsedData.recommendedEnvId) {
                setSelectedEnv(parsedData.recommendedEnvId);
                setPage('room');
            }
        } catch (error) {
            console.error("AI Hatası:", error);
            alert("Yapay zeka bağlanırken veya ortamı oluştururken bir hata oluştu. Lütfen tekrar dene.");
        } finally {
            setAiLoading(false);
        }
    };

    const handleSelectEnvironment = (envId, themeOverride = null) => {
        setSelectedEnv(envId);
        setAiTheme(themeOverride);
        setPage('room');
    };

    const handleBackToHome = () => {
        setPage('home');
        setSelectedEnv(null);
        setAiTheme(null);
    };

    const handleSignOut = async () => {
        setAuthLoading(true);
        try {
            await supabase.auth.signOut();
            setUser(null);
            handleBackToHome();
        } catch (error) {
            console.error("Çıkış hatası:", error);
        } finally {
            setAuthLoading(false);
        }
    };

    // Render loading state
    if (authLoading) {
        return (
            <div style={styles.loadingWrapper}>
                <div className="glass-panel" style={styles.loadingCard}>
                    <div className="loading-spinner"></div>
                    <span style={styles.loadingText}>FocusRoom Yükleniyor...</span>
                </div>
            </div>
        );
    }

    // Render Login Screen if not authenticated
    if (!user) {
        return (
            <div style={styles.app}>
                <div className="ambient-bg">
                    <div className="blob blob-1"></div>
                    <div className="blob blob-2"></div>
                    <div className="blob blob-3"></div>
                </div>
                <Login onLoginSuccess={(u) => setUser(u)} />
            </div>
        );
    }

    return (
        <div style={styles.app}>
            {/* Ambient Animated Glow Blobs */}
            <div className="ambient-bg">
                <div className="blob blob-1"></div>
                <div className="blob blob-2"></div>
                <div className="blob blob-3"></div>
            </div>

            {/* Conditionally render based on active route */}
            {page === 'home' && (
                <HomePage 
                    onSelectEnvironment={handleSelectEnvironment}
                    onAskGeminiMood={(mood) => askGeminiMood(mood, null)}
                    onViewHistory={() => setPage('history')}
                    aiLoading={aiLoading}
                    userMood={userMood}
                    setUserMood={setUserMood}
                    buddyType={buddyType}
                    setBuddyType={setBuddyType}
                    buddyActive={buddyActive}
                    setBuddyActive={setBuddyActive}
                    user={user}
                    onSignOut={handleSignOut}
                />
            )}
            {page === 'room' && (
                <FocusRoom 
                    envId={selectedEnv}
                    aiTheme={aiTheme}
                    onBack={handleBackToHome}
                    onAskGeminiMood={(mood) => askGeminiMood(mood, selectedEnv)}
                    aiLoading={aiLoading}
                    userMood={userMood}
                    setUserMood={setUserMood}
                    buddyType={buddyType}
                    setBuddyType={setBuddyType}
                    buddyActive={buddyActive}
                    setBuddyActive={setBuddyActive}
                    user={user}
                    onSignOut={handleSignOut}
                />
            )}
            {page === 'history' && (
                <FocusHistory 
                    user={user}
                    onBack={handleBackToHome}
                />
            )}
        </div>
    );
}

const styles = {
    app: {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        zIndex: 1
    },
    loadingWrapper: {
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 50% 50%, #fffbeb 0%, #fafaf9 100%)',
    },
    loadingCard: {
        padding: '30px 40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.5)',
    },
    loadingText: {
        fontSize: '14px',
        fontWeight: '700',
        color: '#8b5cf6',
        letterSpacing: '0.02em',
    }
};

export default App;