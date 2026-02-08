"""
Multi-factor weighted risk scoring system.
6-factor scoring with NumPy for computation.
Accepts real orbital uncertainty from NASA orbital_data when available.
"""

import math
import numpy as np

from app.engine.constants import LUNAR_DISTANCE_KM
from app.models import ScoreBreakdown, RiskLevel


def compute_score_breakdown(
    is_hazardous: bool,
    diameter_km: float,
    miss_distance_km: float,
    velocity_km_s: float,
    kinetic_energy_mt: float,
    *,
    orbit_uncertainty: int | None = None,
    moid_au: float | None = None,
) -> ScoreBreakdown:
    """
    Multi-factor risk scoring using NumPy.

    Factor weights:
    - Hazardous flag:        15 pts (NASA classification)
    - Diameter:              20 pts (log-scaled, 1m-10km)
    - Miss distance:         25 pts (inverse log, lunar distances)
    - Velocity:              15 pts (relative to avg NEO speed)
    - Kinetic energy:        15 pts (log-scaled, composite metric)
    - Orbital uncertainty:   10 pts (real NASA value 0-9 if available)
    Total possible:         100 pts

    Parameters
    ----------
    orbit_uncertainty : int | None
        NASA orbit condition code (0 = very precise, 9 = very uncertain).
        When provided, maps directly to the 10-pt orbital uncertainty score.
    moid_au : float | None
        Minimum Orbit Intersection Distance in AU (from orbital_data).
        Used as a secondary signal for the distance score.
    """
    # 1. Hazardous flag: 0 or 15
    hazardous_pts = 15.0 if is_hazardous else 0.0

    # 2. Diameter: log-scaled (1m = 0pts, 10km = 20pts)
    diam_log = math.log10(max(diameter_km, 0.0001))
    diam_pts = float(np.clip((diam_log + 3) / 4 * 20, 0, 20))

    # 3. Miss distance: inverse relationship (closer = higher)
    lunar_dist = miss_distance_km / LUNAR_DISTANCE_KM
    if lunar_dist <= 0.5:
        dist_pts = 25.0
    elif lunar_dist <= 1:
        dist_pts = 22.0
    elif lunar_dist <= 3:
        dist_pts = 18.0
    elif lunar_dist <= 5:
        dist_pts = 15.0
    elif lunar_dist <= 10:
        dist_pts = 12.0
    elif lunar_dist <= 20:
        dist_pts = 8.0
    elif lunar_dist <= 50:
        dist_pts = 4.0
    else:
        dist_pts = float(np.clip(4 * math.exp(-0.02 * (lunar_dist - 50)), 0, 4))

    # Bonus: if MOID is very small, boost distance score
    if moid_au is not None and moid_au < 0.05:
        moid_bonus = (0.05 - moid_au) / 0.05 * 3  # up to 3 bonus pts
        dist_pts = min(25.0, dist_pts + moid_bonus)

    # 4. Velocity: normalized to typ. NEO speed (~15 km/s avg, up to 72 km/s)
    vel_norm = velocity_km_s / 72.0
    vel_pts = float(np.clip(vel_norm * 15, 0, 15))

    # 5. Kinetic energy: log-scaled (covers huge range)
    if kinetic_energy_mt > 0:
        ke_log = math.log10(kinetic_energy_mt)
        ke_pts = float(np.clip((ke_log + 6) / 11 * 15, 0, 15))
    else:
        ke_pts = 0.0

    # 6. Orbital uncertainty: use real NASA value when available
    if orbit_uncertainty is not None:
        # NASA orbit condition code: 0 (best) → 9 (worst).
        # Higher uncertainty → higher risk score (we know less).
        orbit_pts = float(np.clip(orbit_uncertainty / 9 * 10, 0, 10))
    else:
        # Fallback: estimate from proximity
        if lunar_dist < 1:
            orbit_pts = 10.0
        elif lunar_dist < 5:
            orbit_pts = 7.0
        elif lunar_dist < 20:
            orbit_pts = 4.0
        else:
            orbit_pts = 1.0

    return ScoreBreakdown(
        hazardous_points=round(hazardous_pts, 2),
        diameter_points=round(diam_pts, 2),
        miss_distance_points=round(dist_pts, 2),
        velocity_points=round(vel_pts, 2),
        kinetic_energy_points=round(ke_pts, 2),
        orbital_uncertainty_points=round(orbit_pts, 2),
    )


def get_risk_level(score: float) -> RiskLevel:
    """Map numeric score to risk level category."""
    if score >= 75:
        return RiskLevel.CRITICAL
    elif score >= 50:
        return RiskLevel.HIGH
    elif score >= 25:
        return RiskLevel.MEDIUM
    return RiskLevel.LOW
