import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY nas variáveis de ambiente.');
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder');

let checkedAccessToken = '';
async function validatePrivateAccess(session) {
  const token = session?.access_token;
  if (!token || token === checkedAccessToken) return;
  checkedAccessToken = token;
  try {
    const response = await fetch('/api/auth-access', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (response.status !== 403) return;
    const data = await response.json().catch(() => ({}));
    sessionStorage.setItem('financas-access-error', data.error || 'Esta conta não está autorizada.');
    await supabase.auth.signOut();
    window.location.reload();
  } catch (error) {
    console.warn('Não foi possível validar o acesso privado agora.', error);
  }
}

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
    setTimeout(() => validatePrivateAccess(session), 0);
  }
});
