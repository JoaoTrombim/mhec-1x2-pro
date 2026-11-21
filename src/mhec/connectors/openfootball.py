import json
from pathlib import Path
import pandas as pd
from mhec.config import ROOT, competitions
from mhec.connectors.http import download
from mhec.storage import insert_matches
from mhec.validation import validate_matches

BASE = 'https://raw.githubusercontent.com/openfootball/football.json/master'

def sync(season='2025-26', selected=None, db='data/mhec.sqlite'):
    cfg = competitions()
    ids = [selected] if selected else list(cfg)
    report = []
    for cid in ids:
        item = cfg.get(cid)
        if not item:
            report.append({'competition':cid,'status':'unknown_competition','rows':0}); continue
        filename = item.get('openfootball')
        if not filename:
            report.append({'competition':cid,'status':'no_path_configured','rows':0}); continue
        url = f'{BASE}/{season}/{filename}'
        raw = ROOT / 'data/raw/openfootball' / season / filename
        try:
            size = download(url, raw)
        except RuntimeError as e:
            report.append({'competition':cid,'status':str(e),'rows':0}); continue
        if size is None:
            report.append({'competition':cid,'status':'not_found_404','rows':0}); continue
        payload = json.loads(raw.read_text(encoding='utf-8'))
        rows = []
        for m in payload.get('matches', []):
            score = (m.get('score') or {}).get('ft') or [None, None]
            if not isinstance(score, list) or len(score) < 2:
                score = [None, None]
            rows.append({
                'match_date':m.get('date'), 'competition':cid, 'season':season,
                'home_team':m.get('team1'), 'away_team':m.get('team2'),
                'home_goals':score[0], 'away_goals':score[1],
                'status':'finished' if score[0] is not None and score[1] is not None else 'scheduled',
                'source':'openfootball', 'source_url':url,
                'round_name':m.get('round'), 'neutral_venue':None
            })
        out = pd.DataFrame(rows)
        if out.empty:
            report.append({'competition':cid,'status':'empty_dataset','rows':0}); continue
        errors = validate_matches(out)
        if errors:
            report.append({'competition':cid,'status':'validation_error: '+'; '.join(errors),'rows':len(out)}); continue
        added = insert_matches(out, db)
        report.append({'competition':cid,'status':'imported','rows':len(out),'inserted':added,'bytes':size})
    return report
