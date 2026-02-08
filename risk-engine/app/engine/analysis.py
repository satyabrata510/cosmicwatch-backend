"""
Batch analysis with NumPy-vectorized statistical aggregation.
"""

import numpy as np
from typing import Optional

from app.models import (
    NeoObject,
    RiskAssessment,
    RiskStatistics,
    RiskAnalysisResponse,
    AsteroidSummary,
)
from app.engine.assessment import assess_single


def analyze_batch(
    asteroids: list[NeoObject], date_range: Optional[dict] = None
) -> RiskAnalysisResponse:
    """
    Perform batch risk analysis using NumPy vectorization for statistics.
    """
    # Count approaches per asteroid
    approach_counts: dict[str, int] = {}
    for ast in asteroids:
        aid = ast.neo_reference_id
        approach_counts[aid] = approach_counts.get(aid, 0) + len(
            ast.close_approach_data
        )

    # Assess each asteroid
    assessments: list[RiskAssessment] = []
    for ast in asteroids:
        result = assess_single(ast, approach_counts.get(ast.neo_reference_id, 1))
        if result:
            assessments.append(result)

    # Sort by risk score descending
    assessments.sort(key=lambda a: a.risk_score, reverse=True)

    # ── Compute Statistics with NumPy ────────────────────
    statistics = _compute_statistics(assessments)

    return RiskAnalysisResponse(
        total_analyzed=len(assessments),
        date_range=date_range,
        statistics=statistics,
        assessments=assessments,
    )


def _compute_statistics(assessments: list[RiskAssessment]) -> RiskStatistics:
    """Aggregate statistics using NumPy for vectorized computation."""
    if not assessments:
        return RiskStatistics(
            total_analyzed=0,
            hazardous_count=0,
            by_risk_level={"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0},
            average_risk_score=0,
            median_risk_score=0,
            std_dev_risk_score=0,
            max_risk_score=0,
            total_kinetic_energy_mt=0,
        )

    # Vectorize key metrics
    scores = np.array([a.risk_score for a in assessments])
    distances = np.array([a.miss_distance_km for a in assessments])
    diameters = np.array([a.estimated_diameter_km for a in assessments])
    velocities = np.array([a.velocity_km_h for a in assessments])
    energies = np.array([a.kinetic_energy_mt for a in assessments])

    # Risk level distribution
    level_counts = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    for a in assessments:
        level_counts[a.risk_level.value] += 1

    # Find extremes
    closest_idx = int(np.argmin(distances))
    largest_idx = int(np.argmax(diameters))
    fastest_idx = int(np.argmax(velocities))
    energy_idx = int(np.argmax(energies))

    return RiskStatistics(
        total_analyzed=len(assessments),
        hazardous_count=sum(1 for a in assessments if a.hazardous),
        by_risk_level=level_counts,
        average_risk_score=round(float(np.mean(scores)), 2),
        median_risk_score=round(float(np.median(scores)), 2),
        std_dev_risk_score=round(float(np.std(scores)), 2),
        max_risk_score=round(float(np.max(scores)), 2),
        total_kinetic_energy_mt=round(float(np.sum(energies)), 6),
        closest_approach=AsteroidSummary(
            asteroid_id=assessments[closest_idx].asteroid_id,
            name=assessments[closest_idx].name,
            value=round(float(distances[closest_idx]), 2),
            date=assessments[closest_idx].closest_approach_date,
        ),
        largest_asteroid=AsteroidSummary(
            asteroid_id=assessments[largest_idx].asteroid_id,
            name=assessments[largest_idx].name,
            value=round(float(diameters[largest_idx]), 6),
        ),
        fastest_asteroid=AsteroidSummary(
            asteroid_id=assessments[fastest_idx].asteroid_id,
            name=assessments[fastest_idx].name,
            value=round(float(velocities[fastest_idx]), 2),
        ),
        highest_energy=AsteroidSummary(
            asteroid_id=assessments[energy_idx].asteroid_id,
            name=assessments[energy_idx].name,
            value=round(float(energies[energy_idx]), 6),
        ),
    )
