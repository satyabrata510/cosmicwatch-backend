"""
Pydantic models for request/response validation.
Maps directly to NASA NeoWs API data structures.
"""

from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


# ── Enums ──────────────────────────────────────────────────────
class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


# ── NASA NEO Input Models ─────────────────────────────────────
class RelativeVelocity(BaseModel):
    kilometers_per_second: str
    kilometers_per_hour: str
    miles_per_hour: str


class MissDistance(BaseModel):
    astronomical: str
    lunar: str
    kilometers: str
    miles: str


class CloseApproachData(BaseModel):
    close_approach_date: str
    close_approach_date_full: Optional[str] = None
    epoch_date_close_approach: Optional[int] = None
    relative_velocity: RelativeVelocity
    miss_distance: MissDistance
    orbiting_body: str


class DiameterRange(BaseModel):
    estimated_diameter_min: float
    estimated_diameter_max: float


class EstimatedDiameter(BaseModel):
    kilometers: DiameterRange
    meters: DiameterRange


class OrbitClass(BaseModel):
    """Orbit classification from NASA."""
    orbit_class_type: Optional[str] = None
    orbit_class_description: Optional[str] = None
    orbit_class_range: Optional[str] = None


class OrbitalData(BaseModel):
    """Keplerian orbital elements from NASA NEO Lookup."""
    orbit_id: Optional[str] = None
    orbit_determination_date: Optional[str] = None
    first_observation_date: Optional[str] = None
    last_observation_date: Optional[str] = None
    data_arc_in_days: Optional[int] = None
    observations_used: Optional[int] = None
    orbit_uncertainty: Optional[str] = None  # 0-9 scale
    minimum_orbit_intersection: Optional[str] = None  # MOID in AU
    jupiter_tisserand_invariant: Optional[str] = None
    epoch_osculation: Optional[str] = None
    eccentricity: Optional[str] = None
    semi_major_axis: Optional[str] = None  # AU
    inclination: Optional[str] = None  # degrees
    ascending_node_longitude: Optional[str] = None  # degrees
    orbital_period: Optional[str] = None  # days
    perihelion_distance: Optional[str] = None  # AU
    perihelion_argument: Optional[str] = None  # degrees
    aphelion_distance: Optional[str] = None  # AU
    perihelion_time: Optional[str] = None
    mean_anomaly: Optional[str] = None  # degrees
    mean_motion: Optional[str] = None  # degrees/day
    equinox: Optional[str] = None
    orbit_class: Optional[OrbitClass] = None


class NeoObject(BaseModel):
    id: str
    neo_reference_id: str
    name: str
    designation: Optional[str] = None
    nasa_jpl_url: Optional[str] = None
    absolute_magnitude_h: float
    is_potentially_hazardous_asteroid: bool
    is_sentry_object: Optional[bool] = None
    estimated_diameter: EstimatedDiameter
    close_approach_data: list[CloseApproachData]
    orbital_data: Optional[OrbitalData] = None


# ── Risk Analysis Request ─────────────────────────────────────
class RiskAnalysisRequest(BaseModel):
    asteroids: list[NeoObject]
    date_range: Optional[dict] = None  # { start, end }


# ── Risk Analysis Response Models ─────────────────────────────
class ScoreBreakdown(BaseModel):
    hazardous_points: float = Field(description="Points from NASA hazardous flag (0-15)")
    diameter_points: float = Field(description="Points from estimated diameter (0-20)")
    miss_distance_points: float = Field(description="Points from closest approach distance (0-25)")
    velocity_points: float = Field(description="Points from relative velocity (0-15)")
    kinetic_energy_points: float = Field(description="Points from kinetic energy estimate (0-15)")
    orbital_uncertainty_points: float = Field(description="Points from orbital uncertainty (0-10)")


class RiskAssessment(BaseModel):
    asteroid_id: str
    name: str
    risk_level: RiskLevel
    risk_score: float = Field(ge=0, le=100)
    hazardous: bool
    estimated_diameter_km: float
    miss_distance_km: float
    miss_distance_lunar: float
    velocity_km_s: float
    velocity_km_h: float
    closest_approach_date: str
    # Enhanced physics-based fields
    kinetic_energy_mt: float = Field(description="Kinetic energy in megatons TNT")
    kinetic_energy_joules: float = Field(description="Kinetic energy in Joules")
    estimated_mass_kg: float = Field(description="Estimated mass in kg")
    torino_scale: int = Field(ge=0, le=10, description="Torino impact hazard scale (0-10)")
    palermo_scale: float = Field(description="Palermo technical impact hazard scale")
    impact_probability: float = Field(description="Estimated impact probability")
    impact_energy_comparison: str = Field(description="Energy comparison to known events")
    relative_size: str = Field(description="Size comparison to familiar objects")
    approach_count: int = Field(description="Number of close approaches in window")
    score_breakdown: ScoreBreakdown


class AsteroidSummary(BaseModel):
    asteroid_id: str
    name: str
    value: float
    date: Optional[str] = None


class RiskStatistics(BaseModel):
    total_analyzed: int
    hazardous_count: int
    by_risk_level: dict[str, int]
    average_risk_score: float
    median_risk_score: float
    std_dev_risk_score: float
    max_risk_score: float
    closest_approach: Optional[AsteroidSummary] = None
    largest_asteroid: Optional[AsteroidSummary] = None
    fastest_asteroid: Optional[AsteroidSummary] = None
    highest_energy: Optional[AsteroidSummary] = None
    total_kinetic_energy_mt: float = Field(description="Sum of all kinetic energies")


class RiskAnalysisResponse(BaseModel):
    success: bool = True
    message: str = "Risk analysis completed"
    engine: str = "python-scientific"
    total_analyzed: int
    date_range: Optional[dict] = None
    statistics: RiskStatistics
    assessments: list[RiskAssessment]


# ── Sentry-Enhanced Models ─────────────────────────────────────
class SentryData(BaseModel):
    """Real Sentry impact monitoring data from CNEOS."""
    designation: str
    cumulative_impact_probability: float
    palermo_cumulative: float
    palermo_max: float
    torino_max: int
    impact_energy_mt: Optional[float] = None
    diameter_km: Optional[float] = None
    mass_kg: Optional[float] = None
    velocity_impact: Optional[float] = None  # km/s
    velocity_infinity: Optional[float] = None  # km/s
    total_virtual_impactors: int = 0
    virtual_impactors: Optional[list[dict]] = None


class SentryEnhancedRequest(BaseModel):
    """Request with NEO data + real Sentry data for enhanced analysis."""
    asteroid: NeoObject
    sentry_data: SentryData


class SentryEnhancedAssessment(RiskAssessment):
    """Risk assessment enhanced with real CNEOS Sentry data."""
    sentry_available: bool = True
    sentry_designation: str = ""
    real_impact_probability: float = 0.0
    real_palermo_cumulative: float = -10.0
    real_palermo_max: float = -10.0
    real_torino_max: int = 0
    real_impact_energy_mt: Optional[float] = None
    total_virtual_impactors: int = 0
    data_source: str = "CNEOS Sentry + NASA NeoWs"
