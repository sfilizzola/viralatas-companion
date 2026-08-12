import { useContext } from 'react';
import {
  ActiveFestivalContext,
  type ActiveFestivalContextValue,
} from '../components/festival/ActiveFestivalProvider';

export function useActiveFestival(): ActiveFestivalContextValue {
  return useContext(ActiveFestivalContext);
}

export type { ActiveFestivalContextValue };
