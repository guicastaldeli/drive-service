from file.file_service import FileService
from fastapi import APIRouter, HTTPException, Request, Response, Cookie, Depends, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse, JSONResponse
from typing import Dict, Any, Optional, List
import json
import uuid
from datetime import datetime
import asyncio

class FileRoutes:
    def __init__(self, fileService: FileService):
        self.fileService = fileService
        self.router = APIRouter(prefix="/api/file")
        self.setupRoutes()
        
    def setupRoutes(self):
        ## Upload File
        @self.router.post("/upload")
        async def uploadFile(
            file: UploadFile = File(...),
            userId: str = Form(...),
            parentFolderId: str = Form("root")
        ):
            try:
                if(file.filename == ''):
                    raise HTTPException(status_code=400, detail="No file selected")
                if(file.size > 1000 * 1024 * 1024):
                    raise HTTPException(status_code=400, detail="File too large (1GB)")
                
                tempPath = await self.fileService.saveFileTemp(file)
                res = await self.fileService.uploadFile(
                    filePath=tempPath,
                    userId=userId,
                    originalFileName=file.filename,
                    parentFolderId=parentFolderId,
                )
                return {
                    "success": True,
                    "message": "File uploaded",
                    "data": res
                }
            except Exception as err:
                raise HTTPException(status_code=500, detail=f"Upload failed: {str(err)}")
        
        @self.router.post("/upload-multiple")
        async def uploadMultipleFiles(
            files: List[UploadFile] = File(...),
            userId: str = Form(...),
            parentFolderId: str = Form("root")
        ):
            try:
                res = []
                err = []
                
                for file in files:
                    try:
                        if(file.size > 1000 * 1024 * 1024):
                            err.append(f"{file.filename}: File too large")
                            continue
                        
                        tempPath = await self.fileService.saveFileTemp(file)
                        data = await self.fileService.uploadFile(
                            filePath=tempPath,
                            userId=userId,
                            originalFileName=file.filename,
                            parentFolderId=parentFolderId
                        )
                        res.append({
                            "fileName": file.filename,
                            "sucess": True,
                            "data": data
                        })
                    except Exception as e:
                        err.append(f"{file.filename}: {str(e)}")
                    
                return {
                    "success": True if res else False,
                    "uploaded": len(res),
                    "failed": len(err),
                    "results": res,
                    "errors": err
                }
            except Exception as err:
                raise HTTPException(status_code=500, detail=f"Upload failed: {str(err)}")
            
        ## Download File
        @self.router.get("/download")
        async def downloadFile(fileId: str = Query(...), userId: str = Query(...)):
            try:
                fileData = await self.fileService.downloadFile(fileId, userId)
                return StreamingResponse(
                    iter([fileData['content']]),
                    media_type=fileData['content-type'],
                    headers={
                        "Content-Disposition": f"attachment; filename={fileData['filename' or 'fileName']}",
                        "Access-Control-Expose-Headers": "Content-Disposition"
                    }
                )
            except Exception as err:
                raise HTTPException(status_code=500, detail=f"Download failed: {str(err)}")
            
        ## File List
        @self.router.get("/list")
        async def fileList(
            userId: str = Query(...),
            parentFolderId: str = Query("root"),
            page: int = Query(1, ge=1),
            pageSize: int = Query(20, ge=1, le=100)
        ):
            try:
                files = await self.fileService.fileList(
                    userId=userId,
                    parentFolderId=parentFolderId,
                    page=page,
                    pageSize=pageSize
                )
                
                return {
                    "success": True,
                    "data": files
                }
            except Exception as err:
                raise HTTPException(status_code=500, detail=f"Failed to list files: {str(err)}")
    
        ## Delete
        async def deleteFile(fileId: str = Query(...), userId: str = Query(...)):
            try:
                res = await self.fileService.deleteFile(fileId, userId)
                return {
                    "success": True,
                    "message": "File deleted successfully",
                    "data": res
                }
            except Exception as err:
                raise HTTPException(status_code=500, detail=f"Delete Failed: {str(err)}")
            
        ## Storage
        @self.router.get("/storage/{userId}")
        async def getStorageUsage(userId: str):
            try:
                usage = await self.fileService.getStorageUsage(userId)
                return {
                    "success": True,
                    "data": usage
                }
            except Exception as err:
                raise HTTPException(status_code=500, detail=f"Failed to get storage usage: {str(err)}")
        
        @self.router.get("/search")
        async def searchFiles(
            userId: str = Query(...),
            query: str = Query(...),
            fileType: Optional[str] = Query(None),
            page: int = Query(1, ge=1),
            pageSize: int = Query(20, ge=1, le=100)
        ):
            try:
                res = await self.fileService.searchFiles(
                    userId=userId,
                    query=query,
                    fileType=fileType,
                    page=page,
                    pageSize=pageSize
                )
                return {
                    "success": True,
                    "data": res
                }
            except Exception as err:
                raise HTTPException(status_code=500, detail=f"Search failed: {str(err)}")