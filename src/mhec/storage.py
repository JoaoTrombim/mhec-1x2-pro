import sqlite3
from pathlib import Path
import pandas as pd

DDL = '''
CREATE TABLE IF NOT EXISTS matches (
 match_date TEXT NOT NULL, competition TEXT NOT NULL, season TEXT NOT NULL,
 home_team TEXT NOT NULL, away_team TEXT NOT NULL, home_goals INTEGER,
 away_goals INTEGER, status TEXT NOT NULL, source TEXT NOT NULL,
 source_url TEXT, round_name TEXT, neutral_venue INTEGER,
 imported_at TEXT DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(match_date, competition, season, home_team, away_team, source)
);
CREATE INDEX IF NOT EXISTS idx_match_date ON matches(match_date);
CREATE INDEX IF NOT EXISTS idx_comp_season ON matches(competition, season);
'''

def connect(db='data/mhec.sqlite'):
    p = Path(db); p.parent.mkdir(parents=True, exist_ok=True)
    c = sqlite3.connect(p); c.executescript(DDL); return c

def insert_matches(df, db='data/mhec.sqlite'):
    c = connect(db)
    cols = ['match_date','competition','season','home_team','away_team','home_goals',
            'away_goals','status','source','source_url','round_name','neutral_venue']
    work = df.copy()
    defaults = {'home_goals':None,'away_goals':None,'status':'unknown','source_url':None,
                'round_name':None,'neutral_venue':None}
    for k,v in defaults.items():
        if k not in work: work[k] = v
    work['match_date'] = pd.to_datetime(work.match_date, errors='coerce').dt.strftime('%Y-%m-%d')
    before = c.total_changes
    work[cols].to_sql('_incoming', c, if_exists='replace', index=False)
    c.execute('INSERT OR IGNORE INTO matches ('+','.join(cols)+') SELECT '+','.join(cols)+' FROM _incoming')
    c.execute('DROP TABLE _incoming'); c.commit()
    added = c.total_changes - before
    c.close()
    return added

def coverage(db='data/mhec.sqlite'):
    c = connect(db)
    df = pd.read_sql_query('SELECT competition, season, source, COUNT(*) AS matches, SUM(CASE WHEN home_goals IS NOT NULL AND away_goals IS NOT NULL THEN 1 ELSE 0 END) AS with_score FROM matches GROUP BY competition, season, source ORDER BY competition, season, source', c)
    c.close()
    return df
