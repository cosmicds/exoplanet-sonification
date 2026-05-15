"""
generate_exoplanet_data.py
Fetches the latest exoplanet data from the NASA Exoplanet Archive TAP API
and regenerates src/exoplanetData.ts.

Run manually:   python generate_exoplanet_data.py
Run in CI:      same command — idempotent for identical NASA input.
"""

from __future__ import annotations

import math
import os
import re
import sys
import pandas as pd

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

NASA_TAP_URL = (
    "https://exoplanetarchive.ipac.caltech.edu/TAP/sync"
    "?query=SELECT+pl_name,ra,dec,sy_dist,discoverymethod,"
    "disc_pubdate,pl_orbper,pl_orbsmax,pl_bmassj,st_mass"
    "+FROM+pscomppars"
    "+ORDER+BY+disc_pubdate+ASC"
    "&format=csv"
)

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "src", "exoplanetData.ts")

END_DATE = "2100-01-01"

# G in AU³ / (M_jup · day²)
G_AU_MJUP_DAY = 2.959122082855911e-04 * (1 / 1047.348644)  # from astropy values

# M_sun in M_jup
MSUN_IN_MJUP = 1047.348644

# ---------------------------------------------------------------------------
# Discovery-method → (export variable name, Catalog column value)
# Everything not in the explicit map falls into timingVariations, preserving
# the original NASA value in the Catalog column.
# ---------------------------------------------------------------------------

DIRECT_MAP: dict[str, tuple[str, str]] = {
    "Transit":                      ("transit",                      "Transit"),
    "Radial Velocity":               ("radialVelocity",               "Radial Velocity"),
    "Microlensing":                  ("microlensing",                 "Microlensing"),
    "Imaging":                       ("imaging",                      "Imaging"),
    "Astrometry":                    ("astrometry",                   "Astrometry"),
    "Orbital Brightness Modulation": ("orbitalBrightnessModulation",  "Orbital Brightness Modulation"),
    "Disk Kinematics":               ("diskKinematics",               "Disk Kinematics"),
}

