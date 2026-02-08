"""
Single asteroid and Sentry-enhanced risk assessment.
Utilises orbital_data (MOID, orbit_uncertainty, Keplerian elements)
when available from NASA NeoWs lookup data.
"""

import math
import logging
from typing import Optional

from app.models import (
    NeoObject,
    RiskAssessment,
    SentryData,
    SentryEnhancedAssessment,
)
from app.engine.physics import (
    estimate_mass,
    kinetic_energy_joules,
    kinetic_energy_megatons,
    energy_comparison,
    size_comparison,
    estimate_impact_probability,
)
from app.engine.scales import compute_torino_scale, compute_palermo_scale
from app.engine.scoring import compute_score_breakdown, get_risk_level

logger = logging.getLogger("risk-engine.assessment")


def _safe_float(value: Optional[str]) -> Optional[float]:
    """Parse a numeric string into float, returning None on failure."""
    if value is None:
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def _safe_int(value: Optional[str]) -> Optional[int]:
    """Parse a numeric string into int, returning None on failure."""
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def assess_single(
    asteroid: NeoObject, all_approaches: int = 1
) -> Optional[RiskAssessment]:
    """Perform full risk assessment on a single asteroid."""
    if not asteroid.close_approach_data:
        return None

    approach = asteroid.close_approach_data[0]

    # Extract raw values
    miss_km = float(approach.miss_distance.kilometers)
    miss_lunar = float(approach.miss_distance.lunar)
    vel_km_s = float(approach.relative_velocity.kilometers_per_second)
    vel_km_h = float(approach.relative_velocity.kilometers_per_hour)
    diam_max = asteroid.estimated_diameter.kilometers.estimated_diameter_max
    diam_min = asteroid.estimated_diameter.kilometers.estimated_diameter_min
    diam_avg = (diam_max + diam_min) / 2

    # ── Extract orbital elements when available ──────────
    moid_au: Optional[float] = None
    orbit_uncertainty: Optional[int] = None
    eccentricity: Optional[float] = None
    semi_major_axis_au: Optional[float] = None
    inclination_deg: Optional[float] = None

    if asteroid.orbital_data:
        od = asteroid.orbital_data
        moid_au = _safe_float(od.minimum_orbit_intersection)
        orbit_uncertainty = _safe_int(od.orbit_uncertainty)
        eccentricity = _safe_float(od.eccentricity)
        semi_major_axis_au = _safe_float(od.semi_major_axis)
        inclination_deg = _safe_float(od.inclination)

        logger.debug(
            f"Orbital data for {asteroid.name}: "
            f"MOID={moid_au} AU, uncertainty={orbit_uncertainty}, "
            f"e={eccentricity}, a={semi_major_axis_au} AU"
        )

    # ── Physics Computations ─────────────────────────────
    mass_kg = estimate_mass(diam_avg)
    ke_joules = kinetic_energy_joules(mass_kg, vel_km_s)
    ke_mt = kinetic_energy_megatons(ke_joules)

    impact_prob = estimate_impact_probability(
        miss_km,
        diam_avg,
        vel_km_s,
        moid_au=moid_au,
        orbit_uncertainty=orbit_uncertainty,
    )

    torino = compute_torino_scale(impact_prob, ke_mt)
    palermo = compute_palermo_scale(impact_prob, ke_mt)

    # ── Weighted Risk Scoring (0-100) ────────────────────
    breakdown = compute_score_breakdown(
        asteroid.is_potentially_hazardous_asteroid,
        diam_max,
        miss_km,
        vel_km_s,
        ke_mt,
        orbit_uncertainty=orbit_uncertainty,
        moid_au=moid_au,
    )
    total_score = (
        breakdown.hazardous_points
        + breakdown.diameter_points
        + breakdown.miss_distance_points
        + breakdown.velocity_points
        + breakdown.kinetic_energy_points
        + breakdown.orbital_uncertainty_points
    )
    total_score = round(max(0, min(100, total_score)), 1)

    risk_level = get_risk_level(total_score)

    return RiskAssessment(
        asteroid_id=asteroid.neo_reference_id,
        name=asteroid.name,
        risk_level=risk_level,
        risk_score=total_score,
        hazardous=asteroid.is_potentially_hazardous_asteroid,
        estimated_diameter_km=round(diam_max, 6),
        miss_distance_km=round(miss_km, 2),
        miss_distance_lunar=round(miss_lunar, 4),
        velocity_km_s=round(vel_km_s, 4),
        velocity_km_h=round(vel_km_h, 2),
        closest_approach_date=approach.close_approach_date,
        kinetic_energy_mt=round(ke_mt, 6),
        kinetic_energy_joules=ke_joules,
        estimated_mass_kg=round(mass_kg, 2),
        torino_scale=torino,
        palermo_scale=palermo,
        impact_probability=impact_prob,
        impact_energy_comparison=energy_comparison(ke_mt),
        relative_size=size_comparison(diam_max),
        approach_count=all_approaches,
        score_breakdown=breakdown,
    )


