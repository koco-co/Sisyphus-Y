from pydantic import BaseModel


class CoverageCell(BaseModel):
    requirement_id: str
    requirement_title: str
    test_case_id: str | None = None
    test_case_title: str | None = None
    covered: bool = False


class CoverageMatrixResponse(BaseModel):
    requirements: list[dict]
    test_cases: list[dict]
    matrix: list[list[bool]]
    coverage_rate: float
    uncovered_requirements: list[dict]
