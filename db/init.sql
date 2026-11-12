CREATE TABLE IF NOT EXISTS leagues (
  id_league INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  alternate_name TEXT,
  sport TEXT NOT NULL DEFAULT 'Esports',
  country TEXT,
  badge_url TEXT
);

CREATE TABLE IF NOT EXISTS teams (
  id_team INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT,
  sport TEXT NOT NULL DEFAULT 'Esports',
  country TEXT,
  badge_url TEXT
);
