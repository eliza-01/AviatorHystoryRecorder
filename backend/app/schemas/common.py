from pydantic import BaseModel


class BatchWriteResponse(BaseModel):
    received: int
    accepted: int
    duplicates: int
