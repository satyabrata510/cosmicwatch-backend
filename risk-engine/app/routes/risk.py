"""
Risk analysis API routes.
Receives asteroid data from Node.js backend, runs scientific analysis.
"""

from fastapi import APIRouter
import time
import logging

from app.models import RiskAnalysisRequest, RiskAnalysisResponse, NeoObject, SentryEnhancedRequest
from app.engine import RiskEngine

router = APIRouter(tags=["Risk Analysis"])
logger = logging.getLogger("risk-engine.routes")


@router.post("/analyze", response_model=RiskAnalysisResponse)
async def analyze_risk(request: RiskAnalysisRequest):
    """
    Full risk analysis on a batch of asteroids.
    Called by the Node.js backend with NASA NEO data.
    
    Returns:
    - Individual risk assessments with physics-based scoring
    - Aggregate statistics (NumPy computed)
    - Torino/Palermo scale classifications
    - Kinetic energy estimates & comparisons
    """
    start = time.perf_counter()

    result = RiskEngine.analyze_batch(
        request.asteroids,
        date_range=request.date_range,
    )

    elapsed_ms = (time.perf_counter() - start) * 1000
    logger.info(
        f"Analyzed {result.total_analyzed} asteroids in {elapsed_ms:.1f}ms"
    )

    return result


@router.post("/analyze/single")
async def analyze_single(asteroid: NeoObject):
    """
    Risk analysis for a single asteroid.
    Used for real-time lookups.
    """
    result = RiskEngine.assess_single(asteroid)
    if not result:
        return {
            "success": False,
            "message": "No close approach data available for this asteroid",
        }

    return {
        "success": True,
        "message": "Single asteroid analysis completed",
        "engine": "python-scientific",
        "data": result,
    }


@router.post("/analyze/sentry-enhanced")
async def analyze_sentry_enhanced(request: SentryEnhancedRequest):
    """
    Enhanced risk analysis using real CNEOS Sentry impact monitoring data.
    Combines NASA NeoWs orbital data with Sentry's real impact probabilities,
    Torino scale, and Palermo scale values for authoritative risk assessment.
    """
    start = time.perf_counter()

    result = RiskEngine.assess_with_sentry(
        request.asteroid,
        request.sentry_data,
    )

    elapsed_ms = (time.perf_counter() - start) * 1000

    if not result:
        return {
            "success": False,
            "message": "No close approach data available for this asteroid",
        }

    logger.info(
        f"Sentry-enhanced analysis for {request.sentry_data.designation} in {elapsed_ms:.1f}ms"
    )

    return {
        "success": True,
        "message": "Sentry-enhanced analysis completed",
        "engine": "python-scientific-sentry",
        "data": result,
    }
