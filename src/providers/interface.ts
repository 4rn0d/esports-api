export interface ProviderAdapter<T> {
  readonly id: string;
  fetch(): Promise<T>;
}

export interface Team {
  id: string;
  team: string;
  teamShort: string | null;
  sport: string;
  league: string | null;
  leagueId: string | null;
  league2: string | null;
  league2Id: string | null;
  league3: string | null;
  league3Id: string | null;
  league4: string | null;
  league4Id: string | null;
  country: string | null;
  badge: string | null;
}

export interface League {
  id: string;
  sport: string;
  league: string;
  leagueShort: string | null;
  division: string | null;
  cupId: string | null;
  currentSeason: string | null;
  country: string | null;
  logo: string | null;
}
