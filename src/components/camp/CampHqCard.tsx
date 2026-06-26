import { useCampLocation } from '../../hooks/useCampLocation';
import CampNavStrip from './CampNavStrip';

export default function CampHqCard() {
  const location = useCampLocation();
  if (!location) return null;

  return <CampNavStrip location={location} showTape hintKey="campHqHint" variant="mural" />;
}
