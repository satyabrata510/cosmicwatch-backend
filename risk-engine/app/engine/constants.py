"""
Physical constants using astropy for precision, plus known event
energies and size comparison data.
"""

import astropy.constants as const
import astropy.units as u

# ── Astropy-derived Physical Constants ─────────────────────────
EARTH_MASS_KG = const.M_earth.to(u.kg).value  # 5.972e24 kg
EARTH_RADIUS_KM = const.R_earth.to(u.km).value  # 6371.0 km
EARTH_RADIUS_M = const.R_earth.to(u.m).value
AU_KM = const.au.to(u.km).value  # 149_597_870.7 km
AU_M = const.au.to(u.m).value
G_CONSTANT = const.G.to(u.m**3 / (u.kg * u.s**2)).value

# Escape velocity: v_esc = sqrt(2GM/R)
V_ESCAPE_M_S = (
    (2 * const.G * const.M_earth / const.R_earth) ** 0.5
).to(u.m / u.s).value
V_ESCAPE_KM_S = V_ESCAPE_M_S / 1000  # ~11.186 km/s

# ── Asteroid Density Estimates ─────────────────────────────────
LUNAR_DISTANCE_KM = 384_400  # avg Earth-Moon distance in km
ROCK_DENSITY_KG_M3 = 2_600  # S-type silicaceous asteroid
IRON_DENSITY_KG_M3 = 7_800  # M-type metallic asteroid
CARB_DENSITY_KG_M3 = 1_300  # C-type carbonaceous asteroid
AVG_DENSITY_KG_M3 = 2_600  # weighted average (S-type most common)

# ── Energy Units ───────────────────────────────────────────────
TNT_JOULES = 4.184e9  # 1 ton TNT in Joules
MT_JOULES = 4.184e15  # 1 megaton TNT in Joules
KT_JOULES = 4.184e12  # 1 kiloton TNT in Joules

# ── Default Albedo for H→D Conversion ─────────────────────────
# p_v varies by spectral type: S~0.20, C~0.06, M~0.10
# Use 0.14 as a default (IAU convention for unknown type)
DEFAULT_ALBEDO = 0.14

# Known event energies for comparison (megatons TNT)
KNOWN_EVENTS: dict[str, float] = {
    "Hiroshima bomb": 0.015,
    "Chelyabinsk 2013": 0.44,
    "Tunguska 1908": 15.0,
    "Tsar Bomba": 50.0,
    "Krakatoa eruption": 200.0,
    "K-T impactor (dinosaur extinction)": 4.2e7,
}

# Size comparisons: (diameter_km_threshold, description)
SIZE_COMPARISONS: list[tuple[float, str]] = [
    (0.001, "a car"),
    (0.005, "a school bus"),
    (0.01, "a house"),
    (0.025, "the Statue of Liberty"),
    (0.05, "the Leaning Tower of Pisa"),
    (0.1, "a football field"),
    (0.3, "the Eiffel Tower"),
    (0.5, "the CN Tower"),
    (1.0, "Golden Gate Bridge length"),
    (5.0, "Mount Everest base diameter"),
    (10.0, "Manhattan island"),
]
