"""
Physics computations: mass, kinetic energy, impact probability, H→D.
Uses astropy constants + NumPy for precision & vectorized performance.
"""

import math
import numpy as np

from app.engine.constants import (
    AVG_DENSITY_KG_M3,
    MT_JOULES,
    EARTH_RADIUS_KM,
    EARTH_RADIUS_M,
    V_ESCAPE_KM_S,
    V_ESCAPE_M_S,
    AU_KM,
    DEFAULT_ALBEDO,
    KNOWN_EVENTS,
    SIZE_COMPARISONS,
)


# ── Diameter from Absolute Magnitude ─────────────────────────
def h_to_diameter_km(
    abs_magnitude: float,
    albedo: float = DEFAULT_ALBEDO,
) -> float:
    """
    Convert absolute magnitude H to diameter in km.

    D(km) = 1329 / sqrt(p_v) × 10^{-H/5}

    Ref: Harris & Harris (1997), Bowell et al. (1989)
    """
    return 1329.0 / math.sqrt(albedo) * 10 ** (-abs_magnitude / 5.0)


# ── Mass Estimation ──────────────────────────────────────────
def estimate_mass(diameter_km: float, density: float = AVG_DENSITY_KG_M3) -> float:
    """
    Estimate asteroid mass assuming a sphere.
    M = (4/3) × π × r³ × ρ
    """
    radius_m = (diameter_km * 1000) / 2
    volume_m3 = (4 / 3) * np.pi * radius_m**3
    return float(volume_m3 * density)


# ── Kinetic Energy ───────────────────────────────────────────
def kinetic_energy_joules(mass_kg: float, velocity_km_s: float) -> float:
    """KE = ½mv²   (returns Joules)."""
    v_m_s = velocity_km_s * 1000
    return float(0.5 * mass_kg * v_m_s**2)


def kinetic_energy_megatons(energy_joules: float) -> float:
    """Convert Joules → megatons TNT equivalent."""
    return float(energy_joules / MT_JOULES)


# ── Impact Probability ───────────────────────────────────────
def estimate_impact_probability(
    miss_distance_km: float,
    diameter_km: float,
    velocity_km_s: float,
    *,
    moid_au: float | None = None,
    orbit_uncertainty: int | None = None,
) -> float:
    """
    Estimate impact probability.

    When MOID (Minimum Orbit Intersection Distance) is available from
    NASA orbital data, it is used as the primary metric:

      • MOID < R_eff  ⇒  high probability (Earth-crossing orbit)
      • MOID < 0.05 AU ⇒  scaled probability
      • MOID > 0.05 AU ⇒  negligible

    Otherwise falls back to the geometric cross-section model using
    gravitational focusing:

      σ_eff = π × R_eff²  where  R_eff = R_earth × √(1 + v_esc²/v_inf²)
    """
    # ── MOID-based calculation (preferred) ───────────────
    if moid_au is not None and moid_au >= 0:
        moid_km = moid_au * AU_KM

        # Gravitational focusing → effective capture radius
        if velocity_km_s > 0:
            focusing = 1 + (V_ESCAPE_KM_S / velocity_km_s) ** 2
        else:
            focusing = 1
        r_eff_km = EARTH_RADIUS_KM * math.sqrt(focusing)

        if moid_km <= r_eff_km:
            # Orbit passes through Earth's capture volume
            base_prob = 0.5
        elif moid_km < 0.002 * AU_KM:  # < 0.002 AU ≈ 300,000 km
            base_prob = math.exp(-0.5 * ((moid_km - r_eff_km) / (r_eff_km * 10)) ** 2)
        elif moid_km < 0.05 * AU_KM:   # < 0.05 AU ≈ 7.5 million km
            base_prob = 1e-6 * math.exp(-moid_km / (0.01 * AU_KM))
        else:
            base_prob = 1e-12

        # Scale by orbital uncertainty (0 = best, 9 = worst)
        if orbit_uncertainty is not None:
            # Higher uncertainty ⇒ probability rises (wider confidence interval)
            uncertainty_factor = 1.0 + 0.5 * orbit_uncertainty  # 1× – 5.5×
            base_prob *= uncertainty_factor

        return max(1e-15, min(1.0, base_prob))

    # ── Geometric cross-section fallback ─────────────────
    if velocity_km_s > 0:
        focusing = 1 + (V_ESCAPE_KM_S / velocity_km_s) ** 2
    else:
        focusing = 1

    r_eff = EARTH_RADIUS_KM * math.sqrt(focusing)

    if miss_distance_km <= r_eff:
        return 1.0

    sigma = r_eff * 5
    prob = math.exp(-0.5 * (miss_distance_km / sigma) ** 2)

    return max(1e-15, min(1.0, prob))


# ── Comparisons ──────────────────────────────────────────────
def energy_comparison(energy_mt: float) -> str:
    """Compare kinetic energy to known events."""
    if energy_mt <= 0:
        return "negligible"

    closest_name = ""
    closest_ratio = float("inf")
    closest_mult = 1.0

    for name, event_mt in KNOWN_EVENTS.items():
        ratio = energy_mt / event_mt
        log_diff = abs(math.log10(max(ratio, 1e-30)))
        if log_diff < closest_ratio:
            closest_ratio = log_diff
            closest_name = name
            closest_mult = ratio

    if closest_mult < 0.01:
        return f"~{closest_mult:.4f}× {closest_name}"
    elif closest_mult < 1:
        return f"~{closest_mult:.2f}× {closest_name}"
    elif closest_mult < 100:
        return f"~{closest_mult:.1f}× {closest_name}"
    else:
        return f"~{closest_mult:.0f}× {closest_name}"


def size_comparison(diameter_km: float) -> str:
    """Human-friendly size comparison."""
    for threshold, description in SIZE_COMPARISONS:
        if diameter_km <= threshold:
            return f"~size of {description} ({diameter_km*1000:.1f}m)"
    return f"~{diameter_km:.1f} km across (massive)"
