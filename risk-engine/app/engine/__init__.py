"""
═══════════════════════════════════════════════════════════════
 Cosmic Watch — Scientific Risk Analysis Engine Package

 Modular architecture for production-level risk assessment:
 - constants: Physical constants, known events, size data
 - physics: Mass estimation, kinetic energy, impact probability
 - scales: Torino & Palermo hazard scale computation
 - scoring: Multi-factor weighted risk scoring
 - assessment: Single & Sentry-enhanced asteroid assessment
 - analysis: Batch analysis with statistical aggregation
═══════════════════════════════════════════════════════════════
"""

from app.engine.risk_engine import RiskEngine

__all__ = ["RiskEngine"]
