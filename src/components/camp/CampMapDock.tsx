import { useCampLocation } from '../../hooks/useCampLocation';
import { useI18n } from '../../lib/i18n';
import CampNavStrip from './CampNavStrip';

export default function CampMapDock() {
  const location = useCampLocation();
  const { t } = useI18n('CampLocation');
  if (!location) return null;

  return (
    <CampNavStrip
      location={location}
      showTape
      hintKey="campMapHint"
      variant="map"
      ariaLabel={t('campMapDockLabel')}
    />
  );
}
