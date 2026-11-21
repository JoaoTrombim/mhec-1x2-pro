from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parents[2]
def competitions():
    data = yaml.safe_load((ROOT / 'config/competitions.yml').read_text(encoding='utf-8'))
    return data['competitions']
