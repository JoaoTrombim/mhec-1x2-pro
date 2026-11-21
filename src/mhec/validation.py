import pandas as pd

def validate_matches(df):
    errors = []
    required = {'match_date','competition','season','home_team','away_team','home_goals','away_goals','source'}
    missing = required - set(df.columns)
    if missing:
        return [f'Colunas em falta: {sorted(missing)}']
    if df.empty:
        return ['Sem registos.']
    if pd.to_datetime(df.match_date, errors='coerce').isna().any():
        errors.append('Datas inválidas.')
    if df[['competition','season','home_team','away_team','source']].isna().any().any():
        errors.append('Campos de identificação vazios.')
    for c in ['home_goals','away_goals']:
        v = pd.to_numeric(df[c], errors='coerce')
        if (v.notna() & ((v < 0) | (v % 1 != 0))).any():
            errors.append(f'{c}: valores inválidos.')
    if (df.home_team.astype(str).str.casefold() == df.away_team.astype(str).str.casefold()).any():
        errors.append('Equipa da casa igual à visitante.')
    return errors