def assess_with_sentry(
    asteroid: NeoObject,
    sentry_data: SentryData,
) -> Optional[SentryEnhancedAssessment]:
    """
    Enhanced assessment using real CNEOS Sentry impact monitoring data.
    Replaces estimated probabilities with real impact probabilities.
    """
    # First run standard assessment
    base = assess_single(asteroid)
    if not base:
        return None

    # Use real Sentry data for Torino/Palermo/probability
    real_ip = sentry_data.cumulative_impact_probability
    real_palermo_cum = sentry_data.palermo_cumulative
    real_palermo_max = sentry_data.palermo_max
    real_torino = sentry_data.torino_max

    # Use Sentry's energy if available, otherwise keep computed
    real_energy = sentry_data.impact_energy_mt or base.kinetic_energy_mt

    # Recompute risk score with real data incorporated
    base_score = base.risk_score

    # Probability factor: compare real vs estimated
    estimated_prob = base.impact_probability
    if estimated_prob > 0 and real_ip > 0:
        prob_ratio = math.log10(max(real_ip, 1e-15)) - math.log10(
            max(estimated_prob, 1e-15)
        )
        # Each order of magnitude in real probability adjusts score by 5 points
        score_adjustment = prob_ratio * 5
    else:
        score_adjustment = 0

    # Palermo scale factor: negative → low risk, positive → high risk
    palermo_bonus = 0.0
    if real_palermo_cum > -2:
        palermo_bonus = (real_palermo_cum + 2) * 3  # merits monitoring
    if real_palermo_cum >= 0:
        palermo_bonus += 10  # serious concern

    adjusted_score = round(
        max(0, min(100, base_score + score_adjustment + palermo_bonus)), 1
    )
    adjusted_level = get_risk_level(adjusted_score)

    enhanced = SentryEnhancedAssessment(
        # Copy all base fields
        asteroid_id=base.asteroid_id,
        name=base.name,
        risk_level=adjusted_level,
        risk_score=adjusted_score,
        hazardous=base.hazardous,
        estimated_diameter_km=base.estimated_diameter_km,
        miss_distance_km=base.miss_distance_km,
        miss_distance_lunar=base.miss_distance_lunar,
        velocity_km_s=base.velocity_km_s,
        velocity_km_h=base.velocity_km_h,
        closest_approach_date=base.closest_approach_date,
        kinetic_energy_mt=base.kinetic_energy_mt,
        kinetic_energy_joules=base.kinetic_energy_joules,
        estimated_mass_kg=base.estimated_mass_kg,
        torino_scale=real_torino,
        palermo_scale=real_palermo_cum,
        impact_probability=real_ip,
        impact_energy_comparison=base.impact_energy_comparison,
        relative_size=base.relative_size,
        approach_count=base.approach_count,
        score_breakdown=base.score_breakdown,
        # Sentry-specific fields
        sentry_available=True,
        sentry_designation=sentry_data.designation,
        real_impact_probability=real_ip,
        real_palermo_cumulative=real_palermo_cum,
        real_palermo_max=real_palermo_max,
        real_torino_max=real_torino,
        real_impact_energy_mt=real_energy,
        total_virtual_impactors=sentry_data.total_virtual_impactors,
        data_source="CNEOS Sentry + NASA NeoWs",
    )

    logger.info(
        f"Sentry-enhanced assessment for {base.name}: "
        f"base_score={base_score} → adjusted={adjusted_score} "
        f"(real IP={real_ip:.2e}, Palermo={real_palermo_cum})"
    )

    return enhanced
