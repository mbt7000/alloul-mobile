"""
Feature Flags Configuration
إدارة الميزات المفعلة/المعطلة للتطبيق
"""

FEATURES = {
    # Media & Social Features
    "MEDIA_WORLD": False,        # ❌ Media/Social مُعطَّل
    "CORPORATE_WORLD": True,     # ✅ Business features مفعّل
    "AI_HUB": True,              # ✅ AI مفعّل

    # Additional Features
    "AUTOMATION": True,          # ✅ أتمتة مفعّلة
    "TEAM_MANAGEMENT": True,     # ✅ إدارة الفريق مفعّلة
    "BILLING": True,             # ✅ الفواتير مفعّلة
    "NOTIFICATIONS": True,       # ✅ الإشعارات مفعّلة
}


def is_feature_enabled(feature_key: str) -> bool:
    """Check if a feature is enabled."""
    return FEATURES.get(feature_key, False)
