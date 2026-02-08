"""
═══════════════════════════════════════════════════════════════
 Cosmic Watch — Scientific Risk Analysis Engine (Facade)

 Delegates to specialized modules:
 - physics: mass, kinetic energy, impact probability
 - scales: Torino & Palermo computation
 - scoring: multi-factor weighted scoring
 - assessment: single & sentry-enhanced assessment
 - analysis: batch analysis with statistics
═══════════════════════════════════════════════════════════════
"""

from typing import Optional

from app.models import (
    NeoObject,
    RiskAssessment,
    RiskLevel,
    ScoreBreakdown,
    RiskAnalysisResponse,
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
from app.engine.assessment import assess_single, assess_with_sentry
from app.engine.analysis import analyze_batch


class RiskEngine:
    """
    Scientific NEO risk assessment engine — facade class.
    Delegates to specialized modules for clean separation of concerns.
    """

    # ── Physics ──────────────────────────────────────────────
    estimate_mass = staticmethod(estimate_mass)
    kinetic_energy_joules = staticmethod(kinetic_energy_joules)
    kinetic_energy_megatons = staticmethod(kinetic_energy_megatons)
    energy_comparison = staticmethod(energy_comparison)
    size_comparison = staticmethod(size_comparison)
    estimate_impact_probability = staticmethod(estimate_impact_probability)

    # ── Scales ───────────────────────────────────────────────
    compute_torino_scale = staticmethod(compute_torino_scale)
    compute_palermo_scale = staticmethod(compute_palermo_scale)

    # ── Scoring ──────────────────────────────────────────────
    _compute_score_breakdown = staticmethod(compute_score_breakdown)
    _get_risk_level = staticmethod(get_risk_level)

    # ── Assessment ───────────────────────────────────────────
    @classmethod
    def assess_single(
        cls, asteroid: NeoObject, all_approaches: int = 1
    ) -> Optional[RiskAssessment]:
        return assess_single(asteroid, all_approaches)

    @classmethod
    def assess_with_sentry(
        cls, asteroid: NeoObject, sentry_data: SentryData
    ) -> Optional[SentryEnhancedAssessment]:
        return assess_with_sentry(asteroid, sentry_data)

    # ── Batch Analysis ───────────────────────────────────────
    @classmethod
    def analyze_batch(
        cls,
        asteroids: list[NeoObject],
        date_range: Optional[dict] = None,
    ) -> RiskAnalysisResponse:
        return analyze_batch(asteroids, date_range)
