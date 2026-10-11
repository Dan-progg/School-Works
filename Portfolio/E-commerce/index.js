const SUPABASE_URL = 'https://sklpligxxqxtzspsckkd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_3mRZpbIXAzxvFVuA3U3AQw_va68UOMh';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const existingUser = localStorage.getItem('neonForgeUser');
const existingAdmin = sessionStorage.getItem('neonForgeAdmin');
if (existingAdmin) location.href = 'NeonForgeAdmin.html';
else if (existingUser) location.href = 'NeonForge.html';

document.getElementById('tab-login').addEventListener('click', () => {
    document.getElementById('tab-login').classList.add('active');
    document.getElementById('tab-register').classList.remove('active');
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('login-error').textContent = '';
});

document.getElementById('tab-register').addEventListener('click', () => {
    document.getElementById('tab-register').classList.add('active');
    document.getElementById('tab-login').classList.remove('active');
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
    document.getElementById('register-error').textContent = '';
});

document.getElementById('login-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    errorEl.textContent = '';

    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('email', email)
            .eq('password', password)
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            errorEl.textContent = '⚠️ Invalid email or password.';
            return;
        }

        if (data.role === 'admin') {
            sessionStorage.setItem('neonForgeAdmin', JSON.stringify({
                id: data.id,
                full_name: data.full_name,
                email: data.email,
                role: data.role
            }));
            location.href = 'NeonForgeAdmin.html';
        } else {
            localStorage.setItem('neonForgeUser', JSON.stringify({
                id: data.id,
                full_name: data.full_name,
                email: data.email,
                phone: data.phone,
                role: data.role
            }));
            location.href = 'NeonForge.html';
        }

    } catch (err) {
        console.error(err);
        errorEl.textContent = `⚠️ Login failed: ${err.message}`;
    }
});

document.getElementById('register-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const phone = document.getElementById('reg-phone').value.trim();
    const password = document.getElementById('reg-password').value;
    const errorEl = document.getElementById('register-error');
    errorEl.textContent = '';

    try {
        const { data: existing } = await supabaseClient
            .from('users')
            .select('id')
            .eq('email', email)
            .maybeSingle();

        if (existing) {
            errorEl.textContent = '⚠️ Email already registered. Try logging in.';
            return;
        }

        const { data, error } = await supabaseClient
            .from('users')
            .insert({ full_name: name, email, phone, password, role: 'customer' })
            .select()
            .single();

        if (error) throw error;

        localStorage.setItem('neonForgeUser', JSON.stringify({
            id: data.id,
            full_name: data.full_name,
            email: data.email,
            phone: data.phone,
            role: data.role
        }));

        location.href = 'NeonForge.html';

    } catch (err) {
        console.error(err);
        errorEl.textContent = `⚠️ Registration failed: ${err.message}`;
    }
});