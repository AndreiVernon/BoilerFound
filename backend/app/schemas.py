from datetime import datetime
from typing import Literal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, computed_field, model_validator

from app.models import ReportStatus

# FR-101 field limits. Whitespace is stripped first so "     " doesn't count as a description.
Description = Annotated[str, StringConstraints(strip_whitespace=True, min_length=5, max_length=1000)]
Location = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=150)]


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    display_name: str


class LostReportUpdate(BaseModel):
    """FR-102: the owner may change description, location, or status. Nothing else."""

    model_config = ConfigDict(extra="forbid")

    description: Description | None = None
    location: Location | None = None
    status: ReportStatus | None = None

    @model_validator(mode="after")
    def _check_fields(self):
        if not self.model_fields_set:
            raise ValueError("Provide at least one of: description, location, status")
        for name in self.model_fields_set:
            if getattr(self, name) is None:
                raise ValueError(f"{name} cannot be null")
        return self


class LostReportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    owner_id: str
    description: str
    location: str
    status: ReportStatus
    created_at: datetime
    updated_at: datetime
    image_key: str | None = Field(default=None, exclude=True)

    @computed_field
    @property
    def image_url(self) -> str | None:
        return f"/lost-reports/{self.id}/image" if self.image_key else None


DropOff = Annotated[str, StringConstraints(strip_whitespace=True, max_length=150)]
FoundDescription = Annotated[str, StringConstraints(strip_whitespace=True, max_length=1000)]
OwnerQuestion = Annotated[str, StringConstraints(strip_whitespace=True, max_length=300)]


class FoundReportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    owner_id: str
    location: str
    drop_off: str
    description: str
    question: str
    status: Literal["available"]
    created_at: datetime

    @computed_field
    @property
    def image_url(self) -> str:
        return f"/found-reports/{self.id}/image"
