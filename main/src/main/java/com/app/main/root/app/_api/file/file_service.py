from fastapi import HTTPException, UploadFile
from typing import Dict, Any, Optional, List
import httpx
import json
import uuid
from datetime import datetime
import aiofiles
import os
import shutil
from pathlib import Path


class FileService:
    def __init__(self, url: str):
        self.url = url
        self.baseUrl = url.rstrip('/')
        
    ## Save File Temp
    async def saveFileTemp(self, file: UploadFile) -> str:
        try:
            fileId = str(uuid.uuid4())
            fileExt = os.path.splitext(file.filename)[1] if '.' in file.filename else ''
            tempFileName = f"{fileId}{fileExt}"
            tempPath = tempFileName
            
            async with aiofiles.open(tempPath, 'wb') as outFile:
                content = await file.read()
                await outFile.write(content)
            
            return str(tempPath)
        except Exception as err:
            raise HTTPException(status_code=500, detail=f"Failed to save file: {(err)}")
        
    ## Upload File
    async def uploadFile(
        self,
        filePath: str,
        userId: str,
        originalFileName: str,
        parentFolderId: str = "root"
    ) -> Dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                async with aiofiles.open(filePath, 'rb') as f:
                    fileContent = await f.read()
                    
                files = {
                    'file': (originalFileName, fileContent)
                }
                data = {
                    'userId': userId,
                    'parentFolderId': parentFolderId,
                }
                
                res = await client.post(
                    f"{self.baseUrl}/api/files/upload",
                    files=files,
                    data=data
                )
                if(os.path.exists(filePath)):
                    os.remove(filePath)
                if(res.status_code == 200):
                    return res.json()
                else:
                    errorDetail = res.text
                    try:
                        errorJson = res.json()
                        errDetail = errorJson.get('error', errorJson.get('message', errDetail))
                    except:
                        pass
                    raise HTTPException(
                        status_code=res.status_code,
                        detail=f"Server error: {errDetail}"
                    )
        except httpx.RequestError as err:
            raise HTTPException(
                status_code=503,
                detail=f"Service unavailable: {str(err)}"
            )
        except Exception as err:
            if(os.path.exists(filePath)):
                os.remove(filePath)
            raise HTTPException(status_code=500, detail=str(err))
        
    ## Download File
    async def downloadFile(self, fileId: str, userId: str) -> Dict[str, Any]:
        try:
            async with httpx.AsyncClient() as client:
                params = {
                    'fileId': fileId,
                    'userId': userId
                }
                
                res = await client.get(
                    f"{self.baseUrl}/api/files/download",
                    params=params
                )
                if(res.status_code == 200):
                    contentDisposition = res.headers.get('content-disposition', '')
                    if 'filename=' or 'fileName=' in contentDisposition:
                        fileName = contentDisposition.split('fileName=' or 'filename=')[1].strip('"')
                    else:
                        fileName = f"file_{fileId}" 
                    
                    return {
                        'content': res.content,
                        'fileName': fileName,
                        'contentType': res.headers.get('content-type', 'application/octet-stream')
                    }
                else:
                    raise HTTPException(
                        status_code=res.status_code,
                        detail=f"Failed to download file: {res.text}"
                    )
        except httpx.RequestError as err:
            raise HTTPException(status_code=503, detail=f"Service unavailable: {str(err)}")
        
    ## List Files
    async def listFiles(
        self,
        userId: str,
        parentFolderId: str = "root",
        page: int = 1,
        pageSize: int = 20
    ) -> Dict[str, Any]:
        try:
            async with httpx.AsyncClient() as client:
                params = {
                    'userId': userId,
                    'parentFolderId': parentFolderId,
                    'page': page,
                    'pageSize': pageSize
                }
                
                res = await client.get(
                    f"{self.baseUrl}/api/files/list",
                    params=params
                )
                if(res.status_code == 200):
                    return res.json()
                else:
                    raise HTTPException(
                        status_code=res.status_code,
                        detail=res.text
                    )
        except httpx.RequestError as err:
            raise HTTPException(status_code=503, detail=f"Service unavailable: {str(err)}")
        
    ## Delete File
    async def deleteFile(self, fileId: str, userId: str) -> Dict[str, Any]:
        try:
            async with httpx.AsyncClient() as client:
                data = {
                    'fileId': fileId,
                    'userId': userId
                }
                
                res = await client.delete(
                    f"{self.baseUrl}/api/files/delete",
                    json=data
                )
                if(res.status_code == 200):
                    return res.json()
                else:
                    raise HTTPException(
                        status_code=res.status_code,
                        detail=res.text
                    )
        except httpx.RequestError as err:
            raise HTTPException(status_code=503, detail=f"Service unavailable: {str(err)}")
            
    ## Get Storage Usage
    async def getStorageUsage(self, userId: str) -> Dict[str, Any]:
        try:
            async with httpx.AsyncClient() as client:
                res = await client.get(
                    f"{self.baseUrl}/api/files/storage/{userId}"
                )
                if(res.status_code == 200):
                    return res.json()
                else:
                    raise HTTPException(
                        status_code=res.status_code,
                        detail=res.text
                    )
        except httpx.RequestError as err:
            raise HTTPException(status_code=503, detail=f"Service unavailable")
        
    ## Search Files
    async def searchFiles(
        self,
        userId: str,
        query: str,
        fileType: Optional[str] = None,
        page: int = 1,
        pageSize: int = 20
    ) -> Dict[str, Any]:
        try:
            async with httpx.AsyncClient() as client:
                params = {
                    'userId': userId,
                    'query': query,
                    'fileType': fileType,
                    'page': page,
                    'pageSize': pageSize
                }
                params = {
                    k: v for k, v in params.items()
                    if v is not None
                }
                
                res = await client.get(
                    f"{self.baseUrl}/api/files/search",
                    params=params
                )
                if(res.status_code == 200):
                    return res.json()
                else:
                    raise HTTPException(
                        status_code=res.status_code,
                        detail=res.text
                    )
        except httpx.RequestError as err:
            raise HTTPException(status_code=503, detail=f"Service unavailable: {str(err)}")