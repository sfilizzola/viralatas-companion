import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import styles from './ProfilePage.module.css';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const displayName = (user?.user_metadata?.['display_name'] as string | undefined) ?? user?.email ?? '';
  const initial = displayName.charAt(0).toUpperCase();

  const [newName, setNewName] = useState(displayName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    await supabase.auth.updateUser({ data: { display_name: newName } });
    await supabase.from('users').update({ display_name: newName }).eq('id', user.id);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <span className={styles.appName}>Viralatas 🤘</span>
        <button className={styles.logoutBtn} onClick={handleLogout}>Sair</button>
      </header>

      <main className={styles.main}>
        <div className={styles.avatar}>{initial}</div>
        <h2 className={styles.name}>{displayName}</h2>
        <p className={styles.email}>{user?.email}</p>

        <form onSubmit={handleSave} className={styles.form}>
          <label className={styles.label}>
            Nome na crew
            <input
              className={styles.input}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </label>
          <button className={styles.button} type="submit" disabled={saving}>
            {saved ? 'Salvo ✓' : saving ? 'Salvando...' : 'Salvar nome'}
          </button>
        </form>
      </main>
    </div>
  );
}
