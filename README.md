# Vedic Astro Platform — Monorepo

Platform-e web-e Farsi/RTL baraye tale-bini-ye Vedic (Jyotish).

## Sakhtar

```
vedic-astro-platform/
├── engine/      # Motor-e nojumi-ye khales (bedoon-e vabastegi be web) — P06
│   ├── constants.py   # Namadha, Nakshatra, Dasha sequence
│   ├── ephemeris.py   # Adapter-e Swiss Ephemeris (Lahiri + fallback Moshier)
│   ├── calendar.py    # Tabdil-e Shamsi/Miladi (jdatetime)
│   ├── chart.py       # Mohasebe-ye chart: sayyarat, Asc, Whole Sign
│   ├── nakshatra.py   # Nakshatra / Pada
│   ├── d9.py          # Navamsa (D9)
│   └── dasha.py       # Vimshottari Dasha
├── backend/     # FastAPI — P05 + P07
│   ├── main.py      # App + endpoint-ha
│   ├── schemas.py   # Pydantic models
│   └── cities.py    # Dataset-e kuchak-e shahr-haye Iran + search
├── frontend/    # React + TypeScript + Vite (RTL) — P09
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
└── tests/       # Pytest — TEST-xxx
    ├── test_calendar.py
    ├── test_engine.py
    └── test_api.py
```

## Ejra-ye sari (Quickstart)

```powershell
# 1) Nasb-e vabastegi-haye Python
python -m pip install -r backend/requirements.txt

# 2) Ejra-ye backend
python -m uvicorn backend.main:app --reload --port 8000 --app-dir .

# 3) Ejra-ye frontend (terminal-e joda)
cd frontend; npm install; npm run dev
```

* Backend: http://localhost:8000 — docs: http://localhost:8000/docs
* Frontend: http://localhost:5173

## Gharardad-e mohasebati (az asnad-e proje)

* Zodiac: Sidereal | Ayanamsa: Lahiri | House system: Whole Sign
* Ephemeris: Swiss Ephemeris (fail-e `se*`) — dar nabud-e fail be Moshier soghut
  mikonad va parcham-e `ephemeris_flag` sabt mishavad (P06-T01-M4).
