// js/auth.js
// Authentication & Supabase Session Manager for MTCS Pro

document.addEventListener('DOMContentLoaded', () => {
    initAuthSession();
});

async function initAuthSession() {
    const userProfileEl = document.querySelector('.user-profile');
    if (!userProfileEl) return;

    // 1. Check Supabase Session
    if (window.supabaseClient) {
        try {
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            
            if (session && session.user) {
                localStorage.setItem('mtcs_user', JSON.stringify({
                    id: session.user.id,
                    email: session.user.email,
                    user_metadata: session.user.user_metadata || { display_name: session.user.email.split('@')[0] }
                }));
                sessionStorage.removeItem('mtcs_guest');
                renderUserProfile(userProfileEl, session.user);

                // Ensure user profile in Supabase public.users
                window.supabaseClient.from('users').upsert({
                    id: session.user.id,
                    email: session.user.email,
                    display_name: session.user.user_metadata?.display_name || session.user.email.split('@')[0],
                    rank: 'Хүрэл'
                }, { onConflict: 'id' }).then(function() {}).catch(function() {});

                // Load cached trades for this user
                if (window.loadTradesFromStorage) {
                    window.loadTradesFromStorage(session.user.id);
                }
                await syncCloudTrades(session.user.id);
                return;
            }

            // Listen for auth state changes
            window.supabaseClient.auth.onAuthStateChange(async (event, s) => {
                if (s && s.user) {
                    localStorage.setItem('mtcs_user', JSON.stringify({
                        id: s.user.id,
                        email: s.user.email,
                        user_metadata: s.user.user_metadata || { display_name: s.user.email.split('@')[0] }
                    }));
                    sessionStorage.removeItem('mtcs_guest');
                    renderUserProfile(userProfileEl, s.user);

                    if (window.loadTradesFromStorage) {
                        window.loadTradesFromStorage(s.user.id);
                    }
                    await syncCloudTrades(s.user.id);
                } else {
                    checkLocalOrGuest(userProfileEl);
                }
            });
        } catch (e) {
            console.warn("Auth check error:", e);
        }
    }

    checkLocalOrGuest(userProfileEl);
}

function checkLocalOrGuest(userProfileEl) {
    const localUserStr = localStorage.getItem('mtcs_user');
    if (localUserStr) {
        try {
            const localUser = JSON.parse(localUserStr);
            if (localUser && (localUser.id || localUser.email)) {
                renderUserProfile(userProfileEl, localUser);
                if (window.loadTradesFromStorage) {
                    window.loadTradesFromStorage(localUser.id || localUser.email);
                }
                return;
            }
        } catch (e) {}
    }
    renderGuestProfile(userProfileEl);
    if (window.loadTradesFromStorage) {
        window.loadTradesFromStorage('guest');
    }
}

function renderUserProfile(container, user) {
    const email = user.email || 'Трейдер';
    const initial = (user.user_metadata?.display_name || email).charAt(0).toUpperCase();
    const displayName = user.user_metadata?.display_name || email.split('@')[0];

    container.innerHTML = `
        <div class="avatar">${initial}</div>
        <div class="user-details" style="flex: 1; overflow: hidden; display: flex; flex-direction: column; justify-content: center;">
            <span class="user-name" title="${email}" style="white-space: nowrap; text-overflow: ellipsis; overflow: hidden; line-height: 1.2;">${displayName}</span>
            <span class="user-rank badge badge-bronze" id="headerUserRank" onclick="switchTab('zereglel')" title="Зэрэглэл харах" style="cursor: pointer; margin-top: 2px;">Хүрэл</span>
        </div>
        <button type="button" onclick="handleLogout()" class="btn-logout-icon" title="Гарах" style="font-size: 11px; font-weight: bold;">
            Гарах
        </button>
    `;

    // Also update current user row in Leaderboard
    const lbName = document.querySelector('.tr-current-user td:nth-child(2) strong');
    if (lbName) lbName.textContent = displayName;

    if (window.updateAnalytics) {
        window.updateAnalytics();
    }
}

function renderGuestProfile(container) {
    container.innerHTML = `
        <div class="avatar">M</div>
        <div class="user-details" style="flex: 1; overflow: hidden; display: flex; flex-direction: column; justify-content: center;">
            <span class="user-name" style="line-height: 1.2;">Зочин</span>
            <span class="user-rank badge badge-bronze" id="headerUserRank" onclick="switchTab('zereglel')" title="Зэрэглэл харах" style="cursor: pointer; margin-top: 2px;">Хүрэл</span>
        </div>
        <a href="login.html" class="btn-login-mini" title="Нэвтрэх">
            Нэвтрэх
        </a>
    `;

    if (window.updateAnalytics) {
        window.updateAnalytics();
    }
}

window.handleLogout = async function() {
    if (confirm('Гарах уу?')) {
        sessionStorage.removeItem('mtcs_guest');
        localStorage.removeItem('mtcs_user');
        if (window.setTradesArray) {
            window.setTradesArray([], 'guest');
        }
        if (window.supabaseClient) {
            try { await window.supabaseClient.auth.signOut(); } catch (e) {}
        }
        window.location.href = 'login.html';
    }
};

// Sync Trades with Supabase Cloud
async function syncCloudTrades(userId) {
    if (!window.supabaseClient || !userId) return;

    try {
        const { data, error } = await window.supabaseClient
            .from('trades')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
            // Map supabase trades to local format
            const mapped = data.map(t => ({
                id: t.id,
                date: new Date(t.created_at).toLocaleDateString('mn-MN'),
                instrument: t.instrument,
                direction: t.direction,
                entryPrice: t.entry_price || '--',
                lotSize: t.lot_size,
                riskAmount: parseFloat(t.risk_amount) || 100,
                targetProfit: parseFloat(t.target_profit) || 200,
                pnl: parseFloat(t.pnl) || 0,
                status: t.status
            }));
            
            if (window.setTradesArray) {
                window.setTradesArray(mapped, userId);
            }
        }
    } catch (e) {
        console.warn("Cloud sync warning:", e);
    }
}
