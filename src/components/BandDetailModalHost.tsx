import BandDetailModal from './BandDetailModal';
import type { BandDetailModalProps } from '../hooks/useBandDetailModal';

export function BandDetailModalHost({ modalProps }: { modalProps: BandDetailModalProps | null }) {
  if (!modalProps) return null;
  return <BandDetailModal {...modalProps} />;
}
