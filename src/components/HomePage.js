import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, TrendingUp, LogOut } from 'lucide-react';

/* ─────────────────────────────────────
   MAP LOCATIONS
   Each location is a point on the map.
   x,y are percentages of the map area.
   ───────────────────────────────────── */
const MAP_LOCATIONS = [
    {
        id: 'library',
        name: 'Kütüphane',
        emoji: '📚',
        description: 'Loş ışıklar, ahşap raflar ve sayfa hışırtıları…',
        x: 18,
        y: 28,
        color: '#10b981',
        glowColor: 'rgba(16, 185, 129, 0.35)',
        terrain: 'Bilgi Vadisi'
    },
    {
        id: 'cafe',
        name: 'Akustik Kafe',
        emoji: '☕',
        description: 'Kahve kokusu, fincan tıkırtısı ve fısıltılar…',
        x: 72,
        y: 22,
        color: '#f59e0b',
        glowColor: 'rgba(245, 158, 11, 0.35)',
        terrain: 'Kavrulmuş Tepeler'
    },
    {
        id: 'cozy',
        name: 'Cozy Room',
        emoji: '🏠',
        description: 'Şömine başı, yumuşak battaniye, lo-fi melodiler…',
        x: 28,
        y: 68,
        color: '#ec4899',
        glowColor: 'rgba(236, 72, 153, 0.35)',
        terrain: 'Huzur Köyü'
    },
    {
        id: 'nature',
        name: 'Doğa Gezintisi',
        emoji: '🌿',
        description: 'Kuş cıvıltıları, dere şırıltısı, rüzgar esintisi…',
        x: 78,
        y: 65,
        color: '#06b6d4',
        glowColor: 'rgba(6, 182, 212, 0.35)',
        terrain: 'Yeşil Orman'
    }
];

/* SVG path data connecting the four locations like roads on a map */
const MAP_PATHS = [
    { from: 'library', to: 'cafe', d: 'M 18 28 C 35 15, 55 15, 72 22' },
    { from: 'cafe', to: 'nature', d: 'M 72 22 C 82 35, 85 50, 78 65' },
    { from: 'nature', to: 'cozy', d: 'M 78 65 C 60 75, 45 75, 28 68' },
    { from: 'cozy', to: 'library', d: 'M 28 68 C 15 55, 12 42, 18 28' },
    { from: 'library', to: 'nature', d: 'M 18 28 C 35 40, 55 55, 78 65' },
];

/* Decorative emoji scattered across the map terrain */
const MAP_DECORATIONS = [
    { emoji: '🌲', x: 60, y: 58, size: 22, delay: 0 },
    { emoji: '🌲', x: 85, y: 55, size: 18, delay: 1.5 },
    { emoji: '🌳', x: 90, y: 72, size: 24, delay: 0.8 },
    { emoji: '🌳', x: 68, y: 75, size: 20, delay: 2 },
    { emoji: '🏔️', x: 45, y: 12, size: 26, delay: 0.3 },
    { emoji: '🏔️', x: 55, y: 8, size: 20, delay: 1.2 },
    { emoji: '⛰️', x: 8, y: 18, size: 22, delay: 0.6 },
    { emoji: '🌸', x: 38, y: 62, size: 16, delay: 1.8 },
    { emoji: '🌻', x: 20, y: 78, size: 16, delay: 0.5 },
    { emoji: '🍄', x: 42, y: 72, size: 14, delay: 2.2 },
    { emoji: '💎', x: 50, y: 45, size: 14, delay: 1 },
    { emoji: '🦋', x: 65, y: 40, size: 16, delay: 0.2 },
    { emoji: '🌙', x: 92, y: 12, size: 18, delay: 1.4 },
    { emoji: '🏕️', x: 15, y: 50, size: 18, delay: 0.9 },
    { emoji: '🌊', x: 50, y: 82, size: 20, delay: 1.6 },
    { emoji: '⭐', x: 30, y: 15, size: 12, delay: 2.5 },
    { emoji: '⭐', x: 82, y: 40, size: 10, delay: 3.2 },
    { emoji: '⭐', x: 48, y: 30, size: 11, delay: 1.9 },
];

