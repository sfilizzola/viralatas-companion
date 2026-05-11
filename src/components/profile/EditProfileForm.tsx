import { useState, type ChangeEvent, type FormEvent } from 'react';
import type { User as AuthUser } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { type Language } from '../../lib/i18n';
import { Button, Collapsible, Input, Select, SegmentedControl } from '../../ui';
import styles from '../../pages/ProfilePage.module.css';

const DECADE_GROUPS: { label: string; years: number[] }[] = [
  { label: '2000s', years: [2005, 2006, 2007, 2008, 2009] },
  { label: '2010s', years: [2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019] },
  { label: '2020s', years: [2022, 2023, 2024, 2025, 2026] },
];

const ARRIVAL_DAY_OPTIONS = [
  { value: 'sun-jul26', labelKey: 'arrivalDaySunJul26' },
  { value: 'mon-jul27', labelKey: 'arrivalDayMonJul27' },
  { value: 'tue-jul28', labelKey: 'arrivalDayTueJul28' },
  { value: 'wed-jul29', labelKey: 'arrivalDayWedJul29' },
  { value: 'thu-plus', labelKey: 'arrivalDayThuPlus' },
];

const LANG_OPTIONS = [
  { value: 'br', label: 'PT' },
  { value: 'en', label: 'EN' },
  { value: 'es', label: 'ES' },
  { value: 'de', label: 'DE' },
];

type TFn = (key: string, values?: Record<string, string | number>) => string;

function ArrivalDayPicker({
  selectedDay,
  onSelect,
  t,
}: {
  selectedDay: string;
  onSelect: (day: string) => void;
  t: TFn;
}) {
  return (
    <div className={styles.label}>
      {t('wackenArrivalDay')}
      <div className={styles.arrivalDayPillRow}>
        {ARRIVAL_DAY_OPTIONS.map(({ value, labelKey }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selectedDay === value}
            className={`${styles.arrivalDayPill} ${selectedDay === value ? styles.arrivalDayPillSelected : ''}`}
            onClick={() => onSelect(value)}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
}

function WackenYearPicker({
  selectedYears,
  onToggle,
  t,
}: {
  selectedYears: number[];
  onToggle: (year: number, checked: boolean) => void;
  t: TFn;
}) {
  return (
    <div className={styles.label}>
      {t('wackenYears')}
      <div className={styles.yearGrid}>
        {DECADE_GROUPS.map(({ label, years }) => (
          <div key={label} className={styles.yearDecade}>
            <span className={styles.yearDecadeLabel}>{label}</span>
            <div className={styles.yearPillRow}>
              {years.map((year) => {
                const selected = selectedYears.includes(year);
                return (
                  <button
                    key={year}
                    type="button"
                    role="checkbox"
                    aria-checked={selected}
                    className={`${styles.yearPill} ${selected ? styles.yearPillSelected : ''}`}
                    onClick={() => onToggle(year, !selected)}
                  >
                    {year}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p className={styles.yearCounter}>
        ● {selectedYears.length} Wacken{selectedYears.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

type EditProfileFormProps = {
  user: AuthUser;
  displayName: string;
  language: Language;
  setLanguage: (language: Language) => void;
  currentAvatarUrl: string | null;
  onAvatarChange: (url: string | null) => void;
  t: TFn;
};

export default function EditProfileForm({
  user,
  displayName,
  language,
  setLanguage,
  currentAvatarUrl,
  onAvatarChange,
  t,
}: EditProfileFormProps) {
  const [newName, setNewName] = useState(displayName);
  const [newLanguage, setNewLanguage] = useState<Language>(language);
  const [newAvatarUrl, setNewAvatarUrl] = useState(currentAvatarUrl);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saved, setSaved] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [newWackenYears, setNewWackenYears] = useState<number[]>(
    Array.isArray(user.user_metadata?.['wacken_years'])
      ? (user.user_metadata['wacken_years'] as number[])
      : [],
  );
  const [newCountry, setNewCountry] = useState<string>(
    (user.user_metadata?.['country'] as string | undefined) ?? '',
  );
  const [newArrivalDay, setNewArrivalDay] = useState<string>(
    (user.user_metadata?.['wacken_arrival_day'] as string | undefined) ?? '',
  );

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setLanguage(newLanguage);
    await supabase.auth.updateUser({
      data: {
        display_name: newName,
        preferred_language: newLanguage,
        avatar_url: newAvatarUrl,
        wacken_years: newWackenYears,
        country: newCountry || null,
        wacken_arrival_day: newArrivalDay || null,
      },
    });
    await supabase
      .from('users')
      .update({
        display_name: newName,
        preferred_language: newLanguage,
        avatar_url: newAvatarUrl,
        wacken_years: newWackenYears,
        country: newCountry || null,
        wacken_arrival_day: newArrivalDay || null,
      })
      .eq('id', user.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoError(false);
    if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) {
      setPhotoError(true);
      event.target.value = '';
      return;
    }
    setUploadingPhoto(true);
    const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `${user.id}/avatar-${Date.now()}.${extension}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    });
    if (error) {
      setPhotoError(true);
      setUploadingPhoto(false);
      event.target.value = '';
      return;
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    setNewAvatarUrl(data.publicUrl);
    onAvatarChange(data.publicUrl);
    setUploadingPhoto(false);
    event.target.value = '';
  }

  function handleYearToggle(year: number, checked: boolean) {
    setNewWackenYears((prev) => (checked ? [...prev, year] : prev.filter((y) => y !== year)));
  }

  const trigger = <span className={styles.pfCollapseLabel}>{t('editProfile')}</span>;

  return (
    <Collapsible trigger={trigger} className={styles.pfCollapse}>
      <form onSubmit={handleSave} className={styles.form}>
        <Input
          label={t('crewName')}
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          maxLength={30}
        />

        <div className={styles.label}>
          {t('language')}
          <SegmentedControl
            options={LANG_OPTIONS}
            value={newLanguage}
            onChange={(v) => setNewLanguage(v as Language)}
          />
        </div>

        <label className={styles.label}>
          {t('photo')}
          <span className={styles.photoHelp}>{t('photoHelp')}</span>
          <span className={styles.fileButton}>
            {uploadingPhoto ? t('uploadingPhoto') : t('choosePhoto')}
            <input
              className={styles.fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={uploadingPhoto}
              onChange={handlePhotoChange}
            />
          </span>
        </label>
        {photoError && <p className={styles.error}>{t('photoError')}</p>}

        <WackenYearPicker
          selectedYears={newWackenYears}
          onToggle={handleYearToggle}
          t={t}
        />

        <Select
          label={t('country')}
          value={newCountry}
          onChange={(e) => setNewCountry(e.target.value)}
        >
          <option value="">{t('countryPlaceholder')}</option>
          <option value="de">{t('countryDe')}</option>
          <option value="es">{t('countryEs')}</option>
          <option value="br">{t('countryBr')}</option>
          <option value="us">{t('countryUs')}</option>
          <option value="co">{t('countryCo')}</option>
          <option value="be">{t('countryBe')}</option>
          <option value="other">{t('countryOther')}</option>
        </Select>

        <ArrivalDayPicker
          selectedDay={newArrivalDay}
          onSelect={setNewArrivalDay}
          t={t}
        />

        <Button type="submit" fullWidth disabled={saving}>
          {saved ? t('saveDone') : saving ? t('saveLoading') : t('saveProfile')}
        </Button>
      </form>
    </Collapsible>
  );
}
