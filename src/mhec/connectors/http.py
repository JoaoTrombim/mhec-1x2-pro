from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from pathlib import Path
import time

def download(url, destination, timeout=30, retries=2):
    dest = Path(destination); dest.parent.mkdir(parents=True, exist_ok=True)
    last = None
    for attempt in range(retries + 1):
        try:
            req = Request(url, headers={'User-Agent':'MHEC-1X2-PRO/0.3 (personal research)'})
            with urlopen(req, timeout=timeout) as r:
                data = r.read()
            dest.write_bytes(data)
            return len(data)
        except HTTPError as e:
            if e.code == 404:
                return None
            last = e
        except (URLError, TimeoutError) as e:
            last = e
        if attempt < retries:
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f'Falha ao descarregar {url}: {last}')
