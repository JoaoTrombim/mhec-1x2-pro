from pathlib import Path
import pandas as pd
from mhec.config import ROOT, competitions
from mhec.connectors.http import download
from mhec.storage import insert_matches
from mhec.validation import validate_matches

BASE = 'https://raw.githubusercontent.com/oladeeayo/open-matchday/master/data'

def sync(season='2627', selected=None, db='data/mhec.sqlite'):
    cfg = competitions()
    ids = [selected] if selected else list(cfg)
    report = []
    for cid in ids:
        item = cfg.get(cid)
        if not item:
            report.append({'competition':cid,'status':'unknown_competition','rows':0})
            continue
        folder = item.get('open_matchday')
        if not folder:
            report.append({'competition':cid,'status':'no_path_configured','rows':0})
            continue
        url = f'{BASE}/{folder}/results_{season}.csv'
        raw = ROOT / 'data/raw/open_matchday' / folder / f'results_{season}.csv'
        try:
            size = download(url, raw)
        except RuntimeError as e:
            report.append({'competition':cid,'status':str(e),'rows':0})
            continue
        if size is None:
            report.append({'competition':cid,'status':'not_found_404','rows':0})
            continue
        df = pd.read_csv(raw)
        if df.empty:
            report.append({'competition':cid,'status':'empty_file','rows':0})
            continue
        required = {'date','home','away','ft_home','ft_away'}
        if not required.issubset(df.columns):
            report.append({'competition':cid,'status':'schema_mismatch','rows':len(df)})
            continue
        out = pd.DataFrame({
            'match_date':df['date'],
            'competition':cid,
            'season':f'20{season[:2]}/{season[2:]}',
            'home_team':df['home'],
            'away_team':df['away'],
            'home_goals':pd.to_numeric(df['ft_home'],errors='coerce').astype('Int64'),
            'away_goals':pd.to_numeric(df['ft_away'],errors='coerce').astype('Int64'),
            'status':'finished',
            'source':'open_matchday',
            'source_url':url,
            'round_name':df['gw'].astype(str) if 'gw' in df else None,
            'neutral_venue':None
        })
        errors = validate_matches(out)
        if errors:
            report.append({'competition':cid,'status':'validation_error: '+'; '.join(errors),'rows':len(out)})
            continue
        added = insert_matches(out, db)
        report.append({'competition':cid,'status':'imported','rows':len(out),'inserted':added,'bytes':size})
    return report
