from fastapi import HTTPException
from typing import Dict, Any, Optional
from session.session_service import SessionService
import httpx
import json

class AuthService:
    def __init__(self, url: str, sessionService: SessionService):
        self.url = url
        self.sessionService = sessionService
        
    ##
    ## Register User
    ##
    async def registerUser(self, data: Dict) -> Dict:
        return await self._request(
            "post", 
            f"{self.url}/api/auth/register", 
            json=data
        )
    
    ##
    ## Login User
    ##
    async def loginUser(self, data: Dict) -> Dict:
        return await self._request(
            "post", 
            f"{self.url}/api/auth/login", 
            json=data
        )
        
    ##
    ## Logout User
    ##
    async def logoutUser(self, cookies: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        headers = {}
        if(cookies):
            cookieHeader = "; ".join([f"{k}={v}" for k, v in cookies.items()])
            headers["Cookie"] = cookieHeader
            
        return await self._request(
            "POST",
            f"{self.url}/api/auth/logout",
            headers=headers
        )
        
    ##
    ## Validate Session
    ##
    async def validateSession(self, cookies: Optional[Dict[str, str]]) -> Dict[str, Any]:
        try:
            # Fix: Extract session ID from USER_INFO cookie instead of SESSION_ID
            userInfo = cookies.get("USER_INFO")
            if not userInfo:
                return { "valid": False, "user": None }
            
            # Parse the USER_INFO cookie format: "sessionId:userId:username:email"
            userInfoParts = userInfo.strip('"').split(":")
            if len(userInfoParts) < 4:
                return { "valid": False, "user": None }
                
            sessionId = userInfoParts[0]
            userId = userInfoParts[1]
            username = userInfoParts[2]
            email = userInfoParts[3]
            
            # Try to get session data from backend
            sessionData = await self._getSessionBySessionId(sessionId)
            if not sessionData:
                return { "valid": False, "user": None }
            
            # Update connection tracker
            await self._request("POST", f"{self.url}/api/connection-tracker/connections/track",
                json={
                    "socketId": sessionId,
                    "sessionId": sessionId,
                    "username": username,
                    "ipAddress": "IP",
                    "userAgent": "UA"
                } 
            )
            
            return {
                "valid": True,
                "user": {
                    "userId": userId,
                    "username": username,
                    "email": email
                }
            }
        except Exception as e:
            print(f"Session validation error: {e}")
            return { "valid": False, "user": None }
      
    ##
    ## Refresh Session Token
    ##
    async def refreshSessionToken(self, cookies: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        headers = {}
        if(cookies):
            cookieHeader = "; ".join([f"{k}={v}" for k, v in cookies.items()])
            headers["Cookies"] = cookieHeader
            
        return await self._request(
            "post", 
            f"{self.url}/api/auth/refresh", 
            headers=headers
        )
        
    ##
    ## Get Session Status
    ##
    async def getSessionStatus(self, cookies: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        headers = {}
        if(cookies):
            cookieHeader = "; ".join([f"{k}={v}" for k, v in cookies.items()])
            headers["Cookies"] = cookieHeader
            
        return await self._request(
            "get", 
            f"{self.url}/api/auth/status", 
            headers=headers
        )
        
    async def _getSessionBySessionId(self, sessionId: str) -> Optional[Dict[str, Any]]:
        try:
            return await self._request("GET", f"{self.url}/api/session/id/{sessionId}")
        except Exception as e:
            print(f"Error getting session by ID: {e}")
            return None
    
    async def _request(self, method: str, url: str, **kwargs) -> Dict[str, Any]:
        async with httpx.AsyncClient() as client:
            try:
                response = await client.request(method, url, **kwargs)
                
                cookiesToForward = {}
                for cookie in response.cookies.jar:
                    cookiesToForward[cookie.name] = cookie.value
                    
                if(response.status_code == 200):
                    result = response.json()
                    if(cookiesToForward):
                        result["_cookies"] = cookiesToForward
                    return result
                else:
                    try:
                        errData = response.json()
                        detail = errData.get("message") or errData.get("detail") or response.text
                    except:
                        detail = response.text
                    raise HTTPException(
                        status_code=response.status_code,
                        detail=detail
                    )
            except httpx.RequestError as err:
                raise HTTPException(
                    status_code=503,
                    detail=f"Service unavailable: {str(err)}"
                )
            except HTTPException:
                raise
            except Exception as err:
                raise HTTPException(
                    status_code=500,
                    detail=f"Internal server error: {str(err)}"
                )