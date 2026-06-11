import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Clock, Trophy, Flame, TrendingUp, BookOpen, Coffee, Home, Trees } from 'lucide-react';

// Helper to format date as YYYY-MM-DD
const formatDate = (date) => date.toISOString().split('T')[0];

const ENV_META = {
    library: { label: 'Kütüphane', icon: BookOpen, color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #059669)', emoji: '📚' },
    cafe:    { label: 'Akustik Kafe', icon: Coffee, color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', emoji: '☕' },
    cozy:    { label: 'Cozy Room', icon: Home, color: '#ec4899', gradient: 'linear-gradient(135deg, #ec4899, #db2777)', emoji: '🏠' },
    nature:  { label: 'Doğa Gezintisi', icon: Trees, color: '#06b6d4', gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)', emoji: '🌿' }
};

// Animated number counter
function AnimatedNumber({ value, suffix = '', decimals = 0, duration = 1200 }) {
    const [display, setDisplay] = useState(0);
    const ref = useRef(null);

    useEffect(() => {
        let start = 0;
        const end = value;
        if (end === 0) { setDisplay(0); return; }
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // easeOutExpo
            const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            const current = start + (end - start) * eased;
            setDisplay(current);
            if (progress < 1) {
                ref.current = requestAnimationFrame(animate);
            }
        };
        ref.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(ref.current);
    }, [value, duration]);

    return <>{decimals > 0 ? display.toFixed(decimals) : Math.round(display)}{suffix}</>;
}

// Day name helper (Turkish short)
function getDayName(dateStr) {
    const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    const d = new Date(dateStr + 'T00:00:00');
    return days[d.getDay()];
}

export default function FocusHistory({ user, onBack }) {
    const [dailyTotals, setDailyTotals] = useState({});
    const [roomTotals, setRoomTotals] = useState({});
    const [bestRoom, setBestRoom] = useState({ env_id: null, totalMinutes: 0 });
    const [totalSessions, setTotalSessions] = useState(0);
    const [loading, setLoading] = useState(true);
    const [chartAnimated, setChartAnimated] = useState(false);

    useEffect(() => {
        if (!user?.id) return;
        const fetchData = async () => {
            try {
                const { data, error } = await supabase
                    .from('focus_sessions')
                    .select('*')
                    .eq('user_id', user.id);
                if (error) throw error;
                const rows = data || [];
                setTotalSessions(rows.length);
                const dayMap = {};
                const roomMap = {};
                rows.forEach((s) => {
                    const day = formatDate(new Date(s.completed_at));
                    dayMap[day] = (dayMap[day] || 0) + s.duration_minutes;
                    roomMap[s.env_id] = (roomMap[s.env_id] || 0) + s.duration_minutes;
                });
                setDailyTotals(dayMap);
                setRoomTotals(roomMap);
                let best = { env_id: null, totalMinutes: 0 };
                Object.entries(roomMap).forEach(([env, mins]) => {
                    if (mins > best.totalMinutes) best = { env_id: env, totalMinutes: mins };
                });
                setBestRoom(best);
            } catch (err) {
                console.error('FocusHistory fetch error:', err.message);
            } finally {
                setLoading(false);
                setTimeout(() => setChartAnimated(true), 100);
            }
        };
        fetchData();
    }, [user]);

    // Last 7 days data
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = formatDate(d);
        last7Days.push({ date: key, minutes: dailyTotals[key] || 0, dayName: getDayName(key) });
    }

    const totalMinutesAll = Object.values(dailyTotals).reduce((a, b) => a + b, 0);
    const totalHoursAll = totalMinutesAll / 60;
    const maxMinutes = Math.max(...last7Days.map(p => p.minutes), 1);

    // Active days (streak-like)
    const activeDays = Object.keys(dailyTotals).length;

    // Average per session
    const avgPerSession = totalSessions > 0 ? Math.round(totalMinutesAll / totalSessions) : 0;

    // Room breakdown sorted
    const roomBreakdown = Object.entries(roomTotals)
        .sort((a, b) => b[1] - a[1])
        .map(([env, mins]) => ({
            env_id: env,
            minutes: mins,
            percent: totalMinutesAll > 0 ? (mins / totalMinutesAll) * 100 : 0,
            meta: ENV_META[env] || ENV_META.library
        }));

    return (
        <div className="fh-wrapper" style={styles.wrapper}>
            {/* Inject keyframe animations */}
            <style>{`
                @keyframes fhFadeInUp {
                    from { opacity: 0; transform: translateY(24px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fhFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes fhSlideRight {
                    from { width: 0%; }
                    to { width: var(--target-width); }
                }
                @keyframes fhBarGrow {
                    from { height: 0; }
                    to { height: var(--target-height); }
                }
                @keyframes fhPulseGlow {
                    0%, 100% { box-shadow: 0 0 20px rgba(139,92,246,0.15); }
                    50% { box-shadow: 0 0 40px rgba(139,92,246,0.3); }
                }
                @keyframes fhShine {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
                @keyframes fhFloat {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-6px); }
                }
                .fh-card {
                    animation: fhFadeInUp 0.6s ease-out both;
                }
                .fh-card:nth-child(1) { animation-delay: 0.05s; }
                .fh-card:nth-child(2) { animation-delay: 0.12s; }
                .fh-card:nth-child(3) { animation-delay: 0.19s; }
                .fh-card:nth-child(4) { animation-delay: 0.26s; }
                .fh-card:nth-child(5) { animation-delay: 0.33s; }
                .fh-bar-col {
                    animation: fhFadeIn 0.5s ease-out both;
                }
                .fh-bar-col:nth-child(1) { animation-delay: 0.15s; }
                .fh-bar-col:nth-child(2) { animation-delay: 0.22s; }
                .fh-bar-col:nth-child(3) { animation-delay: 0.29s; }
                .fh-bar-col:nth-child(4) { animation-delay: 0.36s; }
                .fh-bar-col:nth-child(5) { animation-delay: 0.43s; }
                .fh-bar-col:nth-child(6) { animation-delay: 0.50s; }
                .fh-bar-col:nth-child(7) { animation-delay: 0.57s; }
                .fh-back-btn:hover {
                    background: rgba(255,255,255,0.95) !important;
                    transform: translateX(-2px);
                    box-shadow: 0 4px 16px rgba(0,0,0,0.08);
                }
                .fh-room-row:hover {
                    background: rgba(255,255,255,0.5) !important;
                    transform: scale(1.01);
                }
            `}</style>

            {/* Background decorative blobs */}
            <div style={styles.bgBlob1}></div>
            <div style={styles.bgBlob2}></div>
            <div style={styles.bgBlob3}></div>

            {/* Header */}
            <header className="fh-header" style={styles.header}>
                <button onClick={onBack} style={styles.backBtn} className="fh-back-btn">
                    <ArrowLeft size={18} /> Geri Dön
                </button>
                <div className="fh-header-center" style={styles.headerCenter}>
                    <h1 style={styles.title}>📊 Odak Geçmişim</h1>
                    <p style={styles.subtitle}>Odaklanma yolculuğunu takip et</p>
                </div>
                <div className="fh-header-spacer" style={{ width: 100 }}></div> {/* spacer for centering */}
            </header>

            {loading ? (
                <div style={styles.loadingWrapper}>
                    <div className="loading-spinner"></div>
                    <p style={styles.loadingText}>Veriler yükleniyor...</p>
                </div>
            ) : (
                <div style={styles.content}>
                    {/* ─── STAT CARDS ROW ─── */}
                    <div className="fh-stats-row" style={styles.statsRow}>
                        {/* Total Hours */}
                        <div className="fh-card" style={{ ...styles.statCard, ...styles.statCardPrimary }}>
                            <div style={styles.statIconWrap}>
                                <Clock size={22} color="#7c3aed" />
                            </div>
                            <div style={styles.statTextWrap}>
                                <span style={styles.statLabel}>Toplam Odak</span>
                                <span style={styles.statValue}>
                                    <AnimatedNumber value={totalHoursAll} decimals={1} suffix=" saat" />
                                </span>
                            </div>
                        </div>

                        {/* Total Sessions */}
                        <div className="fh-card" style={styles.statCard}>
                            <div style={{ ...styles.statIconWrap, background: 'rgba(16,185,129,0.12)' }}>
                                <TrendingUp size={22} color="#10b981" />
                            </div>
                            <div style={styles.statTextWrap}>
                                <span style={styles.statLabel}>Toplam Seans</span>
                                <span style={styles.statValue}>
                                    <AnimatedNumber value={totalSessions} suffix=" seans" />
                                </span>
                            </div>
                        </div>

                        {/* Active Days */}
                        <div className="fh-card" style={styles.statCard}>
                            <div style={{ ...styles.statIconWrap, background: 'rgba(245,158,11,0.12)' }}>
                                <Flame size={22} color="#f59e0b" />
                            </div>
                            <div style={styles.statTextWrap}>
                                <span style={styles.statLabel}>Aktif Gün</span>
                                <span style={styles.statValue}>
                                    <AnimatedNumber value={activeDays} suffix=" gün" />
                                </span>
                            </div>
                        </div>

                        {/* Avg per Session */}
                        <div className="fh-card" style={styles.statCard}>
                            <div style={{ ...styles.statIconWrap, background: 'rgba(6,182,212,0.12)' }}>
                                <Clock size={22} color="#06b6d4" />
                            </div>
                            <div style={styles.statTextWrap}>
                                <span style={styles.statLabel}>Ort. Seans</span>
                                <span style={styles.statValue}>
                                    <AnimatedNumber value={avgPerSession} suffix=" dk" />
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ─── BEST ROOM BANNER ─── */}
                    {bestRoom.env_id && (
                        <div className="fh-card" style={styles.bestRoomBanner}>
                            <div style={styles.bestRoomInner}>
                                <div style={styles.trophyCircle}>
                                    <Trophy size={28} color="#fbbf24" />
                                </div>
                                <div style={styles.bestRoomText}>
                                    <span style={styles.bestRoomLabel}>🏆 En Çok Odaklandığın Oda</span>
                                    <span style={styles.bestRoomName}>
                                        {ENV_META[bestRoom.env_id]?.emoji} {ENV_META[bestRoom.env_id]?.label || bestRoom.env_id}
                                    </span>
                                    <span style={styles.bestRoomStat}>
                                        {(bestRoom.totalMinutes / 60).toFixed(1)} saat toplam odaklanma
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ─── MAIN GRID: CHART + ROOM BREAKDOWN ─── */}
                    <div className="fh-main-grid" style={styles.mainGrid}>
                        {/* Bar Chart */}
                        <div className="fh-card fh-chart-card" style={styles.chartCard}>
                            <h3 style={styles.cardTitle}>📈 Son 7 Gün</h3>
                            <div style={styles.chartArea}>
                                {/* Y-axis labels */}
                                <div style={styles.yAxis}>
                                    {[100, 75, 50, 25, 0].map((pct) => (
                                        <span key={pct} style={styles.yLabel}>
                                            {Math.round((maxMinutes * pct) / 100)} dk
                                        </span>
                                    ))}
                                </div>

                                {/* Bars */}
                                <div style={styles.barsContainer}>
                                    {/* Grid lines */}
                                    {[0, 25, 50, 75, 100].map(pct => (
                                        <div key={pct} style={{
                                            ...styles.gridLine,
                                            bottom: `${pct}%`
                                        }}></div>
                                    ))}

                                    {last7Days.map((d, i) => {
                                        const barPct = (d.minutes / maxMinutes) * 100;
                                        const isToday = i === 6;
                                        return (
                                            <div key={i} className="fh-bar-col" style={styles.barCol}>
                                                {/* Value label */}
                                                {d.minutes > 0 && (
                                                    <span style={{
                                                        ...styles.barValueLabel,
                                                        opacity: chartAnimated ? 1 : 0,
                                                        transition: `opacity 0.4s ease ${0.3 + i * 0.08}s`
                                                    }}>
                                                        {d.minutes} dk
                                                    </span>
                                                )}
                                                {/* Bar */}
                                                <div style={styles.barTrack}>
                                                    <div style={{
                                                        ...styles.bar,
                                                        height: chartAnimated ? `${barPct}%` : '0%',
                                                        background: isToday
                                                            ? 'linear-gradient(180deg, #a78bfa 0%, #7c3aed 100%)'
                                                            : 'linear-gradient(180deg, #c4b5fd 0%, #8b5cf6 100%)',
                                                        transition: `height 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.15 + i * 0.08}s`,
                                                        boxShadow: isToday ? '0 0 16px rgba(124,58,237,0.35)' : '0 2px 8px rgba(139,92,246,0.15)',
                                                    }}>
                                                    </div>
                                                </div>
                                                {/* Day label */}
                                                <span style={{
                                                    ...styles.dayLabel,
                                                    fontWeight: isToday ? '800' : '600',
                                                    color: isToday ? '#7c3aed' : '#94a3b8',
                                                }}>
                                                    {d.dayName}
                                                </span>
                                                <span style={{
                                                    ...styles.dateLabel,
                                                    color: isToday ? '#7c3aed' : '#cbd5e1',
                                                }}>
                                                    {d.date.slice(8)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Room Breakdown */}
                        <div className="fh-card fh-room-card" style={styles.roomCard}>
                            <h3 style={styles.cardTitle}>🏠 Oda Dağılımı</h3>
                            <div style={styles.roomList}>
                                {roomBreakdown.length === 0 ? (
                                    <p style={styles.emptySmall}>Henüz veri yok</p>
                                ) : (
                                    roomBreakdown.map((room, i) => {
                                        const Icon = room.meta.icon;
                                        return (
                                            <div key={room.env_id} className="fh-room-row" style={{
                                                ...styles.roomRow,
                                                animationDelay: `${0.3 + i * 0.1}s`,
                                            }}>
                                                <div style={{
                                                    ...styles.roomIcon,
                                                    background: room.meta.gradient,
                                                }}>
                                                    <Icon size={18} color="#fff" />
                                                </div>
                                                <div style={styles.roomInfo}>
                                                    <div style={styles.roomNameRow}>
                                                        <span style={styles.roomName}>{room.meta.label}</span>
                                                        <span style={styles.roomTime}>
                                                            {(room.minutes / 60).toFixed(1)} saat
                                                        </span>
                                                    </div>
                                                    {/* Progress bar */}
                                                    <div style={styles.progressTrack}>
                                                        <div style={{
                                                            ...styles.progressFill,
                                                            width: chartAnimated ? `${room.percent}%` : '0%',
                                                            background: room.meta.gradient,
                                                            transition: `width 1s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.4 + i * 0.15}s`,
                                                        }}></div>
                                                    </div>
                                                    <span style={styles.roomPercent}>
                                                        {room.percent.toFixed(0)}% toplam odaklanma
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ─── EMPTY STATE ─── */}
                    {totalSessions === 0 && (
                        <div className="fh-card" style={styles.emptyState}>
                            <div style={styles.emptyEmoji}>🍅</div>
                            <h3 style={styles.emptyTitle}>Henüz odak seansın yok</h3>
                            <p style={styles.emptyDesc}>
                                Bir çalışma odasına gir ve Pomodoro sayacını tamamla.<br />
                                Her tamamlanan seans burada kaydedilecek!
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

const styles = {
    wrapper: {
        minHeight: '100vh',
        width: '100%',
        background: 'linear-gradient(160deg, #0f0a1e 0%, #1a1035 30%, #1e1145 60%, #150d2e 100%)',
        padding: '24px 24px 48px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
    },

    // Background blobs
    bgBlob1: {
        position: 'fixed',
        top: '-120px',
        right: '-80px',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
    },
    bgBlob2: {
        position: 'fixed',
        bottom: '-100px',
        left: '-60px',
        width: '350px',
        height: '350px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
    },
    bgBlob3: {
        position: 'fixed',
        top: '40%',
        left: '50%',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(236,72,153,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
        transform: 'translateX(-50%)',
    },

    // Header
    header: {
        width: '100%',
        maxWidth: '1000px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '28px',
        position: 'relative',
        zIndex: 2,
        animation: 'fhFadeIn 0.5s ease-out',
    },
    backBtn: {
        background: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '10px 18px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '13px',
        fontWeight: '600',
        color: '#e2e8f0',
        transition: 'all 0.25s ease',
        minWidth: '100px',
    },
    headerCenter: {
        textAlign: 'center',
    },
    title: {
        fontSize: '28px',
        fontWeight: '900',
        color: '#f8fafc',
        letterSpacing: '-0.03em',
        margin: 0,
    },
    subtitle: {
        fontSize: '13px',
        color: '#94a3b8',
        marginTop: '4px',
        fontWeight: '500',
    },

    // Loading
    loadingWrapper: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        marginTop: '80px',
    },
    loadingText: {
        color: '#94a3b8',
        fontSize: '14px',
        fontWeight: '500',
    },

    // Content
    content: {
        width: '100%',
        maxWidth: '1000px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        position: 'relative',
        zIndex: 2,
    },

    // Stats Row
    statsRow: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '14px',
    },
    statCard: {
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(16px)',
        borderRadius: '16px',
        padding: '18px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        border: '1px solid rgba(255,255,255,0.08)',
        transition: 'all 0.3s ease',
    },
    statCardPrimary: {
        background: 'rgba(124,58,237,0.12)',
        border: '1px solid rgba(124,58,237,0.2)',
    },
    statIconWrap: {
        width: '44px',
        height: '44px',
        borderRadius: '12px',
        background: 'rgba(124,58,237,0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    statTextWrap: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
    },
    statLabel: {
        fontSize: '11px',
        fontWeight: '600',
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
    },
    statValue: {
        fontSize: '20px',
        fontWeight: '800',
        color: '#f1f5f9',
        letterSpacing: '-0.02em',
    },

    // Best Room Banner
    bestRoomBanner: {
        background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(236,72,153,0.1) 50%, rgba(245,158,11,0.08) 100%)',
        backdropFilter: 'blur(16px)',
        borderRadius: '20px',
        padding: '24px',
        border: '1px solid rgba(255,255,255,0.1)',
        position: 'relative',
        overflow: 'hidden',
    },
    bestRoomInner: {
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        position: 'relative',
        zIndex: 1,
    },
    trophyCircle: {
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        background: 'rgba(251,191,36,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        animation: 'fhFloat 3s ease-in-out infinite',
    },
    bestRoomText: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    bestRoomLabel: {
        fontSize: '12px',
        fontWeight: '700',
        color: '#fbbf24',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
    bestRoomName: {
        fontSize: '22px',
        fontWeight: '800',
        color: '#f8fafc',
        letterSpacing: '-0.02em',
    },
    bestRoomStat: {
        fontSize: '13px',
        color: '#a78bfa',
        fontWeight: '500',
    },

    // Main Grid
    mainGrid: {
        display: 'grid',
        gridTemplateColumns: '1.6fr 1fr',
        gap: '16px',
    },

    // Chart Card
    chartCard: {
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(16px)',
        borderRadius: '20px',
        padding: '24px',
        border: '1px solid rgba(255,255,255,0.08)',
    },
    cardTitle: {
        fontSize: '16px',
        fontWeight: '800',
        color: '#f1f5f9',
        marginBottom: '20px',
        letterSpacing: '-0.01em',
    },
    chartArea: {
        display: 'flex',
        gap: '8px',
        height: '240px',
    },

    // Y-axis
    yAxis: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        paddingBottom: '36px',
        width: '42px',
        flexShrink: 0,
    },
    yLabel: {
        fontSize: '9px',
        color: '#64748b',
        fontWeight: '600',
        textAlign: 'right',
    },

    // Bars
    barsContainer: {
        flex: 1,
        display: 'flex',
        gap: '6px',
        alignItems: 'flex-end',
        position: 'relative',
        paddingBottom: '36px',
    },
    gridLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: '1px',
        background: 'rgba(255,255,255,0.05)',
        pointerEvents: 'none',
    },
    barCol: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        height: '100%',
        justifyContent: 'flex-end',
    },
    barValueLabel: {
        fontSize: '10px',
        fontWeight: '700',
        color: '#a78bfa',
        whiteSpace: 'nowrap',
    },
    barTrack: {
        width: '100%',
        maxWidth: '40px',
        flex: 1,
        display: 'flex',
        alignItems: 'flex-end',
        borderRadius: '8px 8px 4px 4px',
        position: 'relative',
    },
    bar: {
        width: '100%',
        borderRadius: '8px 8px 4px 4px',
        minHeight: '2px',
        position: 'relative',
    },
    dayLabel: {
        fontSize: '11px',
        letterSpacing: '0.02em',
        position: 'absolute',
        bottom: '16px',
    },
    dateLabel: {
        fontSize: '9px',
        fontWeight: '500',
        position: 'absolute',
        bottom: '2px',
    },

    // Room Card
    roomCard: {
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(16px)',
        borderRadius: '20px',
        padding: '24px',
        border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
    },
    roomList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        flex: 1,
    },
    roomRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '10px 12px',
        borderRadius: '12px',
        background: 'rgba(255,255,255,0.03)',
        transition: 'all 0.25s ease',
        cursor: 'default',
    },
    roomIcon: {
        width: '38px',
        height: '38px',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    roomInfo: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
    },
    roomNameRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    roomName: {
        fontSize: '13px',
        fontWeight: '700',
        color: '#e2e8f0',
    },
    roomTime: {
        fontSize: '12px',
        fontWeight: '600',
        color: '#a78bfa',
    },
    progressTrack: {
        height: '6px',
        borderRadius: '3px',
        background: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: '3px',
    },
    roomPercent: {
        fontSize: '10px',
        color: '#64748b',
        fontWeight: '500',
    },
    emptySmall: {
        color: '#64748b',
        fontSize: '13px',
        textAlign: 'center',
        padding: '20px 0',
    },

    // Empty State
    emptyState: {
        textAlign: 'center',
        padding: '48px 24px',
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(12px)',
        borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.06)',
    },
    emptyEmoji: {
        fontSize: '48px',
        marginBottom: '16px',
        animation: 'fhFloat 3s ease-in-out infinite',
    },
    emptyTitle: {
        fontSize: '18px',
        fontWeight: '800',
        color: '#e2e8f0',
        marginBottom: '8px',
    },
    emptyDesc: {
        fontSize: '13px',
        color: '#94a3b8',
        lineHeight: '1.6',
    },
};
