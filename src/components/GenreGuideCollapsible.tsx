import { useI18n } from '../lib/i18n';
import { GENRE_GUIDE } from '../services/genreGuide';
import Collapsible from '../ui/Collapsible';
import styles from './GenreGuideCollapsible.module.css';

export default function GenreGuideCollapsible() {
  const { t } = useI18n('SchedulePage');

  return (
    <Collapsible
      className={styles.guideCollapsible}
      trigger={
        <span className={styles.guideTrigger}>{t('genreGuideTrigger')}</span>
      }
    >
      <div className={styles.guideBody}>
        <p className={styles.guideIntro}>{t('genreGuideIntro')}</p>
        <ul className={styles.guideList}>
          {GENRE_GUIDE.map(({ canonical, includes, footnoteKey }) => {
            let secondary: string | null = null;
            if (footnoteKey) {
              secondary = t(footnoteKey);
            } else if (includes.length > 0) {
              secondary = `${t('genreGuideIncludes')} ${includes.join(', ')}`;
            }
            return (
              <li key={canonical} className={styles.guideRow}>
                <span className={styles.guideLabel}>{canonical}</span>
                {secondary && (
                  <span className={styles.guideSecondary}>{secondary}</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </Collapsible>
  );
}
