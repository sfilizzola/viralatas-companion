import { supabase } from './supabase';

export async function getRegistrationEnabled(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('registration_enabled')
      .limit(1)
      .single();

    if (error) {
      console.error('Failed to fetch registration status:', error);
      return true; // Default to enabled if fetch fails
    }

    return data?.registration_enabled ?? true;
  } catch (err) {
    console.error('Error fetching registration status:', err);
    return true; // Default to enabled if error occurs
  }
}

export async function setRegistrationEnabled(enabled: boolean): Promise<boolean> {
  try {
    const { data: settings, error: fetchError } = await supabase
      .from('app_settings')
      .select('id')
      .limit(1)
      .single();

    if (fetchError || !settings) {
      console.error('Failed to fetch app settings row:', fetchError);
      throw fetchError ?? new Error('App settings row not found');
    }

    const { error } = await supabase
      .from('app_settings')
      .update({
        registration_enabled: enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', settings.id);

    if (error) {
      console.error('Failed to update registration status:', error);
      throw error;
    }

    return true;
  } catch (err) {
    console.error('Error updating registration status:', err);
    throw err;
  }
}
