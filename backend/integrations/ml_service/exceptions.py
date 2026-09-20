class MLServiceException(Exception):
    """Base exception for ML service failures."""
    pass

class MLServiceUnavailable(MLServiceException):
    """Raised when the FastAPI ML service is unreachable or timing out."""
    pass

class MLServiceValidationError(MLServiceException):
    """Raised when FastAPI response schema fails validation."""
    pass