/* Floating clouds */
const CLOUDS = [
    { top: '8%', duration: 35, delay: 0, opacity: 0.4, size: 60 },
    { top: '18%', duration: 45, delay: 10, opacity: 0.3, size: 48 },
    { top: '35%', duration: 55, delay: 22, opacity: 0.25, size: 40 },
    { top: '60%', duration: 40, delay: 5, opacity: 0.2, size: 55 },
];

function HomePage({ 
    onSelectEnvironment, 
    onAskGeminiMood, 
    onViewHistory,
    aiLoading,
    userMood,
    setUserMood,
    buddyType,
    setBuddyType,
    buddyActive,
    setBuddyActive,
    user,
    onSignOut
}) {
    const [hoveredId, setHoveredId] = useState(null);
    const [moodText, setMoodText] = useState('');
    const [characterPos, setCharacterPos] = useState({ x: 48, y: 45 });
    const [isMoving, setIsMoving] = useState(false);
    const [setupEnv, setSetupEnv] = useState(null);
    const mapRef = useRef(null);

    /* Move the character toward a pin when hovered */
    useEffect(() => {
        if (hoveredId) {
            const loc = MAP_LOCATIONS.find(l => l.id === hoveredId);
            if (loc) {
                setIsMoving(true);
                setCharacterPos({ x: loc.x - 3, y: loc.y + 6 });
                const t = setTimeout(() => setIsMoving(false), 600);
                return () => clearTimeout(t);
            }
        }
    }, [hoveredId]);

    const handleMoodSubmit = (e) => {
        e.preventDefault();
        if (!moodText.trim() || aiLoading) return;
        onAskGeminiMood(moodText);
    };

    const hoveredLoc = hoveredId ? MAP_LOCATIONS.find(l => l.id === hoveredId) : null;

    return (
        <div className="hp-wrapper" style={styles.pageWrapper}>

            {/* ── USER BAR (Top Right) ── */}
            <div className="hp-user-bar" style={styles.userBar}>
                <button 
                    onClick={onViewHistory}
                    className="pulse-hover hp-history-btn"
                    style={styles.historyBtn}
                >
                    <TrendingUp size={16} />
                    <span className="btn-text">Odak Geçmişim</span>
                </button>
                <div className="hp-user-info-pill" style={styles.userInfoPill}>
                    <span style={{ fontSize: '14px' }}>👤</span>
                    <span style={styles.userEmail} title={user?.email}>
                        {user?.email ? (user.email.length > 20 ? user.email.substring(0, 17) + '...' : user.email) : 'Misafir'}
                    </span>
                </div>
                <button 
                    onClick={onSignOut}
                    className="pulse-hover hp-signout-btn"
                    style={styles.signOutBtn}
                >
                    <LogOut size={16} />
                    <span className="btn-text">Çıkış Yap</span>
                </button>
            </div>

            {/* ── HEADER ── */}
            <header className="hp-header" style={styles.header}>
                <h1 style={styles.title}>
                    <span style={{ fontSize: '36px' }}>🧭</span>{' '}
                    FocusRoom <span style={styles.titleAccent}>Haritası</span>
                </h1>
                <p style={styles.subtitle}>
                    Odaklanma yolculuğuna çıkmak için haritadan bir ortam seçin
                </p>
            </header>

            {/* ── MAP SCROLL WRAPPER (Mobile scroll / Desktop full width) ── */}
            <div className="hp-map-scroll-wrapper">
                {/* ── MAP CONTAINER ── */}
                <div ref={mapRef} className="hp-map-container" style={styles.mapContainer}>

                    {/* Fog layers */}
                    <div style={styles.fogLayer1} />
                    <div style={styles.fogLayer2} />

                    {/* Floating clouds */}
                    {CLOUDS.map((c, i) => (
                        <div key={`cloud-${i}`} style={{
                            position: 'absolute',
                            top: c.top,
                            left: '-120px',
                            fontSize: `${c.size}px`,
                            animation: `float-cloud ${c.duration}s ${c.delay}s linear infinite`,
                            opacity: c.opacity,
                            zIndex: 1,
                            pointerEvents: 'none',
                            filter: 'brightness(1.2)',
                        }}>☁️</div>
                    ))}

                    {/* Decorative terrain emoji */}
                    {MAP_DECORATIONS.map((d, i) => (
                        <div key={`deco-${i}`} style={{
                            position: 'absolute',
                            left: `${d.x}%`,
                            top: `${d.y}%`,
                            fontSize: `${d.size}px`,
                            opacity: 0.75,
                            pointerEvents: 'none',
                            zIndex: 1,
                            animation: d.emoji === '⭐' || d.emoji === '🦋'
                                ? `twinkle ${2 + d.delay}s ${d.delay}s ease-in-out infinite`
                                : `char-idle ${4 + d.delay * 0.5}s ${d.delay}s ease-in-out infinite`,
                            transition: 'opacity 0.3s',
                        }}>{d.emoji}</div>
                    ))}

                    {/* SVG Paths (roads between locations) */}
                    <svg
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        style={styles.pathSvg}
                    >
                        {MAP_PATHS.map((p, i) => (
                            <path
                                key={`path-${i}`}
                                d={p.d}
                                fill="none"
                                stroke="rgba(94, 114, 228, 0.25)"
                                strokeWidth="0.4"
                                strokeDasharray="1.5 1"
                                style={{
                                    animation: 'dash-flow 2s linear infinite',
                                }}
                            />
                        ))}
                        {/* Highlighted path to hovered location */}
                        {hoveredId && MAP_PATHS.filter(p => p.from === hoveredId || p.to === hoveredId).map((p, i) => (
                            <path
                                key={`path-active-${i}`}
                                d={p.d}
                                fill="none"
                                stroke={hoveredLoc?.color || '#8b5cf6'}
                                strokeWidth="0.5"
                                strokeDasharray="2 1"
                                strokeOpacity={0.6}
                                style={{
                                    animation: 'dash-flow 1s linear infinite',
                                    filter: `drop-shadow(0 0 3px ${hoveredLoc?.color || '#8b5cf6'})`,
                                }}
                            />
                        ))}
                    </svg>

                    {/* ── MAP LOCATION PINS ── */}
                    {MAP_LOCATIONS.map((loc) => {
                        const isHovered = hoveredId === loc.id;
                        return (
                            <div
                                key={loc.id}
                                style={{
                                    position: 'absolute',
                                    left: `${loc.x}%`,
                                    top: `${loc.y}%`,
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: isHovered ? 20 : 10,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}
                                onMouseEnter={() => setHoveredId(loc.id)}
                                onMouseLeave={() => setHoveredId(null)}
                                onClick={() => setSetupEnv(loc.id)}
                            >
                                {/* Pulsing ground glow */}
                                <div style={{
                                    position: 'absolute',
                                    bottom: '-12px',
                                    width: isHovered ? '70px' : '45px',
                                    height: isHovered ? '20px' : '12px',
                                    borderRadius: '50%',
                                    background: `radial-gradient(ellipse, ${loc.glowColor} 0%, transparent 70%)`,
                                    transition: 'all 0.4s ease',
                                    animation: isHovered ? 'glow-pulse 1.5s ease-in-out infinite' : 'none',
                                    color: loc.color,
                                }} />

                                {/* Pin circle */}
                                <div style={{
                                    width: isHovered ? '68px' : '56px',
                                    height: isHovered ? '56px' : '56px',
                                    borderRadius: '50%',
                                    background: isHovered
                                        ? `radial-gradient(circle at 35% 35%, ${loc.color}, ${loc.color}cc)`
                                        : `radial-gradient(circle at 35% 35%, ${loc.color}22, ${loc.color}11)`,
                                    border: `3px solid ${isHovered ? loc.color : loc.color + '77'}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: isHovered ? '30px' : '26px',
                                    transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                    animation: isHovered ? 'pin-bounce 1s ease-in-out infinite' : 'none',
                                    boxShadow: isHovered
                                        ? `0 0 25px ${loc.glowColor}, 0 8px 30px rgba(0,0,0,0.1)`
                                        : `0 4px 15px rgba(0,0,0,0.05)`,
                                    backdropFilter: 'blur(8px)',
                                }}>
                                    {loc.emoji}
                                </div>

                                {/* Location name label */}
                                <div style={{
                                    background: isHovered
                                        ? `linear-gradient(135deg, ${loc.color}, ${loc.color}dd)`
                                        : 'rgba(255, 255, 255, 0.9)',
                                    padding: isHovered ? '6px 16px' : '4px 12px',
                                    borderRadius: '12px',
                                    fontSize: isHovered ? '14px' : '12px',
                                    fontWeight: '700',
                                    color: isHovered ? '#ffffff' : '#1e293b',
                                    whiteSpace: 'nowrap',
                                    transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                    border: `1px solid ${isHovered ? loc.color : 'rgba(0,0,0,0.06)'}`,
                                    backdropFilter: 'blur(8px)',
                                    letterSpacing: '0.02em',
                                    boxShadow: isHovered ? `0 4px 15px ${loc.glowColor}` : '0 2px 8px rgba(0,0,0,0.05)',
                                }}>
                                    {loc.name}
                                </div>

                                {/* Terrain subtitle */}
                                <div style={{
                                    fontSize: '10px',
                                    color: loc.color,
                                    fontWeight: '600',
                                    opacity: isHovered ? 1 : 0.7,
                                    transition: 'opacity 0.3s',
                                    letterSpacing: '0.08em',
                                    textTransform: 'uppercase',
                                 }}>
                                    {loc.terrain}
                                </div>

                                {/* Expanded tooltip on hover */}
                                {isHovered && (
                                    <div style={{
                                        position: 'absolute',
                                        bottom: loc.y > 50 ? '115%' : 'auto',
                                        top: loc.y > 50 ? 'auto' : '115%',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        background: 'rgba(255, 255, 255, 0.95)',
                                        backdropFilter: 'blur(16px)',
                                        border: `1px solid ${loc.color}66`,
                                        borderRadius: '16px',
                                        padding: '16px 20px',
                                        width: '220px',
                                        animation: 'tooltip-in 0.3s ease-out forwards',
                                        boxShadow: `0 12px 40px rgba(0,0,0,0.06), 0 0 20px ${loc.glowColor}`,
                                        zIndex: 30,
                                    }}>
                                        <p style={{
                                            fontSize: '13px',
                                            color: '#475569',
                                            lineHeight: '1.5',
                                            marginBottom: '12px',
                                        }}>
                                            {loc.description}
                                        </p>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            fontSize: '13px',
                                            fontWeight: '700',
                                            color: loc.color,
                                        }}>
                                            <span>⚡ Seansı Yapılandır</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* ── WANDERING CHARACTER ── */}
                    <div style={{
                        position: 'absolute',
                        left: `${characterPos.x}%`,
                        top: `${characterPos.y}%`,
                        fontSize: '28px',
                        transition: isMoving ? 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'all 2s ease',
                        animation: 'char-idle 2.5s ease-in-out infinite',
                        zIndex: 15,
                        pointerEvents: 'none',
                        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))',
                    }}>
                        🧑‍💻
                    </div>

                    {/* Map legend / compass */}
                    <div style={styles.compassBox}>
                        <div style={{ fontSize: '28px', animation: 'char-idle 3s ease-in-out infinite' }}>🧭</div>
                        <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '600', letterSpacing: '0.1em' }}>
                            ODAK HARİTASI
                        </span>
                    </div>
                </div>
            </div>

            {/* ── AI MOOD BAR (compact, below map) ── */}
            <div className="hp-mood-bar" style={styles.moodBar}>
                <div className="hp-mood-bar-inner" style={styles.moodBarInner}>
                    <Sparkles size={18} style={{ color: '#8b5cf6', flexShrink: 0 }} />
                    <form onSubmit={handleMoodSubmit} style={styles.moodForm}>
                        <input
                            type="text"
                            value={moodText}
                            onChange={(e) => setMoodText(e.target.value)}
                            placeholder="Ruh halini yaz, yapay zeka sana en uygun ortamı seçsin…"
                            style={styles.moodInput}
                        />
                        <button
                            type="submit"
                            disabled={aiLoading || !moodText.trim()}
                            style={{
                                ...styles.moodBtn,
                                opacity: aiLoading || !moodText.trim() ? 0.5 : 1,
                                cursor: aiLoading || !moodText.trim() ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {aiLoading ? '⏳' : '✨'} {aiLoading ? 'Hazırlanıyor…' : 'Ortam Bul'}
                        </button>
                    </form>
                </div>
            </div>

            {/* ── SETUP MODAL OVERLAY ── */}
            {setupEnv && (
                <div style={styles.modalOverlay}>
                    <div className="glass-panel hp-modal-content" style={styles.modalContent}>
                        {/* Modal header with close button */}
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>
                                {MAP_LOCATIONS.find(l => l.id === setupEnv)?.emoji} {MAP_LOCATIONS.find(l => l.id === setupEnv)?.name} Odası
                            </h2>
                            <button onClick={() => setSetupEnv(null)} style={styles.modalCloseBtn}>✕</button>
                        </div>
                        
                        <p style={styles.modalSubtitle}>Odaklanma seansına başlamadan önce çalışma arkadaşını ve modunu seç!</p>
                        
                        {/* Focus Buddy Choice */}
                        <div style={styles.sectionContainer}>
                            <span style={styles.sectionLabel}>🐶 Focus Buddy AI Seçimi</span>
                            <div className="hp-buddy-grid" style={styles.buddyGrid}>
                                {[
                                    { type: 'shiba', label: 'Shiba 🐶', desc: 'Neşeli Shiba' },
                                    { type: 'panda', label: 'Panda 🐼', desc: 'Sakin Panda' },
                                    { type: 'kitty', label: 'Kitty 🐱', desc: 'Sevimli Kedi' }
                                ].map(b => (
                                    <button
                                        key={b.type}
                                        onClick={() => setBuddyType(b.type)}
                                        style={{
                                            ...styles.buddyCard,
                                            border: '2px solid',
                                            borderColor: buddyType === b.type ? '#8b5cf6' : 'rgba(0,0,0,0.06)',
                                            backgroundColor: buddyType === b.type ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255,255,255,0.6)',
                                        }}
                                    >
                                        <span style={{ fontSize: '24px' }}>{b.type === 'shiba' ? '🐶' : b.type === 'panda' ? '🐼' : '🐱'}</span>
                                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{b.label}</span>
                                        <span style={{ fontSize: '10px', color: '#64748b' }}>{b.desc}</span>
                                    </button>
                                ))}
                            </div>
                            
                            <div style={styles.toggleRow}>
                                <span style={{ fontSize: '12px', color: '#475569', fontWeight: '500' }}>Focus Buddy ekranda gözüksün mü?</span>
                                <input 
                                    type="checkbox" 
                                    checked={buddyActive} 
                                    onChange={(e) => setBuddyActive(e.target.checked)}
                                    style={styles.checkbox}
                                />
                            </div>
                        </div>

                        {/* Pomodoro Timer / Mood Choice */}
                        <div style={styles.sectionContainer}>
                            <span style={styles.sectionLabel}>⚡ Çalışma Modu & Pomodoro Süresi</span>
                            <div className="hp-mood-grid" style={styles.moodGrid}>
                                {[
                                    { id: 'full', label: 'Enerji Dolu 🚀', focus: 50, break: 10, desc: 'Derin ve uzun odak seansı' },
                                    { id: 'distracted', label: 'Dağınık 🌪️', focus: 25, break: 5, desc: 'Gemini ile 3 alt adıma böl' },
                                    { id: 'tired', label: 'Çok Yorgun 💤', focus: 15, break: 5, desc: 'Yavaş mikro seanslar' }
                                ].map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => setUserMood(m.id)}
                                        style={{
                                            ...styles.moodCard,
                                            border: '2px solid',
                                            borderColor: userMood === m.id ? '#8b5cf6' : 'rgba(0,0,0,0.06)',
                                            backgroundColor: userMood === m.id ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255,255,255,0.6)',
                                        }}
                                    >
                                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{m.label}</span>
                                        <span style={{ fontSize: '11px', color: '#8b5cf6', fontWeight: '700', margin: '4px 0' }}>{m.focus}dk Odak / {m.break}dk Mola</span>
                                        <span style={{ fontSize: '10px', color: '#64748b', textAlign: 'center' }}>{m.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <button
                            onClick={() => {
                                onSelectEnvironment(setupEnv, null);
                                setSetupEnv(null);
                            }}
                            className="pulse-hover"
                            style={styles.startBtn}
                        >
                            Odaya Giriş Yap ✨
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = {
    pageWrapper: {
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        padding: '16px',
        boxSizing: 'border-box',
    },

    /* Header */
    header: {
        position: 'absolute',
        top: '32px',
        left: '32px',
        transform: 'none',
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '4px',
        padding: '0',
        zIndex: 30,
        pointerEvents: 'none',
    },
    title: {
        fontSize: '1.8rem',
        fontWeight: '800',
        color: '#1e293b',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        margin: 0,
    },
    titleAccent: {
        background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
    },
    subtitle: {
        fontSize: '12px',
        color: '#64748b',
        fontWeight: '500',
        margin: 0,
    },

    /* Map */
    mapContainer: {
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: '24px',
        overflow: 'hidden',
        background: `
            radial-gradient(ellipse at 20% 30%, rgba(52, 211, 153, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 75% 25%, rgba(251, 191, 36, 0.25) 0%, transparent 50%),
            radial-gradient(ellipse at 30% 70%, rgba(244, 114, 182, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 70%, rgba(56, 189, 248, 0.25) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, #e0f2fe 0%, #bae6fd 100%)
        `,
        border: '1px solid rgba(255, 255, 255, 0.5)',
        boxShadow: '0 25px 80px -20px rgba(120, 110, 90, 0.15), inset 0 1px 0 rgba(255,255,255,0.4)',
    },

    fogLayer1: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(ellipse at 30% 50%, rgba(255, 255, 255, 0.3), transparent 60%)',
        animation: 'fog-drift 15s ease-in-out infinite',
        pointerEvents: 'none',
        zIndex: 0,
    },
    fogLayer2: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(ellipse at 70% 60%, rgba(255, 255, 255, 0.2), transparent 60%)',
        animation: 'fog-drift 20s 5s ease-in-out infinite',
        pointerEvents: 'none',
        zIndex: 0,
    },

    pathSvg: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 2,
        pointerEvents: 'none',
    },

    compassBox: {
        position: 'absolute',
        bottom: '16px',
        right: '18px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.5)',
        padding: '10px 14px',
        borderRadius: '14px',
        zIndex: 5,
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    },

    /* AI Mood Bar */
    moodBar: {
        position: 'absolute',
        bottom: '32px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '90%',
        maxWidth: '650px',
        zIndex: 30,
    },
    moodBarInner: {
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.5)',
        borderRadius: '20px',
        padding: '12px 18px',
        boxShadow: '0 8px 32px rgba(120, 110, 90, 0.08)',
    },
    moodForm: {
        display: 'flex',
        flex: 1,
        gap: '10px',
        alignItems: 'center',
    },
    moodInput: {
        flex: 1,
        background: 'rgba(255, 255, 255, 0.5)',
        border: '1px solid rgba(0, 0, 0, 0.05)',
        borderRadius: '12px',
        padding: '10px 14px',
        fontSize: '14px',
        color: '#1e293b',
        outline: 'none',
        fontFamily: 'var(--font-body)',
    },
    moodBtn: {
        background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)',
        border: 'none',
        color: '#ffffff',
        padding: '10px 20px',
        borderRadius: '12px',
        fontSize: '13px',
        fontWeight: '700',
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        boxShadow: '0 4px 15px rgba(139, 92, 246, 0.25)',
        transition: 'all 0.3s ease',
    },

    /* Modal Overlay & Card Setup styles */
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.25)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
    },
    modalContent: {
        width: '100%',
        maxWidth: '520px',
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '24px',
        padding: '28px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        boxShadow: '0 20px 50px rgba(120, 110, 90, 0.15)',
        border: '1px solid rgba(255, 255, 255, 0.7)',
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: '22px',
        fontWeight: '800',
        color: '#1e293b',
        margin: 0,
        fontFamily: 'var(--font-title)',
    },
    modalCloseBtn: {
        background: 'rgba(0,0,0,0.05)',
        border: 'none',
        borderRadius: '50%',
        width: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: '#64748b',
        fontSize: '14px',
        fontWeight: 'bold',
        transition: 'background 0.2s',
    },
    modalSubtitle: {
        fontSize: '13px',
        color: '#64748b',
        margin: 0,
        lineHeight: '1.5',
    },
    sectionContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
    },
    sectionLabel: {
        fontSize: '12px',
        fontWeight: '800',
        color: '#1e293b',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
    buddyGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
    },
    buddyCard: {
        border: '2px solid',
        borderRadius: '16px',
        padding: '12px 8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    },
    toggleRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '6px',
        background: 'rgba(0,0,0,0.02)',
        padding: '8px 12px',
        borderRadius: '12px',
    },
    checkbox: {
        width: '18px',
        height: '18px',
        accentColor: '#8b5cf6',
        cursor: 'pointer',
    },
    moodGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
    },
    moodCard: {
        border: '2px solid',
        borderRadius: '16px',
        padding: '12px 6px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    },
    startBtn: {
        width: '100%',
        background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)',
        border: 'none',
        color: '#ffffff',
        padding: '14px',
        borderRadius: '16px',
        fontSize: '15px',
        fontWeight: '800',
        cursor: 'pointer',
        boxShadow: '0 8px 25px rgba(139, 92, 246, 0.25)',
        transition: 'all 0.3s ease',
        textAlign: 'center',
    },
    userBar: {
        position: 'absolute',
        top: '32px',
        right: '32px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        zIndex: 50,
        pointerEvents: 'auto',
    },
    userInfoPill: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.5)',
        borderRadius: '20px',
        padding: '10px 18px',
        boxShadow: '0 8px 32px rgba(120, 110, 90, 0.08)',
    },
    userEmail: {
        fontSize: '13px',
        fontWeight: '700',
        color: '#1e293b',
    },
    historyBtn: {
        background: 'rgba(139, 92, 246, 0.08)',
        border: '1px solid rgba(139, 92, 246, 0.15)',
        color: '#8b5cf6',
        padding: '10px 18px',
        borderRadius: '20px',
        fontSize: '13px',
        fontWeight: '700',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: '0 4px 12px rgba(139, 92, 246, 0.05)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    },
    signOutBtn: {
        background: 'rgba(239, 68, 68, 0.08)',
        border: '1px solid rgba(239, 68, 68, 0.15)',
        color: '#dc2626',
        padding: '10px 18px',
        borderRadius: '20px',
        fontSize: '13px',
        fontWeight: '700',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: '0 4px 12px rgba(220, 38, 38, 0.05)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    }
};

export default HomePage;
