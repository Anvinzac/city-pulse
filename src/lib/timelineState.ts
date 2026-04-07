import type { Timeframe } from '@/data/mockData';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const LOCAL_STORAGE_KEY_PREFIX = 'city-pulse-timeframes-v1';
const SUPABASE_ROW_ID_PREFIX = 'timeline';
const LEGACY_LOCAL_STORAGE_KEY = 'city-pulse-timeframes-v1';
const LEGACY_SUPABASE_ROW_ID = 'timeline';

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function getDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getLocalStorageKey(date: Date) {
  return `${LOCAL_STORAGE_KEY_PREFIX}-${getDateKey(date)}`;
}

function getSupabaseRowId(date: Date) {
  return `${SUPABASE_ROW_ID_PREFIX}-${getDateKey(date)}`;
}

export function getSessionIdForDate(date = new Date()) {
  return getSupabaseRowId(date);
}

function readLocalTimelineState(date: Date) {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(getLocalStorageKey(date)) ?? window.localStorage.getItem(LEGACY_LOCAL_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as Timeframe[];
  } catch {
    return null;
  }
}

function writeLocalTimelineState(timeframes: Timeframe[], date: Date) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getLocalStorageKey(date), JSON.stringify(timeframes));
}

async function readSupabaseTimelineState(date: Date) {
  if (!isSupabaseConfigured || !supabase) return null;

  const primary = await supabase
    .from('app_states')
    .select('payload')
    .eq('id', getSupabaseRowId(date))
    .maybeSingle();

  if (primary.error) {
    console.warn('Supabase read failed:', primary.error.message);
    return null;
  }

  if (primary.data && typeof primary.data.payload !== 'undefined' && primary.data.payload !== null) {
    try {
      return primary.data.payload as Timeframe[];
    } catch {
      return null;
    }
  }

  const legacy = await supabase
    .from('app_states')
    .select('payload')
    .eq('id', LEGACY_SUPABASE_ROW_ID)
    .maybeSingle();

  if (legacy.error) {
    console.warn('Supabase legacy read failed:', legacy.error.message);
    return null;
  }

  if (!legacy.data || typeof legacy.data.payload === 'undefined' || legacy.data.payload === null) {
    return null;
  }

  try {
    return legacy.data.payload as Timeframe[];
  } catch {
    return null;
  }
}

async function writeSupabaseTimelineState(timeframes: Timeframe[], date: Date) {
  if (!isSupabaseConfigured || !supabase) return;

  const { error } = await supabase.from('app_states').upsert(
    {
      id: getSupabaseRowId(date),
      payload: timeframes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (error) {
    console.warn('Supabase write failed:', error.message);
  }
}

export async function loadTimelineState(date = new Date()) {
  const remote = await readSupabaseTimelineState(date);
  if (remote) return remote;
  return readLocalTimelineState(date);
}

export async function saveTimelineState(timeframes: Timeframe[], date = new Date()) {
  writeLocalTimelineState(timeframes, date);
  await writeSupabaseTimelineState(timeframes, date);
}