# Ordered list of export variable names for the output file
EXPORT_ORDER = [
    "astrometry",
    "diskKinematics",
    "imaging",
    "microlensing",
    "orbitalBrightnessModulation",
    "radialVelocity",
    "timingVariations",
    "transit",
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def generate_period(a: float, m: float, M: float) -> float:
    """Orbital period in days from Kepler's 3rd law.
    a = semi-major axis (AU), m = planet mass (M_jup), M = star mass (M_jup).
    Returns 0 if any input is zero/missing.
    """
    if a == 0 or m == 0 or M == 0:
        return 0.0
    return math.sqrt(((4 * math.pi ** 2) / (G_AU_MJUP_DAY * (M + m))) * a ** 3)


def normalize_pubdate(raw: str) -> str:
    """Convert 'YYYY-MM' or 'YYYY-MM-DD' from NASA into 'YYYY-MM-DD'.
    Fixes month-00 artefacts: 'YYYY-00' → 'YYYY-01-01'.
    """
    if not isinstance(raw, str) or not raw.strip():
        return "1970-01-01"
    s = raw.strip()
    parts = s.split("-")
    year = parts[0] if len(parts) > 0 else "1970"
    month = parts[1] if len(parts) > 1 else "01"
    day   = parts[2] if len(parts) > 2 else "01"
    if month == "00":
        month = "01"
        day   = "01"
    if day == "00":
        day = "01"
    return f"{year}-{month.zfill(2)}-{day.zfill(2)}"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    print("Fetching data from NASA Exoplanet Archive …")
    try:
        df = pd.read_csv(NASA_TAP_URL)
    except Exception as exc:
        print(f"ERROR: could not fetch NASA data: {exc}", file=sys.stderr)
        sys.exit(1)

    print(f"  {len(df)} rows fetched.")

    # Fill NaN with 0 for numeric columns used below
    for col in ("pl_orbper", "pl_orbsmax", "pl_bmassj", "st_mass", "sy_dist"):
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)

    # Normalize publication dates
    df["disc_pubdate"] = df["disc_pubdate"].apply(normalize_pubdate)

    # Fill missing orbital periods via Kepler's 3rd law
    missing_period = df["pl_orbper"] == 0
    df.loc[missing_period, "pl_orbper"] = df.loc[missing_period].apply(
        lambda row: generate_period(
            row["pl_orbsmax"],
            row["pl_bmassj"],
            row["st_mass"] * MSUN_IN_MJUP,
        ),
        axis=1,
    )

    # For any still-zero periods, substitute the column mean
    nonzero_mean = df.loc[df["pl_orbper"] > 0, "pl_orbper"].mean()
    df.loc[df["pl_orbper"] == 0, "pl_orbper"] = nonzero_mean

    # Derived columns
    df["scaled_orbper"] = df["pl_orbper"] * 100.0
    df["end_date"] = END_DATE

    # Sort by disc_pubdate ascending
    df = df.sort_values("disc_pubdate").reset_index(drop=True)

    # ---------------------------------------------------------------------------
    # Group rows into exports
    # ---------------------------------------------------------------------------
    exports: dict[str, list[str]] = {key: [] for key in EXPORT_ORDER}

    for _, row in df.iterrows():
        method = str(row.get("discoverymethod", "")).strip()

        if method in DIRECT_MAP:
            var_name, catalog_value = DIRECT_MAP[method]
        else:
            # All timing variants and anything else → timingVariations
            var_name = "timingVariations"
            catalog_value = method  # preserve original NASA value

        name    = str(row["pl_name"]).replace(",", " ")
        ra      = row["ra"]
        dec     = row["dec"]
        dist    = row["sy_dist"]
        pubdate = row["disc_pubdate"]
        orbper  = row["pl_orbper"]
        scaled  = row["scaled_orbper"]

        exports[var_name].append(
            f"{name},{ra},{dec},{dist},{catalog_value},{pubdate},{orbper},{scaled},{END_DATE}"
        )

    # ---------------------------------------------------------------------------
    # Write src/exoplanetData.ts
    # ---------------------------------------------------------------------------
    header = "NAME,RA,DEC,DIST,Catalog,disc_pubdate,pl_orbper,scaled_orbper,end_date"
    lines: list[str] = []

    for var_name in EXPORT_ORDER:
        rows = exports[var_name]
        lines.append(f"export const {var_name} = `{header}")
        for r in rows:
            lines.append(r)
        lines.append("`;\n")

    output = "\n".join(lines)

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        f.write(output)

    total = sum(len(v) for v in exports.values())
    print(f"  Wrote {total} planets across {len(EXPORT_ORDER)} exports -> {OUTPUT_PATH}")
    for var_name in EXPORT_ORDER:
        print(f"    {var_name}: {len(exports[var_name])} rows")

    # ---------------------------------------------------------------------------
    # Update the planet count in the intro modal (src/exo-sonification.vue)
    # Replaces patterns like "6,000" or "6,160" with the current count.
    # ---------------------------------------------------------------------------
    formatted = f"{total:,}"  # e.g. "6,160"

    vue_path = os.path.join(os.path.dirname(__file__), "src", "exo-sonification.vue")
    if os.path.exists(vue_path):
        with open(vue_path, "r", encoding="utf-8") as f:
            vue_src = f.read()

        updated, n = re.subn(
            r"[\d,]+ known exoplanets",
            f"{formatted} known exoplanets",
            vue_src,
        )
        if n:
            with open(vue_path, "w", encoding="utf-8") as f:
                f.write(updated)
            print(f"  Updated intro modal count to {formatted} in {vue_path}")
        else:
            print(f"  WARNING: could not find count pattern in {vue_path} — intro modal not updated")


if __name__ == "__main__":
    main()
