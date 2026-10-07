# Vedic Astro Platform — Monorepo

Platform-e web-e Farsi/RTL baraye tale-bini-ye Vedic (Jyotish).

## Sakhtar

```
vedic-astro-platform/
├── engine/      # Motor-e nojumi-ye khales (bedoon-e vabastegi be web) — P06
│   ├── constants.py   # Namadha, Nakshatra, Dasha sequence
│   ├── ephemeris.py   # Adapter-e Swiss Ephemeris (Lahiri + fallback Moshier)
│   ├── calendar.py    # Tabdil-e Shamsi/Miladi (jdatetime)
│   ├── timezone.py    # Tabdil-e saat-e mahali ba ghavaed-e IANA (DST/Fold) — P05-T04
│   ├── chart.py       # Mohasebe-ye chart: sayyarat, Asc, Whole Sign (+ D9 Asc)
│   ├── nakshatra.py   # Nakshatra / Pada
│   ├── d9.py          # Navamsa (D9)
│   ├── dasha.py       # Vimshottari Dasha
│   ├── aspects.py     # Zaviyeh-ha + Orb + Applying/Separating — P08-T01
│   ├── synastry.py    # Moqayese-ye du chart — P08-T02
│   └── transit.py     # Transit ≤90 ruz + jost-o-jooiye tasmim — P08-T03/T04
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
    ├── test_timezone.py    # P05-T04/T06
    ├── test_aspects.py     # P08-T01
    ├── test_synastry.py    # P08-T02
    ├── test_transit.py     # P08-T03/T04
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

## Endpoint-ha

| Method | Masir | Tafzilat |
| --- | --- | --- |
| GET | `/health` | Salamati |
| GET | `/cities?q=` | Josto-o-juye shahr (Ieraan, fa/en) |
| POST | `/calendar/convert` | Tabdil-e jalali <-> gregorian |
| POST | `/chart/compute` | Mohasebe-ye chert (D1, D9, Asc, Dasha) |
| POST | `/time/convert` | Saat-e mahali -> UTC ba ghavaed-e IANA |
| POST | `/chart/synastry` | Moqayese-ye du chert (masir-e `a` = referans) |
| POST | `/transit/scan` | Transit dar bazeh-e haddaksar 90 ruz |

### `POST /time/convert` — ghavaed-e zaman-e tarikhi (P05-T04)

* Voroodi: `{year, month, day, hour, minute, tz, fold?}` — `tz` shekl-e IANA
  mesl `Asia/Tehran`.
* Saat-e tekrari (DST fold) **nabayad be motor ferestade shavad**: agar saat
  dobare raqam shavad va `fold` nabayadad, khataye-sakht-yafte
  `AMIGUOUS_LOCAL_TIME` ba do gozine-ye UTC bar migardad; ba `fold` (0/1)
  hal mishavad va `fold` dar khat-e javab bargashti mikonad.
* Saat-e gheyre-vojoodi (DST gap) -> `NON_EXISTENT_LOCAL_TIME` (422).
* Tarikh-ha ke pish az 1970 bashand, `confidence: historical` migirand
  (poushesh-e dade-ye tzdb mahdood ast — P05-T06-M5).

### `time_precision` — saat-e namelum (P05-T05)

Dar `BirthInput` meghdare `exact | approximate | unknown` (default: `exact`).
Ba `unknown`:
* `ascendant`, `houses_whole_sign`, `dasha`, `moon_nakshatra` **tolid nemishavand**
  (list dar `time_sensitive_omitted`);
* mahal-e sayyarat-ha ba `reference_time: "noon_local" `hesab mishavad.

### `POST /transit/scan` — bazeh-e 90-ruze (P08-T03/T04)

* `days` haddaksar 90 (validation dar schema).
* Khorooji: `ingresses` (vorood-e berj + zamane-ye tahik ba bisection) va
* `contacts` (tamase-ye dakheq-e zaviye nesbat be chert-e tavallod).
* Har rodid `house_in_natal` darad baraye tabdile ba'edan be ma'na (P08-T03-M2).

### `POST /chart/synastry` — moqayese-ye du nafar (P08-T02)

* `a` referans ast: sayyarat-ha-ye `b` dar khaneh-haye-ye `a` qarar migirand
  va baro'ose (A<-B va B<-A) bar migardand.
* Ba `time_precision: "unknown"` baraye yeki az du chart, khaneh-ha hazf va
  `limitations: [{code: HOUSES_SKIPPED_UNKNOWN_TIME}]` sabt mishavad;
  aspect-haye sayyari hamchenan kar mikonand.

## Test-ha

```powershell
python -m pytest tests/ -q   # 50 test sabz
```
