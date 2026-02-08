"""
Torino and Palermo impact hazard scale computations.

The Torino Scale uses a 2-D mapping of **collision probability (Pc)**
and **kinetic energy (E)** onto integer categories 0-10.  The dividing
curves follow the official NASA/IAU definition adopted in 1999 and
revised in 2005.

Reference:
  Binzel, R.P. (2000) "The Torino Impact Hazard Scale", PSS 48(4) 297-303
  https://cneos.jpl.nasa.gov/sentry/torino_scale.html
"""

import math

from app.engine.constants import MT_JOULES, KT_JOULES


# ── Energy thresholds (Joules) for the Torino grid ─────────────
# E1 ≈ 1 MT  — threshold "locally destructive"
# E2 ≈ 10³ MT — threshold "globally devastating"
E1_MT = 1.0
E2_MT = 1_000.0

# Background impact probability at a given energy (annualised):
#   P_bg(E) ≈ 0.03 × E_MT^{-0.8}     (E in megatons)
#
# The Torino boundary is set so events whose probability is far below
# the background for their energy level are category 0 (no unusual
# hazard).  The formal definition uses Palermo P < -2 as the floor.


def _palermo(pi: float, e_mt: float, dt: float) -> float:
    """Raw Palermo-scale value (internal helper)."""
    if pi <= 0 or e_mt <= 0 or dt <= 0:
        return -100.0
    f_bg = 0.03 * (e_mt ** -0.8)
    try:
        return math.log10(pi / (f_bg * dt))
    except (ValueError, ZeroDivisionError):
        return -100.0


def compute_torino_scale(
    impact_prob: float,
    kinetic_energy_mt: float,
    *,
    time_years: float = 50.0,
) -> int:
    """
    Official NASA / IAU Torino Scale  (0-10).

    Decision logic per the published category descriptions:

    ╔═══════╦═══════════════════════════════════════════════════╗
    ║ Scale ║ Meaning                                          ║
    ╠═══════╬═══════════════════════════════════════════════════╣
    ║   0   ║ No hazard / chance is zero or well below that    ║
    ║       ║ of an object striking the Earth in the next few  ║
    ║       ║ decades.                                         ║
    ║   1   ║ Normal — merits careful monitoring.              ║
    ║  2-4  ║ Meriting concern — close encounter, some chance. ║
    ║  5-7  ║ Threatening.                                     ║
    ║ 8-10  ║ Certain collisions.                              ║
    ╚═══════╩═══════════════════════════════════════════════════╝
    """
    if impact_prob <= 0 or kinetic_energy_mt <= 0:
        return 0

    pi = impact_prob
    e = kinetic_energy_mt

    # ── Certain collision (Pi ≥ 0.99) ────────────────────
    if pi >= 0.99:
        if e >= E2_MT:
            return 10  # global catastrophe, certain
        if e >= E1_MT:
            return 9   # regional devastation, certain
        return 8       # local damage, certain

    # ── Palermo-based floor: P < −2 ⇒ Torino 0 ──────────
    p = _palermo(pi, e, time_years)
    if p < -2:
        return 0  # below background, no unusual hazard

    # ── Threatening (high prob & large energy) ───────────
    if pi >= 0.01:
        if e >= E2_MT:
            return 7
        if e >= E1_MT:
            return 6
        return 5

    # ── Meriting concern ─────────────────────────────────
    if pi >= 1e-4:
        if e >= E2_MT:
            return 4
        if e >= E1_MT:
            return 3
        return 2

    # ── Normal / merits monitoring ───────────────────────
    if p >= -2:
        return 1

    return 0


def compute_palermo_scale(
    impact_prob: float,
    kinetic_energy_mt: float,
    time_years: float = 50.0,
) -> float:
    """
    Palermo Technical Impact Hazard Scale.

        P = log10( Pi / (f_B × ΔT) )

    Where:
      Pi  = impact probability for the specific object
      f_B = annual background impact frequency at that energy
          = 0.03 × E_MT^{-0.8}  (Brown et al. 2002)
      ΔT  = time window in years

    Interpretation:
      P < −2  : no likely consequence, well below background
      −2 ≤ P < 0 : merits monitoring
      P ≥ 0   : above background — serious concern
    """
    val = _palermo(impact_prob, kinetic_energy_mt, time_years)
    return round(max(-10.0, min(10.0, val)), 3)
