
export interface DayState {
  done: boolean;
  mood: number | null;
  selectedActivity: string;
  activityDone: boolean;
  note: string;
}

export interface WeekHistory {
  week: number;
  days: DayState[];
}

export interface AppState {
  week: number;
  theme: 'light' | 'dark';
  days: DayState[];
  history: WeekHistory[];
}