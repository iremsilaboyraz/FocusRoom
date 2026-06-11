import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Square, RefreshCw, Sparkles, Plus, Check, Trash2, ArrowLeft, BookOpen, Coffee, Home, Trees, Clock, Volume2, ListTodo, X } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../supabaseClient';

import libraryBg from '../assets/library_bg.png';
import cafeBg from '../assets/cafe_bg.png';
import cozyBg from '../assets/cozy_bg.png';
import natureBg from '../assets/nature_bg.png';

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

const ROOM_AUDIO_SOURCES = {
    nature: [
        { id: 'rain', name: 'Yağmur Sesi', src: 'https://raw.githubusercontent.com/karthiknvd/noctune/main/src/assets/audio/rain.mp3', icon: '🌧️' },
        { id: 'birds', name: 'Kuş Cıvıltısı', src: 'https://assets.mixkit.co/active_storage/sfx/2048/2048-84.wav', icon: '🐦' },
        { id: 'wind', name: 'Ağaç & Rüzgar Uğultusu', src: 'https://raw.githubusercontent.com/karthiknvd/noctune/main/src/assets/audio/wind.mp3', icon: '🍃' }
    ],
    library: [
        { id: 'keyboard', name: 'Yazı Yazma (Klavye)', src: '/keyboard_custom.mp3', icon: '⌨️' },
        { id: 'page', name: 'Sayfa Çevirme', src: '/page_custom.mp3', icon: '📖' },
        { id: 'white_noise', name: 'Beyaz Gürültü', src: '/white_noise_custom.mp3', icon: '💨' }
    ],
    cafe: [
        { id: 'cup', name: 'Fincan Tıkırtısı', src: 'https://assets.mixkit.co/active_storage/sfx/1701/1701-84.wav', icon: '☕' },
        { id: 'chatter', name: 'Kafe Uğultusu', src: 'https://assets.mixkit.co/active_storage/sfx/2184/2184-84.wav', icon: '👥' },
        { id: 'acoustic_jazz', name: 'Akustik Caz', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', icon: '🎷' }
    ],
    cozy: [
        { id: 'fireplace', name: 'Şömine Çıtırtısı', src: 'https://raw.githubusercontent.com/karthiknvd/noctune/main/src/assets/audio/campfire.mp3', icon: '🔥' },
        { id: 'clock', name: 'Saat Tıkırtısı', src: 'https://assets.mixkit.co/active_storage/sfx/2653/2653-84.wav', icon: '🕰️' },
        { id: 'lofi_beats', name: 'Yumuşak Lofi', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', icon: '🎧' }
    ]
};

const ALL_AUDIO_SOURCES = Object.values(ROOM_AUDIO_SOURCES).flat();

const WORKSPACE_BACKGROUNDS = {
    library: libraryBg,
    cafe: cafeBg,
    cozy: cozyBg,
    nature: natureBg
};

const ENVS_METADATA = {
    library: { name: 'Kütüphane', color: '#10b981', bg: '#f0fdf4', icon: BookOpen },
    cafe: { name: 'Akustik Kafe', color: '#f59e0b', bg: '#fffbeb', icon: Coffee },
    cozy: { name: 'Cozy Room', color: '#ec4899', bg: '#fdf4ff', icon: Home },
    nature: { name: 'Doğa Gezintisi', color: '#06b6d4', bg: '#f0f9ff', icon: Trees }
};

const BUDDY_QUOTES = {
    shiba: [
        "Harika gidiyorsun! Seninle gurur duyuyorum! 🐾",
        "Hadi, son dakikalar! Sence de bir kahve hak etmedik mi? ☕",
        "Pes etmek yok! Kuyruğumu senin için sallıyorum! 🐕",
        "Odaklanma seviyen mükemmel! Böyle devam et! ✨",
        "Küçük bir mola vermeden önce şu hedefleri eritelim! 🎯"
    ],
    panda: [
        "Acele etme, yavaş ve kararlı adımlarla hedefe ulaşacağız. 🎋",
        "Nefes al, omuzlarını gevşet. Sen harika bir iş çıkarıyorsun. ☯️",
        "Bir çay yudumlayıp devam edelim mi? Çok iyi odaklandın. 🍵",
        "Hedefine adım adım yaklaşıyorsun, sakin ve derinden... 🌌",
        "Zihin durgun bir göl gibidir. Sakinliğini koru. 🏔️"
    ],
    kitty: [
        "Miyav! Çok çalışkansın, sana mır mır destek oluyorum! 🐾",
        "Bu konuyu hemen bitirip oyun oynayalım mı? Süpersin! 🧶",
        "Tırnaklarımla hedefleri tek tek eliyorum! Miyav! 😸",
        "Patilerimle yanındayım, derin bir nefes al ve devam et! 💕",
        "Mırrr... Çalışırken seni izlemek çok keyifli! 🐾"
    ]
};

function FocusRoom({ 
    envId, 
    aiTheme, 
    onBack, 
    onAskGeminiMood, 
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
    const meta = ENVS_METADATA[envId] || ENVS_METADATA.library;

    const [activeWidget, setActiveWidget] = useState('timer'); // 'timer' | 'mixer' | 'tasks' | 'ai' | null
    const [groupModeActive, setGroupModeActive] = useState(false);
    const [buddySpeech, setBuddySpeech] = useState('');
    const [aiSplittingTaskId, setAiSplittingTaskId] = useState(null);
    const [tasksOpen, setTasksOpen] = useState(false); // collapsible pinned tasks panel

    const [activeRoomId, setActiveRoomId] = useState(null);
    const [roomMembers, setRoomMembers] = useState([]);
    const [joinInput, setJoinInput] = useState('');
    const [roomLoading, setRoomLoading] = useState(false);
    const [lastLoggedPercent, setLastLoggedPercent] = useState(-1);

    const toggleWidget = (widgetId) => {
        setActiveWidget(prev => prev === widgetId ? null : widgetId);
    };

    // Preset times getter based on mood
    const getPresetTimes = useCallback((mood) => {
        if (mood === 'full') {
            return { focus: 50, short: 10, long: 20 };
        } else if (mood === 'tired') {
            return { focus: 15, short: 5, long: 10 };
        } else {
            // distracted / default
            return { focus: 25, short: 5, long: 15 };
        }
    }, []);

    const presets = getPresetTimes(userMood);

    // Resolve theme parameters (use dynamic AI theme if matches, otherwise default env theme)
    const [theme, setTheme] = useState({
        backgroundColor: meta.bg,
        textColor: '#1e293b',
        accentColor: meta.color,
        ambientName: meta.name,
        aiMessage: aiTheme ? aiTheme.aiMessage : 'Merhaba! Bu çalışma odasında seninle birlikteyim. Odaklanmanı artırmak için pomodoro sayacını başlatabilir, ambient sesleri miksleyebilir veya bana ruh halini yazarak odayı kişiselleştirebilirsin.'
    });

    useEffect(() => {
        if (aiTheme) {
            setTheme(prev => ({
                ...prev,
                backgroundColor: aiTheme.backgroundColor || meta.bg,
                textColor: aiTheme.textColor || '#1e293b',
                accentColor: aiTheme.accentColor || meta.color,
                ambientName: aiTheme.ambientName || meta.name,
                aiMessage: aiTheme.aiMessage
            }));
        }
    }, [aiTheme, envId, meta]);

    // Update global background style
    useEffect(() => {
        const body = document.body;
        body.style.transition = 'background-color 1s ease';
        body.style.backgroundColor = theme.backgroundColor;
        
        // Setup background blobs color
        const blobs = document.querySelectorAll('.blob');
        blobs.forEach((blob, idx) => {
            if (idx === 0) blob.style.backgroundColor = theme.accentColor;
            else if (idx === 1) blob.style.backgroundColor = '#8b5cf6'; // default second color
            else blob.style.backgroundColor = theme.backgroundColor;
        });

        return () => {
            body.style.backgroundColor = '';
        };
    }, [theme.backgroundColor, theme.accentColor]);

    // --- SOUND MIXER ---
    const [mixer, setMixer] = useState(() => {
        const state = {};
        ALL_AUDIO_SOURCES.forEach(source => {
            state[source.id] = { playing: false, volume: 0.5 };
        });
        return state;
    });
    const audioRefs = useRef({});

    // Setup initial sound depending on room choice
    useEffect(() => {
        // Stop all sounds first on page load
        ALL_AUDIO_SOURCES.forEach(source => {
            if (audioRefs.current[source.id]) {
                audioRefs.current[source.id].pause();
                audioRefs.current[source.id].currentTime = 0;
            }
        });

        const activeSources = ROOM_AUDIO_SOURCES[envId] || ROOM_AUDIO_SOURCES.library;
        const defaultTrackId = activeSources[0]?.id;

        setMixer(prev => {
            const next = {};
            ALL_AUDIO_SOURCES.forEach(source => {
                next[source.id] = {
                    playing: source.id === defaultTrackId,
                    volume: prev[source.id]?.volume ?? 0.5
                };
            });
            return next;
        });
    }, [envId]);

    // Handle audio play/pause updates when mixer state changes
    useEffect(() => {
        Object.keys(mixer).forEach(id => {
            const audioObj = audioRefs.current[id];
            if (audioObj) {
                audioObj.volume = mixer[id].volume;
                if (mixer[id].playing) {
                    audioObj.play().catch(err => console.log('Ses çalma hatası:', err));
                } else {
                    audioObj.pause();
                }
            }
        });
    }, [mixer]);

    // Make sure we stop all audios when component unmounts
    useEffect(() => {
        const audios = audioRefs.current;
        return () => {
            Object.keys(audios).forEach(id => {
                if (audios[id]) {
                    audios[id].pause();
                }
            });
        };
    }, []);

    const toggleTrack = (id) => {
        setMixer(prev => ({
            ...prev,
            [id]: { ...prev[id], playing: !prev[id].playing }
        }));
    };

    const handleVolumeChange = (id, vol) => {
        setMixer(prev => ({
            ...prev,
            [id]: { ...prev[id], volume: parseFloat(vol) }
        }));
    };

    const stopAllSounds = () => {
        setMixer(prev => {
            const next = {};
            Object.keys(prev).forEach(key => {
                next[key] = { ...prev[key], playing: false };
            });
            return next;
        });
    };

    // --- POMODORO TIMER ---
    const [timerMode, setTimerMode] = useState('focus'); // focus | short | long
    const [minutes, setMinutes] = useState(presets.focus);
    const [seconds, setSeconds] = useState(0);
    const [isTimerActive, setIsTimerActive] = useState(false);
    const timerInterval = useRef(null);

    const changeTimerMode = useCallback((mode) => {
        setIsTimerActive(false);
        if (timerInterval.current) clearInterval(timerInterval.current);
        setTimerMode(mode);
        setMinutes(presets[mode]);
        setSeconds(0);
    }, [presets]);

    const logFocusSession = useCallback(async () => {
        if (!user?.id) return;
        try {
            const duration = presets.focus || 25;
            const { error } = await supabase
                .from('focus_sessions')
                .insert({
                    user_id: user.id,
                    env_id: envId,
                    duration_minutes: duration
                });
            if (error) throw error;
            console.log("Odaklanma seansı başarıyla kaydedildi!");
        } catch (err) {
            console.error("Odaklanma seansı kaydedilirken hata:", err.message);
        }
    }, [presets.focus, envId, user?.id]);

    useEffect(() => {
        setMinutes(presets.focus);
        setSeconds(0);
        setTimerMode('focus');
    }, [userMood, presets.focus]);

    useEffect(() => {
        if (isTimerActive) {
            timerInterval.current = setInterval(() => {
                setSeconds(prevSecs => {
                    if (prevSecs === 0) {
                        if (minutes === 0) {
                            clearInterval(timerInterval.current);
                            setIsTimerActive(false);
                            if (timerMode === 'focus') {
                                logFocusSession();
                            }
                            alert(timerMode === 'focus' ? 'Tebrikler! Odaklanma seansı bitti. Harika bir mola hak ettin.' : 'Mola bitti! Yeni bir odaklanma seansına başlamaya hazır mısın?');
                            changeTimerMode('focus');
                            return 0;
                        }
                        setMinutes(prevMins => prevMins - 1);
                        return 59;
                    }
                    return prevSecs - 1;
                });
            }, 1000);
        } else {
            if (timerInterval.current) clearInterval(timerInterval.current);
        }

        return () => {
            if (timerInterval.current) clearInterval(timerInterval.current);
        };
    }, [isTimerActive, minutes, timerMode, changeTimerMode, logFocusSession]);

    const toggleTimer = () => {
        setIsTimerActive(!isTimerActive);
    };

    const resetTimer = () => {
        setIsTimerActive(false);
        if (timerInterval.current) clearInterval(timerInterval.current);
        setMinutes(presets[timerMode]);
        setSeconds(0);
    };

    // Circular SVG Progress calculation
    const totalDurationSeconds = presets[timerMode] * 60;
    const currentRemainingSeconds = minutes * 60 + seconds;
    const progressPercent = totalDurationSeconds > 0 
        ? ((totalDurationSeconds - currentRemainingSeconds) / totalDurationSeconds) * 100 
        : 0;
    const circleRadius = 110;
    const strokeCircumference = 2 * Math.PI * circleRadius;
    const strokeDashoffset = strokeCircumference - (progressPercent / 100) * strokeCircumference;

    // --- TODO TASK LIST ---
    const [tasks, setTasks] = useState([]);
    const [newTaskText, setNewTaskText] = useState('');
    const [tasksLoading, setTasksLoading] = useState(false);

    useEffect(() => {
        const fetchTasks = async () => {
            setTasksLoading(true);
            try {
                const { data, error } = await supabase
                    .from('tasks')
                    .select('*')
                    .eq('env_id', envId)
                    .order('created_at', { ascending: true });
                if (error) throw error;
                setTasks(data || []);
            } catch (err) {
                console.error("Görevler yüklenirken hata:", err);
            } finally {
                setTasksLoading(false);
            }
        };

        if (user) {
            fetchTasks();
        }
    }, [envId, user]);

    const handleAddTask = async (e) => {
        e.preventDefault();
        if (!newTaskText.trim()) return;

        const newTempId = 'temp-' + Date.now();
        const newTaskObj = {
            text: newTaskText.trim(),
            completed: false,
            env_id: envId,
            user_id: user?.id
        };

        // Optimistic UI update
        setTasks(prev => [...prev, { id: newTempId, ...newTaskObj }]);
        setNewTaskText('');

        try {
            const { data, error } = await supabase
                .from('tasks')
                .insert(newTaskObj);
            if (error) throw error;

            if (data && data[0]) {
                setTasks(prev => prev.map(t => t.id === newTempId ? data[0] : t));
            } else {
                // If data is not returned, just refetch
                const { data: refetched } = await supabase
                    .from('tasks')
                    .select('*')
                    .eq('env_id', envId)
                    .order('created_at', { ascending: true });
                if (refetched) setTasks(refetched);
            }
        } catch (err) {
            console.error("Görev eklenirken hata:", err);
            setTasks(prev => prev.filter(t => t.id !== newTempId));
            alert("Görev eklenirken bir hata oluştu.");
        }
    };

    const toggleTaskCompleted = async (taskId) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const newCompletedVal = !task.completed;

        // Optimistic UI update
        setTasks(prev => prev.map(t => {
            if (t.id === taskId) {
                if (!t.completed && buddyActive) {
                    const kittyMsg = "Harika! Bir görevi daha patiledik! 🐾😻";
                    const shibaMsg = "Süpersin! Bir odak hedefini daha tamamladık! Çak bir pati! 🐾🐶";
                    const pandaMsg = "Tebrikler. Hedefini tamamladın, huzurla bir sonrakine geçebilirsin. 🎋🐼";
                    setBuddySpeech(buddyType === 'shiba' ? shibaMsg : buddyType === 'panda' ? pandaMsg : kittyMsg);
                }
                return { ...t, completed: newCompletedVal };
            }
            return t;
        }));

        try {
            const { error } = await supabase
                .from('tasks')
                .update({ completed: newCompletedVal })
                .eq('id', taskId);
            if (error) throw error;
        } catch (err) {
            console.error("Görev güncellenirken hata:", err);
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !newCompletedVal } : t));
        }
    };

    const deleteTask = async (taskId) => {
        // Optimistic UI update
        setTasks(prev => prev.filter(task => task.id !== taskId));

        try {
            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', taskId);
            if (error) throw error;
        } catch (err) {
            console.error("Görev silinirken hata:", err);
            alert("Görev silinirken bir hata oluştu.");
        }
    };

    // --- GEMINI TASK DISTRIBUTOR (3 Alt Adıma Böl) ---
    const splitTaskWithAI = async (taskObj) => {
        if (aiSplittingTaskId) return;
        setAiSplittingTaskId(taskObj.id);
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const prompt = `
Kullanıcı "${userMood === 'tired' ? 'Çok Yorgun' : userMood === 'distracted' ? 'Dağınık Zihin' : 'Yüksek Enerji'}" modunda çalışıyor.
Şu hedefi başarmak istiyor: "${taskObj.text}".
Bu hedefi, bu zihinsel durumuna uygun olacak şekilde, son derece net, küçük ve kolayca başlanabilir 3 mikro adıma böl. 
Açıklama veya kod bloğu olmadan SADECE geçerli bir Türkçe JSON dizisi olarak döndür. Format:
[
  "Adım 1: ...",
  "Adım 2: ...",
  "Adım 3: ..."
]
`;
            const result = await model.generateContent(prompt);
            const responseText = result.response.text();
            const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const steps = JSON.parse(cleanJson);
            
            if (Array.isArray(steps) && steps.length > 0) {
                const stepObjs = steps.map(stepText => ({
                    text: `↳ ${stepText}`,
                    completed: false,
                    env_id: envId,
                    user_id: user?.id
                }));
                
                try {
                    const { data, error } = await supabase
                        .from('tasks')
                        .insert(stepObjs);
                    if (error) throw error;
                    
                    if (data) {
                        setTasks(prev => {
                            const idx = prev.findIndex(t => t.id === taskObj.id);
                            if (idx === -1) return [...prev, ...data];
                            const next = [...prev];
                            next.splice(idx + 1, 0, ...data);
                            return next;
                        });
                    } else {
                        // Refetch to sync correctly
                        const { data: refetched } = await supabase
                            .from('tasks')
                            .select('*')
                            .eq('env_id', envId)
                            .order('created_at', { ascending: true });
                        if (refetched) setTasks(refetched);
                    }
                } catch (err) {
                    console.error("Alt görevler kaydedilirken hata:", err);
                }
            }
        } catch (error) {
            console.error("Yapay zeka task bölme hatası:", error);
            alert("Alt adımlar oluşturulurken bir hata oluştu.");
        } finally {
            setAiSplittingTaskId(null);
        }
    };

    // --- FOCUS BUDDY COMPANION SPEECH ---
    const [moodInput, setMoodInput] = useState('');

    useEffect(() => {
        if (!buddyActive) return;
        const quotes = BUDDY_QUOTES[buddyType] || BUDDY_QUOTES.shiba;
        setBuddySpeech(quotes[Math.floor(Math.random() * quotes.length)]);
        
        const interval = setInterval(() => {
            setBuddySpeech(quotes[Math.floor(Math.random() * quotes.length)]);
        }, 30000); // every 30s
        
        return () => clearInterval(interval);
    }, [buddyActive, buddyType]);

    useEffect(() => {
        if (!buddyActive) return;
        const isFocus = timerMode === 'focus';
        
        if (isTimerActive) {
            if (isFocus) {
                setBuddySpeech(
                    buddyType === 'shiba' ? "Harika! Odaklanma başladı, hedefleri alt edelim! 🚀🐾" :
                    buddyType === 'panda' ? "Çalışma seansı başladı. Sakin ve derin nefes alarak odaklan. 🎋" :
                    "Miyav! Süre başladı, patilerimle yanındayım! 🐾✨"
                );
            } else {
                setBuddySpeech(
                    buddyType === 'shiba' ? "Mola başladı! Güzel bir esneme ve kahve zamanı! ☕🐾" :
                    buddyType === 'panda' ? "Dinlenme vakti. Zihnini serbest bırak ve rahatla. 🍵" :
                    "Mırrr... Dinlenme saati! Biraz gerinelim mi? 🐾🧶"
                );
            }
        }
    }, [isTimerActive, timerMode, buddyActive, buddyType]);

    const triggerBuddyInteraction = () => {
        const quotes = BUDDY_QUOTES[buddyType] || BUDDY_QUOTES.shiba;
        setBuddySpeech(quotes[Math.floor(Math.random() * quotes.length)]);
    };

    // --- MULTIPLAYER AURA ROOM METHODS ---
    const generateRoomId = () => {
        return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
    };

    const createAuraRoom = async () => {
        if (!user) return;
        setRoomLoading(true);
        const newRoomId = generateRoomId();
        try {
            // Create the room
            const { error: roomErr } = await supabase
                .from('aura_rooms')
                .insert({
                    id: newRoomId,
                    created_by: user.id,
                    env_id: envId
                });
            if (roomErr) throw roomErr;

            // Join the room as first member
            const { error: memberErr } = await supabase
                .from('aura_room_members')
                .insert({
                    room_id: newRoomId,
                    user_id: user.id,
                    email: user.email,
                    focus_percent: Math.round(progressPercent)
                });
            if (memberErr) throw memberErr;

            setActiveRoomId(newRoomId);
            setLastLoggedPercent(Math.round(progressPercent));
        } catch (err) {
            console.error("Room creation error:", err);
            alert("Oda oluşturulurken bir hata oluştu: " + err.message);
        } finally {
            setRoomLoading(false);
        }
    };

    const joinAuraRoom = async (e) => {
        if (e) e.preventDefault();
        const code = joinInput.trim();
        if (!code || code.length !== 6 || !user) {
            alert("Lütfen geçerli 6 haneli bir oda kodu girin.");
            return;
        }

        setRoomLoading(true);
        try {
            // Check if room exists
            const { data: room, error: roomCheckErr } = await supabase
                .from('aura_rooms')
                .select('*')
                .eq('id', code)
                .single();

            if (roomCheckErr || !room) {
                alert("Girdiğiniz oda bulunamadı. Lütfen kodu kontrol edin.");
                setRoomLoading(false);
                return;
            }

            // Join the room (upsert)
            const { error: joinErr } = await supabase
                .from('aura_room_members')
                .upsert({
                    room_id: code,
                    user_id: user.id,
                    email: user.email,
                    focus_percent: Math.round(progressPercent),
                    last_active_at: new Date().toISOString()
                }, { onConflict: 'room_id,user_id' });

            if (joinErr) throw joinErr;

            setActiveRoomId(code);
            setJoinInput('');
            setLastLoggedPercent(Math.round(progressPercent));
        } catch (err) {
            console.error("Room join error:", err);
            alert("Odaya katılırken bir hata oluştu: " + err.message);
        } finally {
            setRoomLoading(false);
        }
    };

    const leaveAuraRoom = async () => {
        if (!activeRoomId || !user) return;
        setRoomLoading(true);
        try {
            // Delete from members
            await supabase
                .from('aura_room_members')
                .delete()
                .eq('room_id', activeRoomId)
                .eq('user_id', user.id);

            // Check if there are any members left in this room
            const { data: remaining } = await supabase
                .from('aura_room_members')
                .select('id')
                .eq('room_id', activeRoomId);

            if (!remaining || remaining.length === 0) {
                // Delete the room if empty
                await supabase
                    .from('aura_rooms')
                    .delete()
                    .eq('id', activeRoomId);
            }

            setActiveRoomId(null);
            setRoomMembers([]);
        } catch (err) {
            console.error("Room leave error:", err);
        } finally {
            setRoomLoading(false);
        }
    };

    // --- REALTIME SUBSCRIPTION FOR MEMBERS ---
    useEffect(() => {
        if (!activeRoomId || !user) return;

        console.log(`Setting up subscription for room ${activeRoomId} as user ${user.email} (${user.id})`);

        // Fetch initial members
        const fetchMembers = async () => {
            try {
                const { data, error } = await supabase
                    .from('aura_room_members')
                    .select('*')
                    .eq('room_id', activeRoomId);
                if (error) throw error;
                console.log(`Fetched initial room members for room ${activeRoomId}:`, data);
                setRoomMembers(data || []);
            } catch (err) {
                console.error("Error fetching room members:", err);
            }
        };

        fetchMembers();

        // Subscribe to changes in aura_room_members with a unique channel ID to prevent StrictMode re-mount subscription conflicts
        const uniqueChannelId = `room_${activeRoomId}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        console.log(`Creating Supabase Realtime channel: ${uniqueChannelId}`);
        
        const channel = supabase
            .channel(uniqueChannelId)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'aura_room_members'
                },
                (payload) => {
                    const { eventType, new: newRow, old: oldRow } = payload;
                    console.log(`Realtime event received (${eventType}) on channel ${uniqueChannelId}:`, payload);
                    
                    setRoomMembers(prev => {
                        if (eventType === 'INSERT') {
                            if (String(newRow.room_id) !== String(activeRoomId)) return prev;
                            if (prev.some(m => m.user_id === newRow.user_id)) {
                                return prev.map(m => m.user_id === newRow.user_id ? newRow : m);
                            }
                            return [...prev, newRow];
                        }
                        if (eventType === 'UPDATE') {
                            if (String(newRow.room_id) !== String(activeRoomId)) {
                                // If the user was in this room but is now in another room, remove them from this room
                                return prev.filter(m => m.user_id !== newRow.user_id);
                            }
                            if (!prev.some(m => m.user_id === newRow.user_id)) {
                                return [...prev, newRow];
                            }
                            return prev.map(m => m.user_id === newRow.user_id ? newRow : m);
                        }
                        if (eventType === 'DELETE') {
                            const deleteId = oldRow.id;
                            // If we don't have id in oldRow, we might need to filter by user_id if we can find it
                            return prev.filter(m => m.id !== deleteId);
                        }
                        return prev;
                    });
                }
            );

        channel.subscribe((status, err) => {
            console.log(`Supabase Realtime subscription status for channel ${uniqueChannelId}:`, status);
            if (err) {
                console.error(`Supabase Realtime subscription error for channel ${uniqueChannelId}:`, err);
            }
        });

        // Heartbeat interval to update last_active_at in DB every 30 seconds
        const heartbeatInterval = setInterval(() => {
            supabase
                .from('aura_room_members')
                .update({ last_active_at: new Date().toISOString() })
                .eq('room_id', activeRoomId)
                .eq('user_id', user.id)
                .then(({ error }) => {
                    if (error) console.error("Heartbeat update error:", error);
                });
        }, 30000);

        // Interval to filter out inactive users on UI (older than 10 minutes last_active_at)
        // Increased from 2 minutes to 10 minutes to prevent background tab throttling and clock skew from causing premature filter outs
        const filterInterval = setInterval(() => {
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
            setRoomMembers(prev => prev.filter(m => {
                if (m.user_id === user.id) return true;
                const lastActive = new Date(m.last_active_at);
                return lastActive > tenMinutesAgo;
            }));
        }, 15000);

        return () => {
            console.log(`Cleaning up subscription for channel ${uniqueChannelId}`);
            supabase.removeChannel(channel);
            clearInterval(heartbeatInterval);
            clearInterval(filterInterval);
        };
    }, [activeRoomId, user]);

    // Cleanup room membership on unmount (stable ref based to run ONLY when component unmounts)
    const unmountRoomIdRef = useRef(null);
    const unmountUserRef = useRef(null);

    useEffect(() => {
        unmountRoomIdRef.current = activeRoomId;
    }, [activeRoomId]);

    useEffect(() => {
        unmountUserRef.current = user;
    }, [user]);

    useEffect(() => {
        return () => {
            const roomId = unmountRoomIdRef.current;
            const u = unmountUserRef.current;
            if (roomId && u) {
                // Delete from DB (fire-and-forget)
                supabase
                    .from('aura_room_members')
                    .delete()
                    .eq('room_id', roomId)
                    .eq('user_id', u.id)
                    .then(() => {
                        // Clean up empty rooms
                        supabase
                            .from('aura_room_members')
                            .select('id')
                            .eq('room_id', roomId)
                            .then(({ data }) => {
                                if (!data || data.length === 0) {
                                    supabase
                                        .from('aura_rooms')
                                        .delete()
                                        .eq('id', roomId);
                                }
                            });
                    });
            }
        };
    }, []); // Empty dependencies array: runs only on unmount!

    // Track focus percent changes and update in DB (throttled by rounded percent values)
    useEffect(() => {
        const rounded = Math.round(progressPercent);
        if (activeRoomId && user && rounded !== lastLoggedPercent) {
            supabase
                .from('aura_room_members')
                .update({ focus_percent: rounded, last_active_at: new Date().toISOString() })
                .eq('room_id', activeRoomId)
                .eq('user_id', user.id)
                .then(({ error }) => {
                    if (error) console.error("Error updating focus status:", error);
                    else setLastLoggedPercent(rounded);
                });
        }
    }, [progressPercent, activeRoomId, user, lastLoggedPercent]);

    const handleAskAIInRoom = (e) => {
        e.preventDefault();
        if (!moodInput.trim() || aiLoading) return;
        onAskGeminiMood(moodInput);
        setMoodInput('');
    };

    return (
        <div className="workspace-wrapper">
            {/* Audio Tags */}
            {ALL_AUDIO_SOURCES.map(source => (
                <audio
                    key={source.id}
                    ref={el => audioRefs.current[source.id] = el}
                    src={source.src}
                    loop
                />
            ))}

            {/* Fullscreen Custom Illustration Background */}
            <div className="video-bg-container">
                <img
                    src={WORKSPACE_BACKGROUNDS[envId] || libraryBg}
                    alt={`${theme.ambientName} Arka Planı`}
                    className="video-bg-iframe"
                    style={{ objectFit: 'cover', width: '100%', height: '100%', pointerEvents: 'none' }}
                />
                
                {/* Breathing Sunlight Ray Overlay */}
                <div className="light-ray-overlay" />

                {/* Floating Dust Particles */}
                <div className="dust-particles-container">
                    {Array.from({ length: 15 }).map((_, i) => {
                        const size = Math.random() * 4 + 2; // 2px to 6px
                        const left = Math.random() * 100; // 0% to 100%
                        const duration = Math.random() * 10 + 8; // 8s to 18s
                        const delay = Math.random() * 6; // 0s to 6s
                        const opacity = Math.random() * 0.35 + 0.15; // 15% to 50%
                        return (
                            <div
                                key={`dust-${i}`}
                                className="dust-particle"
                                style={{
                                    left: `${left}%`,
                                    width: `${size}px`,
                                    height: `${size}px`,
                                    animationDuration: `${duration}s`,
                                    animationDelay: `${delay}s`,
                                    opacity: opacity,
                                }}
                            />
                        );
                    })}
                </div>

                <div className="video-overlay" style={{ backgroundColor: `${theme.backgroundColor}55` }} />
            </div>

            {/* Top Workspace Header Bar */}
            <div className="top-header-bar" style={styles.topHeaderBar}>
                <div className="workspace-badge-wrapper" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    background: 'rgba(255, 255, 255, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                    boxShadow: '0 8px 32px rgba(120, 110, 90, 0.08)',
                    pointerEvents: 'auto'
                }}>
                    <div className="room-active-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: theme.accentColor, boxShadow: `0 0 10px ${theme.accentColor}` }}></div>
                    <span style={{ fontWeight: '700', fontSize: '14px', color: '#1e293b' }}>{theme.ambientName}</span>

                    {/* Floating Mini Timer when the main timer panel is collapsed/closed */}
                    {(!activeWidget || activeWidget !== 'timer') && (
                        <>
                            <div style={{ width: '1px', height: '14px', background: 'rgba(0,0,0,0.08)' }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: theme.accentColor, fontWeight: '700', fontSize: '14px', fontFamily: 'monospace' }}>
                                <Clock size={14} style={{ animation: isTimerActive ? 'pulse-slow 2s infinite ease-in-out' : 'none' }} />
                                <span>{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
                            </div>
                        </>
                    )}
                </div>

                <div className="header-right-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px', pointerEvents: 'auto' }}>
                    <div className="mode-toggle-pill" style={styles.modeTogglePill}>
                        <button
                            onClick={() => setGroupModeActive(false)}
                            style={{
                                ...styles.modeToggleBtn,
                                backgroundColor: !groupModeActive ? '#ffffff' : 'transparent',
                                color: !groupModeActive ? '#1e293b' : '#64748b',
                                boxShadow: !groupModeActive ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                                fontWeight: '700',
                                fontSize: '12px',
                            }}
                        >
                            👤 Solo Çalışma
                        </button>
                        <button
                            onClick={() => setGroupModeActive(true)}
                            style={{
                                ...styles.modeToggleBtn,
                                backgroundColor: groupModeActive ? '#ffffff' : 'transparent',
                                color: groupModeActive ? '#1e293b' : '#64748b',
                                boxShadow: groupModeActive ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                                fontWeight: '700',
                                fontSize: '12px',
                            }}
                        >
                            ✨ Aura Room
                        </button>
                    </div>

                    <div className="user-info-pill" style={styles.userInfoPill}>
                        <span className="user-email-text" style={styles.userEmail} title={user?.email}>
                            {user?.email ? (user.email.length > 15 ? user.email.substring(0, 12) + '...' : user.email) : 'Misafir'}
                        </span>
                        <button 
                            onClick={onSignOut}
                            style={styles.signOutIconBtn}
                            title="Çıkış Yap"
                        >
                            🚪
                        </button>
                    </div>
                </div>
            </div>

            {/* ── PINNED TASKS PANEL (Top-Left, below room badge) ── */}
            <div className="pinned-tasks-wrapper" style={styles.pinnedTasksWrapper}>
                <button
                    onClick={() => setTasksOpen(prev => !prev)}
                    style={{
                        ...styles.pinnedTasksToggle,
                        borderColor: tasksOpen ? `${theme.accentColor}40` : 'rgba(255,255,255,0.5)',
                    }}
                >
                    <ListTodo size={15} style={{ color: theme.accentColor }} />
                    <span style={{ fontWeight: '700', fontSize: '13px', color: '#1e293b' }}>Odak Hedeflerim</span>
                    <span style={{
                        ...styles.pinnedTasksBadge,
                        backgroundColor: `${theme.accentColor}18`,
                        color: theme.accentColor,
                    }}>
                        {tasks.filter(t => t.completed).length}/{tasks.length}
                    </span>
                    <span style={{
                        display: 'inline-block',
                        transition: 'transform 0.3s ease',
                        transform: tasksOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        fontSize: '12px',
                        color: '#94a3b8',
                        marginLeft: 'auto',
                    }}>▼</span>
                </button>

                {tasksOpen && (
                    <div style={styles.pinnedTasksBody}>
                        <form onSubmit={handleAddTask} style={styles.pinnedTaskForm}>
                            <input
                                type="text"
                                value={newTaskText}
                                onChange={(e) => setNewTaskText(e.target.value)}
                                placeholder="Yeni hedef ekle..."
                                style={styles.pinnedTaskInput}
                            />
                            <button type="submit" style={{ ...styles.pinnedTaskAddBtn, backgroundColor: theme.accentColor }}>
                                <Plus size={16} style={{ color: '#fff' }} />
                            </button>
                        </form>

                        <div style={styles.pinnedTaskList}>
                            {tasksLoading ? (
                                <p style={styles.pinnedTaskEmpty}>Yükleniyor...</p>
                            ) : tasks.length === 0 ? (
                                <p style={styles.pinnedTaskEmpty}>Henüz hedef eklenmedi.</p>
                            ) : (
                                tasks.map(task => (
                                    <div key={task.id} style={styles.pinnedTaskItem}>
                                        <button
                                            onClick={() => toggleTaskCompleted(task.id)}
                                            style={{
                                                ...styles.pinnedTaskCheck,
                                                borderColor: task.completed ? theme.accentColor : 'rgba(0,0,0,0.15)',
                                                backgroundColor: task.completed ? theme.accentColor : 'transparent',
                                            }}
                                        >
                                            {task.completed && <Check size={10} style={{ color: '#fff' }} />}
                                        </button>
                                        <span style={{
                                            flex: 1,
                                            fontSize: '12px',
                                            fontWeight: '500',
                                            color: task.completed ? '#94a3b8' : '#1e293b',
                                            textDecoration: task.completed ? 'line-through' : 'none',
                                            lineHeight: '1.3',
                                            paddingLeft: task.text.startsWith('↳') ? '6px' : '0',
                                        }}>
                                            {task.text}
                                        </span>
                                        {!task.text.startsWith('↳') && (
                                            <button
                                                onClick={() => splitTaskWithAI(task)}
                                                disabled={aiSplittingTaskId === task.id}
                                                style={styles.pinnedTaskMiniBtn}
                                                title="AI ile böl"
                                            >
                                                {aiSplittingTaskId === task.id ? '⏳' : <Sparkles size={11} style={{ color: theme.accentColor }} />}
                                            </button>
                                        )}
                                        <button onClick={() => deleteTask(task.id)} style={styles.pinnedTaskMiniBtn}>
                                            <Trash2 size={12} style={{ color: '#cbd5e1' }} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Aura Room Desk */}
            {groupModeActive && (
                <div style={styles.auraRoomDesk} className="glass-panel aura-room-desk">
                    {activeRoomId === null ? (
                        /* Room Lobby - Horizontal Layout */
                        <div className="aura-lobby-container" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '24px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1', minWidth: '250px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={styles.livePulseDot}></div>
                                    <span style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>Aura Odası - Grup Odaklanma</span>
                                </div>
                                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                                    Arkadaşlarınızla birlikte çalışmak için bir odaya katılın veya yeni bir oda oluşturun.
                                </p>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                <form onSubmit={joinAuraRoom} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        value={joinInput}
                                        onChange={(e) => setJoinInput(e.target.value.replace(/\D/g, ''))}
                                        placeholder="6 Haneli Oda Kodu"
                                        style={{
                                            width: '160px',
                                            background: 'rgba(0,0,0,0.02)',
                                            border: '1px solid rgba(0,0,0,0.08)',
                                            borderRadius: '12px',
                                            padding: '10px 14px',
                                            fontSize: '13px',
                                            color: '#1e293b',
                                            outline: 'none',
                                            fontFamily: 'var(--font-body)',
                                            textAlign: 'center',
                                            letterSpacing: '0.1em',
                                            fontWeight: '700'
                                        }}
                                        disabled={roomLoading}
                                    />
                                    <button 
                                        type="submit" 
                                        disabled={roomLoading || joinInput.length !== 6}
                                        style={{
                                            border: 'none',
                                            borderRadius: '12px',
                                            padding: '10px 16px',
                                            fontWeight: '700',
                                            fontSize: '13px',
                                            color: '#ffffff',
                                            backgroundColor: theme.accentColor,
                                            cursor: roomLoading || joinInput.length !== 6 ? 'not-allowed' : 'pointer',
                                            opacity: roomLoading || joinInput.length !== 6 ? 0.6 : 1,
                                            transition: 'all 0.3s ease'
                                        }}
                                    >
                                        Odaya Katıl
                                    </button>
                                </form>
                                
                                <span style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8' }}>VEYA</span>
                                
                                <button
                                    onClick={createAuraRoom}
                                    disabled={roomLoading}
                                    style={{
                                        border: '1px dashed ' + theme.accentColor,
                                        borderRadius: '12px',
                                        padding: '10px 18px',
                                        fontWeight: '700',
                                        fontSize: '13px',
                                        color: theme.accentColor,
                                        backgroundColor: 'transparent',
                                        cursor: roomLoading ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    ➕ {roomLoading ? 'Hazırlanıyor...' : 'Yeni Oda Oluştur'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Active Room view - Horizontal Layout */
                        <div className="aura-active-container" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '24px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '220px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={styles.livePulseDot}></div>
                                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>
                                        Aura Odası: <span style={{ fontFamily: 'monospace', color: theme.accentColor, fontSize: '14px', letterSpacing: '0.05em' }}>{activeRoomId}</span>
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(activeRoomId);
                                            alert("Oda kodu panoya kopyalandı!");
                                        }}
                                        style={{
                                            border: 'none',
                                            background: 'rgba(0,0,0,0.04)',
                                            color: '#64748b',
                                            padding: '6px 10px',
                                            borderRadius: '8px',
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        📋 Kodu Kopyala
                                    </button>
                                    <button
                                        onClick={leaveAuraRoom}
                                        style={{
                                            border: 'none',
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            color: '#ef4444',
                                            padding: '6px 10px',
                                            borderRadius: '8px',
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        🚪 Ayrıl
                                    </button>
                                </div>
                            </div>
                            
                            {/* Horizontal scrolling list of peers */}
                            <div className="peer-scrolling-container" style={{
                                display: 'flex',
                                flexDirection: 'row',
                                gap: '12px',
                                overflowX: 'auto',
                                flexGrow: 1,
                                justifyContent: 'flex-start',
                                padding: '4px 0',
                                WebkitOverflowScrolling: 'touch'
                            }}>
                                {roomMembers.map((member, idx) => {
                                    const isSelf = member.user_id === user?.id;
                                    const displayName = isSelf 
                                        ? 'Sen' 
                                        : (member.email.split('@')[0]);
                                    
                                    const avatars = ['🧑‍💻', '🦊', '🐨', '🐱', '🐼', '🐸', '🦁'];
                                    const avatar = isSelf ? '🧑‍💻' : avatars[idx % avatars.length];

                                    return (
                                        <div key={member.id || member.user_id} style={styles.peerCard}>
                                            <div style={styles.peerAvatarCircle}>{avatar}</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flexGrow: 1, minWidth: 0 }}>
                                                <span style={{
                                                    ...styles.peerName,
                                                    color: isSelf ? theme.accentColor : '#1e293b',
                                                    fontWeight: isSelf ? '800' : '700'
                                                }} title={member.email}>
                                                    {displayName}
                                                </span>
                                                <div style={styles.auraBarWrapper}>
                                                    <div 
                                                        className="aura-active-bar" 
                                                        style={{ 
                                                            ...styles.auraBarProgress, 
                                                            width: `${member.focus_percent}%`, 
                                                            backgroundColor: isSelf ? theme.accentColor : '#8b5cf6' 
                                                        }}
                                                    />
                                                </div>
                                                <span style={styles.peerStatus}>%{member.focus_percent} Odak</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Focus Buddy Bubble */}
            {buddyActive && !groupModeActive && (
                <div style={styles.buddyContainer} className="buddy-avatar-anim">
                    {/* Speech bubble */}
                    {buddySpeech && (
                        <div style={styles.buddySpeechBubble}>
                            <span style={{ fontSize: '13px', fontWeight: '500', color: '#1e293b' }}>{buddySpeech}</span>
                            <div style={styles.speechBubbleArrow}></div>
                        </div>
                    )}
                    
                    {/* Avatar emoji circle */}
                    <div 
                        style={{
                            ...styles.buddyAvatarCircle,
                            borderColor: theme.accentColor,
                            boxShadow: `0 8px 30px ${theme.accentColor}25`,
                        }}
                        onClick={triggerBuddyInteraction}
                    >
                        <span style={{ fontSize: '40px' }}>
                            {buddyType === 'shiba' ? '🐶' : buddyType === 'panda' ? '🐼' : '🐱'}
                        </span>
                        <div style={{ ...styles.buddyBadge, backgroundColor: theme.accentColor }}>
                            {buddyType === 'shiba' ? 'Shiba' : buddyType === 'panda' ? 'Panda' : 'Kitty'}
                        </div>
                    </div>
                </div>
            )}

            {/* Dynamic Active Widget Card (Floating next to dock) */}
            {activeWidget && (
                <div className="active-widget-panel">
                    <div className="panel-close-header">
                        <button onClick={() => setActiveWidget(null)} className="panel-close-btn">
                            <X size={18} />
                        </button>
                    </div>

                    <div style={{ padding: '0 24px 24px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {activeWidget === 'timer' && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                <div style={styles.timerPresets}>
                                    {['focus', 'short', 'long'].map(mode => (
                                        <button
                                            key={mode}
                                            onClick={() => changeTimerMode(mode)}
                                            style={{
                                                ...styles.presetBtn,
                                                backgroundColor: timerMode === mode ? 'rgba(0,0,0,0.04)' : 'transparent',
                                                color: timerMode === mode ? theme.accentColor : '#64748b',
                                                borderColor: timerMode === mode ? `${theme.accentColor}33` : 'transparent'
                                            }}
                                        >
                                            {mode === 'focus' ? 'Odak' : mode === 'short' ? 'Kısa' : 'Uzun'}
                                        </button>
                                    ))}
                                </div>

                                <div style={styles.timerVisualContainer}>
                                    <svg width="180" height="180" viewBox="0 0 240 240" style={styles.timerSvg}>
                                        <circle
                                            cx="120"
                                            cy="120"
                                            r={circleRadius}
                                            fill="transparent"
                                            stroke="rgba(0, 0, 0, 0.02)"
                                            strokeWidth="8"
                                        />
                                        <circle
                                            cx="120"
                                            cy="120"
                                            r={circleRadius}
                                            fill="transparent"
                                            stroke={theme.accentColor}
                                            strokeWidth="8"
                                            strokeDasharray={strokeCircumference}
                                            strokeDashoffset={strokeDashoffset}
                                            strokeLinecap="round"
                                            style={{ transition: 'stroke-dashoffset 0.3s linear, stroke 1s ease' }}
                                            transform="rotate(-90 120 120)"
                                        />
                                    </svg>
                                    <div style={{ ...styles.timeNumberDisplay, color: '#1e293b' }}>
                                        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                                    </div>
                                </div>

                                <div style={styles.timerControlsRow}>
                                    <button
                                        onClick={toggleTimer}
                                        style={{
                                            ...styles.timerMainBtn,
                                            backgroundColor: isTimerActive ? '#ef4444' : theme.accentColor,
                                            boxShadow: isTimerActive ? '0 4px 15px rgba(239, 68, 68, 0.3)' : `0 4px 20px ${theme.accentColor}33`,
                                            padding: '10px 24px'
                                        }}
                                    >
                                        {isTimerActive ? (
                                            <>
                                                <Square size={14} fill="#ffffff" stroke="none" />
                                                <span>Durdur</span>
                                            </>
                                        ) : (
                                            <>
                                                <Play size={14} fill="#ffffff" stroke="none" />
                                                <span style={{ color: '#ffffff' }}>Başlat</span>
                                            </>
                                        )}
                                    </button>

                                    <button onClick={resetTimer} style={styles.timerResetBtn}>
                                        <RefreshCw size={14} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeWidget === 'mixer' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={styles.widgetHeader}>
                                    <h3 style={styles.widgetTitle}>Ambient Mikser</h3>
                                    <button onClick={stopAllSounds} style={{ ...styles.actionTextBtn, color: theme.accentColor }}>Sustur</button>
                                </div>
                                <p style={styles.widgetSubtitle}>Kendi ideal çalışma müziğinizi yaratın.</p>
                                
                                <div style={styles.mixerList}>
                                    {(ROOM_AUDIO_SOURCES[envId] || ROOM_AUDIO_SOURCES.library).map(source => {
                                        const isPlaying = mixer[source.id]?.playing;
                                        const volume = mixer[source.id]?.volume || 0.5;
                                        return (
                                            <div key={source.id} style={{ ...styles.mixerRow, padding: '8px 12px', borderRadius: '12px', backgroundColor: isPlaying ? 'rgba(0,0,0,0.02)' : 'transparent' }}>
                                                <button 
                                                    onClick={() => toggleTrack(source.id)} 
                                                    style={{ 
                                                        ...styles.soundBtn, 
                                                        width: '36px',
                                                        height: '36px',
                                                        backgroundColor: isPlaying ? theme.accentColor : 'rgba(0,0,0,0.05)',
                                                        color: isPlaying ? '#ffffff' : '#475569'
                                                    }}
                                                >
                                                    <span style={{ fontSize: '16px' }}>{source.icon}</span>
                                                </button>
                                                <div style={styles.sliderContainer}>
                                                    <div style={styles.sliderLabel}>
                                                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>{source.name}</span>
                                                        <span style={{ fontSize: '11px', color: '#64748b' }}>%{Math.round(volume * 100)}</span>
                                                    </div>
                                                    <input 
                                                        type="range" 
                                                        min="0" 
                                                        max="1" 
                                                        step="0.01" 
                                                        value={volume}
                                                        onChange={(e) => handleVolumeChange(source.id, e.target.value)}
                                                        style={{ ...styles.slider, accentColor: theme.accentColor }} 
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {activeWidget === 'tasks' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={styles.widgetHeader}>
                                    <h3 style={styles.widgetTitle}>Odak Hedeflerim</h3>
                                    <span style={{ ...styles.taskBadge, backgroundColor: `${theme.accentColor}15`, color: theme.accentColor }}>
                                        {tasks.filter(t => t.completed).length}/{tasks.length}
                                    </span>
                                </div>
                                
                                <form onSubmit={handleAddTask} style={styles.taskForm}>
                                    <input 
                                        type="text"
                                        value={newTaskText}
                                        onChange={(e) => setNewTaskText(e.target.value)}
                                        placeholder="Yeni bir odak hedefi yaz..."
                                        style={styles.taskInput}
                                    />
                                    <button type="submit" style={{ ...styles.taskAddBtn, backgroundColor: theme.accentColor }}>
                                        <Plus size={18} style={{ color: '#ffffff' }} />
                                    </button>
                                </form>

                                <div style={styles.taskList}>
                                    {tasksLoading ? (
                                        <p style={styles.emptyTaskText}>Yükleniyor...</p>
                                    ) : tasks.length === 0 ? (
                                        <p style={styles.emptyTaskText}>Henüz bir odak hedefi belirlemedin.</p>
                                    ) : (
                                        tasks.map(task => (
                                            <div key={task.id} style={styles.taskItem}>
                                                <button 
                                                    onClick={() => toggleTaskCompleted(task.id)}
                                                    style={{ 
                                                        ...styles.taskCheck, 
                                                        borderColor: task.completed ? theme.accentColor : 'rgba(0,0,0,0.15)',
                                                        backgroundColor: task.completed ? theme.accentColor : 'transparent'
                                                    }}
                                                >
                                                    {task.completed && <Check size={12} style={{ color: '#ffffff' }} />}
                                                </button>
                                                
                                                <span style={{ 
                                                    ...styles.taskText, 
                                                    textDecoration: task.completed ? 'line-through' : 'none',
                                                    color: task.completed ? '#94a3b8' : '#1e293b',
                                                    paddingLeft: task.text.startsWith('↳') ? '8px' : '0'
                                                }}>
                                                    {task.text}
                                                </span>
                                                
                                                {/* Split task with AI button */}
                                                {!task.text.startsWith('↳') && (
                                                    <button 
                                                        onClick={() => splitTaskWithAI(task)}
                                                        disabled={aiSplittingTaskId === task.id}
                                                        style={styles.taskSplitBtn}
                                                        title="Yapay Zeka ile Alt Adımlara Böl"
                                                    >
                                                        {aiSplittingTaskId === task.id ? '⏳' : <Sparkles size={13} style={{ color: theme.accentColor }} />}
                                                    </button>
                                                )}
                                                
                                                <button onClick={() => deleteTask(task.id)} style={styles.taskDeleteBtn}>
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {activeWidget === 'ai' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={styles.widgetHeader}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Sparkles size={18} style={{ color: theme.accentColor }} />
                                        <h3 style={styles.widgetTitle}>Zihin Asistanı</h3>
                                    </div>
                                    {aiLoading && <div className="pulse-dot" style={{ backgroundColor: theme.accentColor }}></div>}
                                </div>

                                <div style={{ ...styles.aiDialogueBox, borderLeftColor: theme.accentColor }}>
                                    {aiLoading ? (
                                        <div style={styles.loadingWrapper}>
                                            <div className="spinner" style={{ borderColor: `${theme.accentColor}33`, borderTopColor: theme.accentColor }}></div>
                                            <p style={{ color: '#64748b', fontSize: '13px' }}>Ortamı tasarlıyorum...</p>
                                        </div>
                                    ) : (
                                        <p style={styles.aiText}>{theme.aiMessage}</p>
                                    )}
                                </div>

                                <form onSubmit={handleAskAIInRoom} style={styles.aiForm}>
                                    <input 
                                        type="text"
                                        value={moodInput}
                                        onChange={(e) => setMoodInput(e.target.value)}
                                        placeholder="Nasıl hissediyorsun?"
                                        style={styles.aiInput}
                                        disabled={aiLoading}
                                    />
                                    <button type="submit" disabled={aiLoading || !moodInput.trim()} style={{ ...styles.aiSubmitBtn, backgroundColor: `${theme.accentColor}1a`, color: theme.accentColor }}>
                                        <Sparkles size={16} />
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── COLLAPSIBLE SIDE TOOLBAR (DOCK) ── */}
            <div className="toolbar-dock">
                {/* 1. Timer Tab */}
                <button
                    onClick={() => toggleWidget('timer')}
                    title="Zamanlayıcı (Pomodoro)"
                    className="dock-icon-btn"
                    style={{
                        color: activeWidget === 'timer' ? theme.accentColor : '#64748b',
                        background: activeWidget === 'timer' ? 'rgba(0,0,0,0.04)' : 'transparent',
                    }}
                >
                    <Clock size={20} />
                </button>

                {/* 2. Soundboard Mixer Tab */}
                <button
                    onClick={() => toggleWidget('mixer')}
                    title="Ambient Mikser"
                    className="dock-icon-btn"
                    style={{
                        color: activeWidget === 'mixer' ? theme.accentColor : '#64748b',
                        background: activeWidget === 'mixer' ? 'rgba(0,0,0,0.04)' : 'transparent',
                    }}
                >
                    <Volume2 size={20} />
                </button>

                {/* 3. Tasks Tab */}
                <button
                    onClick={() => toggleWidget('tasks')}
                    title="Odak Hedefleri"
                    className="dock-icon-btn"
                    style={{
                        color: activeWidget === 'tasks' ? theme.accentColor : '#64748b',
                        background: activeWidget === 'tasks' ? 'rgba(0,0,0,0.04)' : 'transparent',
                    }}
                >
                    <ListTodo size={20} />
                </button>

                {/* 4. AI Assistant Tab */}
                <button
                    onClick={() => toggleWidget('ai')}
                    title="Zihin Asistanı"
                    className="dock-icon-btn"
                    style={{
                        color: activeWidget === 'ai' ? theme.accentColor : '#64748b',
                        background: activeWidget === 'ai' ? 'rgba(0,0,0,0.04)' : 'transparent',
                    }}
                >
                    <Sparkles size={20} />
                </button>

                {/* Divider */}
                <div style={{ height: '1px', background: 'rgba(0,0,0,0.08)', margin: '4px 0' }} />

                {/* 5. Back to Map */}
                <button
                    onClick={onBack}
                    title="Ortamları Değiştir (Haritaya Dön)"
                    className="dock-icon-btn"
                    style={{
                        color: '#64748b',
                        background: 'transparent',
                    }}
                >
                    <ArrowLeft size={20} />
                </button>
            </div>
        </div>
    );
}

const styles = {
    topHeaderBar: {
        position: 'absolute',
        top: '24px',
        left: '24px',
        right: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 30,
        pointerEvents: 'none',
    },
    userInfoPill: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.5)',
        borderRadius: '30px',
        padding: '6px 12px 6px 16px',
        boxShadow: '0 8px 32px rgba(120, 110, 90, 0.05)',
    },
    userEmail: {
        fontSize: '12px',
        fontWeight: '700',
        color: '#1e293b',
    },
    signOutIconBtn: {
        background: 'transparent',
        border: 'none',
        fontSize: '14px',
        cursor: 'pointer',
        padding: '2px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        transition: 'all 0.2s',
    },
    modeTogglePill: {
        display: 'flex',
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.5)',
        borderRadius: '30px',
        padding: '4px',
        boxShadow: '0 8px 32px rgba(120, 110, 90, 0.05)',
    },
    modeToggleBtn: {
        border: 'none',
        padding: '8px 18px',
        borderRadius: '20px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        background: 'transparent',
    },
    auraRoomDesk: {
        position: 'absolute',
        bottom: '0px',
        left: '0px',
        right: '0px',
        width: '100%',
        background: 'rgba(255, 255, 255, 0.82)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.6)',
        borderLeft: 'none',
        borderRight: 'none',
        borderBottom: 'none',
        borderRadius: '24px 24px 0 0',
        padding: '14px 24px',
        boxShadow: '0 -10px 40px rgba(120, 110, 90, 0.08)',
        zIndex: 25,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
        animation: 'slide-up-bottom 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
    },
    auraRoomHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(0,0,0,0.04)',
        paddingBottom: '8px',
    },
    livePulseDot: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: '#10b981',
        boxShadow: '0 0 8px #10b981',
        animation: 'pulse-slow 2s infinite ease-in-out',
    },
    peersGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
    },
    peerCard: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '10px',
        background: 'rgba(0,0,0,0.02)',
        padding: '8px 12px',
        borderRadius: '16px',
        border: '1px solid rgba(0,0,0,0.03)',
        minWidth: '160px',
        boxSizing: 'border-box',
    },
    peerAvatarCircle: {
        fontSize: '20px',
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        backgroundColor: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 10px rgba(0,0,0,0.03)',
        flexShrink: 0,
    },
    peerName: {
        fontSize: '11px',
        fontWeight: '700',
        color: '#1e293b',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    auraBarWrapper: {
        width: '100%',
        height: '6px',
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: '3px',
        overflow: 'hidden',
    },
    auraBarProgress: {
        height: '100%',
        borderRadius: '3px',
        transition: 'width 1s ease',
    },
    peerStatus: {
        fontSize: '10px',
        color: '#64748b',
        fontWeight: '500',
    },
    buddyContainer: {
        position: 'absolute',
        bottom: '24px',
        left: '24px',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pointerEvents: 'auto',
    },
    buddySpeechBubble: {
        background: 'rgba(255, 255, 255, 0.95)',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: '16px',
        padding: '12px 16px',
        maxWidth: '220px',
        boxShadow: '0 8px 20px rgba(120, 110, 90, 0.08)',
        marginBottom: '10px',
        position: 'relative',
        animation: 'tooltip-in 0.3s ease-out forwards',
    },
    speechBubbleArrow: {
        position: 'absolute',
        bottom: '-6px',
        left: '50%',
        transform: 'translateX(-50%) rotate(45deg)',
        width: '12px',
        height: '12px',
        background: '#ffffff',
        borderRight: '1px solid rgba(0,0,0,0.06)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
    },
    buddyAvatarCircle: {
        width: '72px',
        height: '72px',
        borderRadius: '50%',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        border: '3px solid',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    },
    buddyBadge: {
        position: 'absolute',
        bottom: '-6px',
        color: '#ffffff',
        fontSize: '9px',
        fontWeight: 'bold',
        padding: '2px 8px',
        borderRadius: '10px',
        textTransform: 'uppercase',
    },
    widgetHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    widgetTitle: {
        fontSize: '18px',
        fontWeight: '700',
        color: '#1e293b'
    },
    widgetSubtitle: {
        fontSize: '13px',
        color: '#64748b',
        marginTop: '-10px',
        lineHeight: '1.4'
    },
    actionTextBtn: {
        background: 'transparent',
        border: 'none',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer'
    },
    mixerList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    },
    mixerRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '10px 14px',
        borderRadius: '16px',
        border: '1px solid rgba(0,0,0,0.02)',
        transition: 'all 0.3s ease'
    },
    soundBtn: {
        border: 'none',
        width: '42px',
        height: '42px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    },
    sliderContainer: {
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
    },
    sliderLabel: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    slider: {
        width: '100%',
        height: '4px',
        borderRadius: '2px',
        outline: 'none',
        cursor: 'pointer'
    },
    taskBadge: {
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: '700'
    },
    taskForm: {
        display: 'flex',
        gap: '10px'
    },
    taskInput: {
        flexGrow: 1,
        background: 'rgba(0,0,0,0.02)',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: '12px',
        padding: '10px 14px',
        fontSize: '14px',
        color: '#1e293b',
        outline: 'none',
        fontFamily: 'var(--font-body)'
    },
    taskAddBtn: {
        border: 'none',
        width: '40px',
        height: '40px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'opacity 0.2s'
    },
    taskList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxHeight: '180px',
        overflowY: 'auto'
    },
    emptyTaskText: {
        fontSize: '13px',
        color: '#94a3b8',
        textAlign: 'center',
        padding: '10px 0'
    },
    taskItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 14px',
        borderRadius: '12px',
        background: 'rgba(0,0,0,0.01)',
        border: '1px solid rgba(0,0,0,0.03)'
    },
    taskCheck: {
        width: '18px',
        height: '18px',
        borderRadius: '6px',
        border: '2px solid',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        background: 'transparent',
        padding: 0
    },
    taskText: {
        flexGrow: 1,
        fontSize: '14px',
        lineHeight: '1.4'
    },
    taskSplitBtn: {
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    taskDeleteBtn: {
        background: 'transparent',
        border: 'none',
        color: '#94a3b8',
        cursor: 'pointer',
        padding: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ':hover': {
            color: '#ef4444'
        }
    },
    timerPresets: {
        display: 'flex',
        gap: '8px',
        justifyContent: 'center',
        width: '100%',
        borderBottom: '1px solid rgba(0,0,0,0.04)',
        paddingBottom: '16px'
    },
    presetBtn: {
        background: 'transparent',
        border: '1px solid transparent',
        borderRadius: '10px',
        padding: '6px 12px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.3s ease'
    },
    timerVisualContainer: {
        position: 'relative',
        width: '180px',
        height: '180px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    timerSvg: {
        position: 'absolute',
        top: 0,
        left: 0
    },
    timeNumberDisplay: {
        fontSize: '2.5rem',
        fontWeight: '800',
        fontFamily: 'monospace',
        letterSpacing: '-0.02em'
    },
    timerControlsRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        justifyContent: 'center',
        marginTop: '10px'
    },
    timerMainBtn: {
        border: 'none',
        padding: '10px 20px',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '700',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        color: '#ffffff',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    },
    timerResetBtn: {
        background: 'rgba(0,0,0,0.02)',
        border: '1px solid rgba(0,0,0,0.05)',
        color: '#64748b',
        width: '42px',
        height: '42px',
        borderRadius: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'background 0.2s',
        ':hover': {
            background: 'rgba(0,0,0,0.05)'
        }
    },
    aiDialogueBox: {
        background: 'rgba(0,0,0,0.02)',
        borderRadius: '16px',
        padding: '16px',
        borderLeft: '4px solid',
        minHeight: '100px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
    },
    aiText: {
        fontSize: '14px',
        lineHeight: '1.6',
        color: '#334155'
    },
    loadingWrapper: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        textAlign: 'center',
        padding: '10px'
    },
    aiForm: {
        display: 'flex',
        gap: '8px',
        width: '100%'
    },
    aiInput: {
        flexGrow: 1,
        background: 'rgba(0,0,0,0.02)',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: '12px',
        padding: '10px 14px',
        fontSize: '13px',
        color: '#1e293b',
        outline: 'none',
        fontFamily: 'var(--font-body)'
    },
    aiSubmitBtn: {
        border: '1px solid rgba(0,0,0,0.05)',
        width: '40px',
        height: '40px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.3s ease'
    },

    // ── PINNED TASKS PANEL STYLES ──
    pinnedTasksWrapper: {
        position: 'absolute',
        top: '72px',
        left: '24px',
        zIndex: 28,
        width: '300px',
        pointerEvents: 'auto',
    },
    pinnedTasksToggle: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 14px',
        background: 'rgba(255, 255, 255, 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.5)',
        borderRadius: '14px',
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
    },
    pinnedTasksBadge: {
        fontSize: '11px',
        fontWeight: '700',
        padding: '2px 8px',
        borderRadius: '20px',
    },
    pinnedTasksBody: {
        marginTop: '6px',
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.5)',
        borderRadius: '16px',
        padding: '12px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.08)',
        maxHeight: '340px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        animation: 'widget-slide-in 0.25s ease-out',
    },
    pinnedTaskForm: {
        display: 'flex',
        gap: '6px',
    },
    pinnedTaskInput: {
        flex: 1,
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: '10px',
        padding: '8px 12px',
        fontSize: '12px',
        color: '#1e293b',
        outline: 'none',
        background: 'rgba(0,0,0,0.02)',
        fontFamily: 'var(--font-body)',
    },
    pinnedTaskAddBtn: {
        border: 'none',
        borderRadius: '10px',
        width: '34px',
        height: '34px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'all 0.2s ease',
    },
    pinnedTaskList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        overflowY: 'auto',
        maxHeight: '260px',
    },
    pinnedTaskItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 8px',
        borderRadius: '8px',
        transition: 'background 0.15s ease',
    },
    pinnedTaskCheck: {
        width: '18px',
        height: '18px',
        borderRadius: '5px',
        border: '2px solid',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flexShrink: 0,
        background: 'transparent',
        transition: 'all 0.2s ease',
        padding: 0,
    },
    pinnedTaskMiniBtn: {
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '3px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '4px',
        transition: 'all 0.15s ease',
        flexShrink: 0,
    },
    pinnedTaskEmpty: {
        fontSize: '12px',
        color: '#94a3b8',
        textAlign: 'center',
        padding: '12px 0',
        margin: 0,
    },
};

export default FocusRoom;
