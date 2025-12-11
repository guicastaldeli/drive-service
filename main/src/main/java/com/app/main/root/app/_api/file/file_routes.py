from fastapi import APIRouter, HTTPException, Request, Response, Cookie, Depends
from typing import Dict, Any, Optional
from file.file_service import FileService
import json

class FileRoutes:
    def __init__(self, fileService: FileService):
        self.fileService = fileService
        self.router = APIRouter(prefix="/api/file")
        self.setupRoutes()
        
    def setupRoutes(self):