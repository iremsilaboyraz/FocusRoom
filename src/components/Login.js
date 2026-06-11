import React, { useState } from 'react';
import { Mail, Lock, Sparkles, AlertCircle, Compass, CheckCircle2 } from 'lucide-react';
import { supabase, isDemoMode } from '../supabaseClient';

function Login({ onLoginSuccess }) {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [shake, setShake] = useState(false);
    const [successMessage, setSuccessMessage] = useState(null);

    const triggerErrorShake = (errMsg) => {
        setError(errMsg);
        setShake(true);
        setTimeout(() => setShake(false), 500);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);

        // Validation
        if (!email.trim() || !password) {
            triggerErrorShake('Lütfen tüm alanları doldurun.');
            return;
        }

        if (isSignUp && password !== confirmPassword) {
            triggerErrorShake('Şifreler uyuşmuyor.');
            return;
        }

        if (password.length < 6) {
            triggerErrorShake('Şifre en az 6 karakter olmalıdır.');
            return;
        }

        setLoading(true);

        try {
            if (isSignUp) {
                const { data, error: signUpErr } = await supabase.auth.signUp({
                    email: email.trim(),
                    password: password
                });

                if (signUpErr) throw signUpErr;
                
                if (isDemoMode) {
                    setSuccessMessage('Demo hesabınız başarıyla oluşturuldu! Giriş yapılıyor...');
                    setTimeout(() => {
                        onLoginSuccess(data.user);
                    }, 1500);
                } else {
                    setSuccessMessage('Kayıt başarılı! Lütfen e-postanıza gönderilen onay linkine tıklayın veya doğrudan giriş yapmayı deneyin.');
                    setIsSignUp(false);
                    setPassword('');
                    setConfirmPassword('');
                }
            } else {
                const { data, error: signInErr } = await supabase.auth.signInWithPassword({
                    email: email.trim(),
                    password: password
                });

                if (signInErr) throw signInErr;
                onLoginSuccess(data.session?.user);
            }
        } catch (err) {
            console.error("Kimlik doğrulama hatası:", err);
            triggerErrorShake(err.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
        } finally {
            setLoading(false);
        }
    };

    const handleDemoLogin = async () => {
        setError(null);
        setLoading(true);
        try {
            // Using a constant demo user
            const mockEmail = 'demo@focusroom.com';
            const mockPassword = 'demopassword';
            
            // In demo mode, sign up if not exists, then sign in
            if (isDemoMode) {
                // Try signing in first
                let { data, error: demoSignInErr } = await supabase.auth.signInWithPassword({
                    email: mockEmail,
                    password: mockPassword
                });

                if (demoSignInErr) {
                    // Sign up
                    const { data: signUpData, error: demoSignUpErr } = await supabase.auth.signUp({
                        email: mockEmail,
                        password: mockPassword
                    });
                    if (demoSignUpErr) throw demoSignUpErr;
                    onLoginSuccess(signUpData.user);
                } else {
                    onLoginSuccess(data.session?.user);
                }
            } else {
                // If it is in real Supabase mode, still allow entering as a local demo user by bypassing real auth (for testing simplicity)
                console.log("Real mode detected, but bypassing for quick demo use.");
                const randomId = 'demo-bypass-' + Math.random().toString(36).substr(2, 9);
                const randomEmail = `demo-${Math.floor(1000 + Math.random() * 9000)}@focusroom.com`;
                onLoginSuccess({ id: randomId, email: randomEmail, isDemoUser: true });
            }
        } catch (err) {
            console.error("Demo giriş hatası:", err);
            triggerErrorShake('Demo girişi başlatılamadı: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container" style={styles.container}>
            {/* Login Glass Panel */}
            <div 
                className={`glass-panel login-card ${shake ? 'shake-anim' : ''}`} 
                style={{
                    ...styles.loginCard,
                    animation: shake ? 'shake 0.5s ease-in-out' : 'login-fade-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'
                }}
            >
                {/* Brand Header */}
                <div style={styles.header}>
                    <div style={styles.logoCircle}>
                        <Compass size={32} style={{ color: '#8b5cf6', animation: 'char-idle 4s ease-in-out infinite' }} />
                    </div>
                    <h1 style={styles.title}>
                        FocusRoom <span style={styles.titleAccent}>Portal</span>
                    </h1>
                    <p style={styles.subtitle}>
                        Zihnini düzenle, hedeflerine odaklan ve yapay zeka ile çalış.
                    </p>
                </div>

                {/* Tabs */}
                <div style={styles.tabContainer}>
                    <button 
                        onClick={() => { setIsSignUp(false); setError(null); setSuccessMessage(null); }}
                        style={{
                            ...styles.tabBtn,
                            color: !isSignUp ? '#8b5cf6' : '#64748b',
                            borderBottom: !isSignUp ? '2px solid #8b5cf6' : '2px solid transparent',
                            fontWeight: !isSignUp ? '700' : '500',
                        }}
                    >
                        Giriş Yap
                    </button>
                    <button 
                        onClick={() => { setIsSignUp(true); setError(null); setSuccessMessage(null); }}
                        style={{
                            ...styles.tabBtn,
                            color: isSignUp ? '#8b5cf6' : '#64748b',
                            borderBottom: isSignUp ? '2px solid #8b5cf6' : '2px solid transparent',
                            fontWeight: isSignUp ? '700' : '500',
                        }}
                    >
                        Kayıt Ol
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} style={styles.form}>
                    {/* Error message */}
                    {error && (
                        <div style={styles.errorBanner}>
                            <AlertCircle size={16} style={{ flexShrink: 0 }} />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Success message */}
                    {successMessage && (
                        <div style={styles.successBanner}>
                            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                            <span>{successMessage}</span>
                        </div>
                    )}

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>E-POSTA ADRESİ</label>
                        <div style={styles.inputWrapper}>
                            <Mail size={18} style={styles.inputIcon} />
                            <input 
                                type="email"
                                placeholder="ornek@domain.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                style={styles.input}
                                required
                            />
                        </div>
                    </div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>ŞİFRE</label>
                        <div style={styles.inputWrapper}>
                            <Lock size={18} style={styles.inputIcon} />
                            <input 
                                type="password"
                                placeholder="••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={styles.input}
                                required
                            />
                        </div>
                    </div>

                    {isSignUp && (
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>ŞİFREYİ ONAYLA</label>
                            <div style={styles.inputWrapper}>
                                <Lock size={18} style={styles.inputIcon} />
                                <input 
                                    type="password"
                                    placeholder="••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    style={styles.input}
                                    required
                                />
                            </div>
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading}
                        style={{
                            ...styles.submitBtn,
                            opacity: loading ? 0.7 : 1,
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {loading ? '⏳ İşleniyor...' : (isSignUp ? 'Kayıt Ol ✨' : 'Giriş Yap 🚀')}
                    </button>
                </form>

                {/* Divider */}
                <div style={styles.dividerRow}>
                    <div style={styles.dividerLine} />
                    <span style={styles.dividerText}>VEYA</span>
                    <div style={styles.dividerLine} />
                </div>

                {/* Quick Demo Mode Login */}
                <button 
                    onClick={handleDemoLogin}
                    disabled={loading}
                    className="pulse-hover"
                    style={styles.demoBtn}
                >
                    <Sparkles size={16} />
                    <span>Hızlı Giriş (Demo Modu) ⚡</span>
                </button>

                {/* Mode status indicator */}
                <div style={styles.statusFooter}>
                    {isDemoMode ? (
                        <span style={styles.statusOffline}>⚠️ Çevrimdışı / Demo Modu devrede. Veriler tarayıcıda tutulur.</span>
                    ) : (
                        <span style={styles.statusOnline}>🔒 Bulut Veritabanı ve Supabase aktif.</span>
                    )}
                </div>
            </div>
        </div>
    );
}

const styles = {
    container: {
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box',
    },
    loginCard: {
        width: '100%',
        maxWidth: '440px',
        padding: '40px 32px 32px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        background: 'rgba(255, 255, 255, 0.82)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.5)',
        borderRadius: '28px',
        boxShadow: '0 20px 50px rgba(120, 110, 90, 0.12)',
    },
    header: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: '8px',
    },
    logoCircle: {
        width: '64px',
        height: '64px',
        borderRadius: '20px',
        background: 'rgba(139, 92, 246, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '4px',
    },
    title: {
        fontSize: '24px',
        fontWeight: '800',
        color: '#1e293b',
        margin: 0,
    },
    titleAccent: {
        background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
    },
    subtitle: {
        fontSize: '13px',
        color: '#64748b',
        lineHeight: '1.5',
        fontWeight: '500',
        margin: 0,
    },
    tabContainer: {
        display: 'flex',
        width: '100%',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
    },
    tabBtn: {
        flex: 1,
        background: 'transparent',
        border: 'none',
        padding: '12px',
        fontSize: '14px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        outline: 'none',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    errorBanner: {
        background: 'rgba(239, 68, 68, 0.08)',
        border: '1px solid rgba(239, 68, 68, 0.15)',
        borderRadius: '12px',
        padding: '10px 14px',
        fontSize: '13px',
        color: '#dc2626',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontWeight: '500',
    },
    successBanner: {
        background: 'rgba(16, 185, 129, 0.08)',
        border: '1px solid rgba(16, 185, 129, 0.15)',
        borderRadius: '12px',
        padding: '10px 14px',
        fontSize: '13px',
        color: '#059669',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontWeight: '500',
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
    },
    label: {
        fontSize: '10px',
        fontWeight: '800',
        color: '#64748b',
        letterSpacing: '0.05em',
    },
    inputWrapper: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
    },
    inputIcon: {
        position: 'absolute',
        left: '14px',
        color: '#94a3b8',
    },
    input: {
        width: '100%',
        padding: '12px 14px 12px 42px',
        background: 'rgba(255, 255, 255, 0.6)',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: '12px',
        fontSize: '14px',
        color: '#1e293b',
        outline: 'none',
        transition: 'all 0.3s ease',
        fontFamily: 'var(--font-body)',
        ':focus': {
            borderColor: '#8b5cf6',
            background: '#ffffff',
            boxShadow: '0 0 0 3px rgba(139, 92, 246, 0.15)'
        }
    },
    submitBtn: {
        background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)',
        border: 'none',
        color: '#ffffff',
        padding: '14px',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '700',
        boxShadow: '0 4px 15px rgba(139, 92, 246, 0.25)',
        transition: 'all 0.3s ease',
        marginTop: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dividerRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        margin: '4px 0',
    },
    dividerLine: {
        flex: 1,
        height: '1px',
        background: 'rgba(0,0,0,0.06)',
    },
    dividerText: {
        fontSize: '11px',
        fontWeight: '700',
        color: '#94a3b8',
    },
    demoBtn: {
        background: 'rgba(255, 255, 255, 0.8)',
        border: '1px solid rgba(139, 92, 246, 0.25)',
        color: '#8b5cf6',
        padding: '14px',
        borderRadius: '12px',
        fontSize: '13px',
        fontWeight: '700',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: '0 2px 8px rgba(139, 92, 246, 0.05)',
    },
    statusFooter: {
        textAlign: 'center',
        marginTop: '8px',
    },
    statusOffline: {
        fontSize: '10px',
        color: '#d97706',
        fontWeight: '600',
    },
    statusOnline: {
        fontSize: '10px',
        color: '#059669',
        fontWeight: '600',
    }
};

export default Login;
