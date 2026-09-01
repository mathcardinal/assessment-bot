import sys, json, argparse
from google.oauth2 import service_account
import google.auth.transport.requests
import requests

KEY = r"{{SERVICE_ACCOUNT_KEY_PATH}}"
SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
BASE = "https://sheets.googleapis.com/v4/spreadsheets"

SHEETS = {
    "main":    "{{GOOGLE_SHEET_MAIN_ID}}",
    "detail":  "{{GOOGLE_SHEET_RESULTS_ID}}",
    "s3":      "{{GOOGLE_SHEET_ACCESS_ID}}",
    "s4":      "{{GOOGLE_SHEET_ARCHIVE_ID}}",
}

def token():
    creds = service_account.Credentials.from_service_account_file(KEY, scopes=SCOPES)
    creds.refresh(google.auth.transport.requests.Request())
    return creds.token

def sid(x):
    return SHEETS.get(x, x)

def meta(t, spreadsheet):
    r = requests.get(f"{BASE}/{sid(spreadsheet)}",
        params={"fields": "properties.title,sheets.properties(title,gridProperties(rowCount,columnCount))"},
        headers={"Authorization": f"Bearer {t}"})
    r.raise_for_status()
    return r.json()

def values(t, spreadsheet, rng):
    r = requests.get(f"{BASE}/{sid(spreadsheet)}/values/{requests.utils.quote(rng)}",
        headers={"Authorization": f"Bearer {t}"})
    r.raise_for_status()
    return r.json().get("values", [])

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["map", "meta", "read"])
    ap.add_argument("--sheet")
    ap.add_argument("--range")
    a = ap.parse_args()
    t = token()
    if a.cmd == "map":
        for name, id_ in SHEETS.items():
            try:
                m = meta(t, id_)
                print(f"\n### {name}  [{id_}]  «{m['properties']['title']}»")
                for s in m["sheets"]:
                    p = s["properties"]; g = p["gridProperties"]
                    print(f"  - {p['title']}  ({g['rowCount']}x{g['columnCount']})")
            except Exception as e:
                print(f"\n### {name}  [{id_}]  ERROR: {e}")
    elif a.cmd == "meta":
        print(json.dumps(meta(t, a.sheet), ensure_ascii=False, indent=2))
    elif a.cmd == "read":
        for row in values(t, a.sheet, a.range):
            print(row)
