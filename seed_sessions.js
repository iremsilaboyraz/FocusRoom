// seed_sessions.js — iremsilaboyrazz@gmail.com kullanıcısına örnek focus_sessions verisi ekler
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uiwyiupvfepglzbtsrgp.supabase.co';
const supabaseKey = 'sb_publishable_Wcb_VRegPIPXg8ilgAHHIA_2wiohNov';
const supabase = createClient(supabaseUrl, supabaseKey);

const TARGET_EMAIL = 'iremsilaboyrazz@gmail.com';

async function findUserId() {
    // 1) aura_room_members tablosunda email ile ara
    const { data: members, error: memberErr } = await supabase
        .from('aura_room_members')
        .select('user_id, email')
        .eq('email', TARGET_EMAIL)
        .limit(1);

    if (!memberErr && members && members.length > 0) {
        return members[0].user_id;
    }

    // 2) tasks tablosunda user_id bul (indirekt)
    const { data: tasks, error: taskErr } = await supabase
        .from('tasks')
        .select('user_id')
        .limit(1);

    if (!taskErr && tasks && tasks.length > 0) {
        return tasks[0].user_id;
    }

    return null;
}

async function seed() {
    console.log('🔍 Kullanıcı ID aranıyor...');
    const userId = await findUserId();

    if (!userId) {
        console.error('❌ Kullanıcı bulunamadı. Lütfen önce uygulamaya giriş yapın.');
        process.exit(1);
    }

    console.log(`✅ Kullanıcı bulundu: ${userId}`);

    // Son 7 gün için rastgele odak seansları oluştur
    const envIds = ['library', 'cafe', 'cozy', 'nature'];
    const sessions = [];

    for (let daysAgo = 0; daysAgo < 7; daysAgo++) {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);

        // Her gün 1-3 seans ekle
        const sessionsPerDay = Math.floor(Math.random() * 3) + 1;

        for (let j = 0; j < sessionsPerDay; j++) {
            const envId = envIds[Math.floor(Math.random() * envIds.length)];
            const durations = [15, 25, 25, 50]; // ağırlıklı olarak 25 dk
            const duration = durations[Math.floor(Math.random() * durations.length)];

            // Saat rastgele 9-22 arası
            const hour = Math.floor(Math.random() * 13) + 9;
            const minute = Math.floor(Math.random() * 60);
            date.setHours(hour, minute, 0, 0);

            sessions.push({
                user_id: userId,
                env_id: envId,
                duration_minutes: duration,
                completed_at: date.toISOString()
            });
        }
    }

    console.log(`📊 ${sessions.length} adet odak seansı ekleniyor...`);
    console.table(sessions.map(s => ({
        tarih: s.completed_at.split('T')[0],
        saat: s.completed_at.split('T')[1].slice(0, 5),
        oda: s.env_id,
        süre: s.duration_minutes + ' dk'
    })));

    const { data, error } = await supabase
        .from('focus_sessions')
        .insert(sessions);

    if (error) {
        console.error('❌ Veri eklenirken hata:', error.message);
        process.exit(1);
    }

    console.log('✅ Tüm seanslar başarıyla eklendi!');
}

seed();
