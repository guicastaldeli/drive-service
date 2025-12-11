from fastapi import HTTPException
from typing import Dict, Any, Optional
import httpx
import json

class FileService:
    def __init__(self, url: str):
        self.url = url