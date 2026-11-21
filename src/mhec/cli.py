import typer
from rich import print
from mhec.connectors.open_matchday import sync as sync_om
from mhec.connectors.openfootball import sync as sync_of
from mhec.storage import coverage

app = typer.Typer(help='MHEC-1X2 PRO — Data Engine local.')

@app.command('sync-open-matchday')
def sync_open_matchday(season: str='2627', competition: str|None=None, db: str='data/mhec.sqlite'):
    for r in sync_om(season, competition, db):
        print(r)

@app.command('sync-openfootball')
def sync_openfootball(season: str='2025-26', competition: str|None=None, db: str='data/mhec.sqlite'):
    for r in sync_of(season, competition, db):
        print(r)

@app.command('coverage')
def show_coverage(db: str='data/mhec.sqlite'):
    df = coverage(db)
    if df.empty:
        print('[yellow]Ainda não existem dados importados.[/yellow]')
    else:
        print(df.to_string(index=False))
        from pathlib import Path
        Path('reports').mkdir(exist_ok=True)
        df.to_csv('reports/coverage.csv', index=False)
        print('Relatório guardado em reports/coverage.csv')

if __name__ == '__main__':
    app()
