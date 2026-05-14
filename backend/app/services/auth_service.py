import httpx
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import json
from ..core.config import settings


class IDMCAuthService:
    """
    Handles authentication with Informatica IDMC APIs.
    Manages session tokens and credentials.
    """

    def __init__(self, base_url: str, username: str, password: str, profiling_url: str = None):
        # Normalize base URL - extract just the protocol and domain
        # e.g., https://dm-us.informaticacloud.com/identity-service/home -> https://dm-us.informaticacloud.com
        from urllib.parse import urlparse
        parsed = urlparse(base_url)
        self.base_url = f"{parsed.scheme}://{parsed.netloc}"

        self.username = username
        self.password = password
        self.session_token: Optional[str] = None
        self.token_expires_at: Optional[datetime] = None
        self.profiling_url = profiling_url  # Custom profiling URL if provided

        # Create HTTP client with SSL verification disabled for local testing
        # In production, you should enable SSL verification
        self.client = httpx.AsyncClient(timeout=30.0, verify=False)

    async def login(self) -> Dict[str, Any]:
        """
        Authenticate with IDMC and obtain session token.

        IDMC typically uses basic authentication or session-based login.
        This implementation follows a common pattern where:
        1. POST credentials to /api/v2/login or /saas/public/core/v3/login
        2. Receive session token (icSessionId or similar)
        3. Use token in subsequent requests

        Returns:
            Dict containing session token and user info
        """
        # IDMC Cloud login endpoint (ma = Multi-tenant Architecture)
        login_endpoint = f"{self.base_url}/ma/api/v2/user/login"

        payload = {
            "username": self.username,
            "password": self.password
        }

        try:
            response = await self.client.post(login_endpoint, json=payload)
            response.raise_for_status()

            data = response.json()

            # Extract session token - IDMC Cloud uses icSessionId
            self.session_token = data.get("icSessionId") or data.get("sessionId") or data.get("token") or data.get("access_token")

            # Set token expiration (default 4 hours if not provided)
            expires_in = data.get("expiresIn", 14400)  # 4 hours in seconds
            self.token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)

            # Extract org info - IDMC Cloud uses orgUuid and name (not currentOrgId)
            org_id = data.get("orgUuid") or data.get("currentOrgId") or data.get("orgId")
            org_name = data.get("name")  # User's name, but we can parse from JWT if needed

            # Try to extract org name from JWT if not in top level
            if not org_name and self.session_token:
                try:
                    # Decode JWT to get org_name (don't verify signature, just parse)
                    import base64
                    parts = self.session_token.split('.')
                    if len(parts) >= 2:
                        # Pad base64 string if needed
                        payload = parts[1] + '=' * (4 - len(parts[1]) % 4)
                        decoded = base64.b64decode(payload)
                        jwt_data = json.loads(decoded)
                        org_name = jwt_data.get("current_org_name") or jwt_data.get("org_name")
                except:
                    pass

            # Store org info on self so sync service can access it
            self.org_id = org_id
            self.org_name = org_name

            # Auto-detect profiling URL - try from serverUrl or construct from base URL
            profiling_url = None
            server_url = data.get("serverUrl")

            if server_url:
                # serverUrl format: "https://usw5.dm-us.informaticacloud.com/saas"
                try:
                    server_url = server_url.replace("https://", "").replace("/saas", "")
                    parts = server_url.split(".")
                    if len(parts) >= 2:
                        pod = parts[0]  # e.g., "na1", "usw5"
                        domain = ".".join(parts[1:])
                        profiling_url = f"https://{pod}-dqprofile.{domain}"
                except:
                    pass

            # If serverUrl not available, construct from base URL
            # dm-us.informaticacloud.com -> na1-dqprofile.dm-us.informaticacloud.com
            if not profiling_url and self.base_url:
                try:
                    from urllib.parse import urlparse
                    parsed = urlparse(self.base_url)
                    domain = parsed.netloc  # e.g., "dm-us.informaticacloud.com"

                    # Default pod is na1 for dm-us
                    if "dm-us" in domain:
                        profiling_url = f"https://na1-dqprofile.{domain}"
                    elif "dm-em" in domain:
                        profiling_url = f"https://em1-dqprofile.{domain}"
                    elif "dm-ap" in domain:
                        profiling_url = f"https://ap1-dqprofile.{domain}"
                except:
                    pass

            # Store profiling URL in instance
            self.profiling_url = profiling_url

            return {
                "success": True,
                "sessionId": self.session_token,
                "expiresAt": self.token_expires_at,
                "orgId": org_id,
                "orgName": org_name,
                "profilingUrl": profiling_url,
                "userInfo": data.get("userInfo", {})
            }

        except httpx.HTTPStatusError as e:
            return {
                "success": False,
                "error": f"Authentication failed: {e.response.status_code}",
                "detail": e.response.text
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Authentication error: {str(e)}"
            }

    async def logout(self) -> bool:
        """Logout and invalidate session token."""
        if not self.session_token:
            return True

        logout_endpoint = f"{self.base_url}/api/v2/logout"

        try:
            headers = self._get_auth_headers()
            await self.client.post(logout_endpoint, headers=headers)
            self.session_token = None
            self.token_expires_at = None
            return True
        except Exception:
            # Even if logout fails, clear local session
            self.session_token = None
            self.token_expires_at = None
            return False

    async def ensure_authenticated(self) -> bool:
        """
        Ensure we have a valid session token.
        Re-authenticates if token is expired or missing.
        """
        if self.session_token and self.token_expires_at:
            # Check if token is still valid (with 5 minute buffer)
            if datetime.utcnow() < self.token_expires_at - timedelta(minutes=5):
                return True

        # Token expired or missing, re-authenticate
        print(f"                 → Logging in to IDMC (session token missing or expired)...")
        result = await self.login()
        success = result.get("success", False)
        if success:
            print(f"                 ✓ Login successful (Org: {self.org_name}, ID: {self.org_id})")
        else:
            print(f"                 ✗ Login FAILED: {result.get('error')}")
        return success

    def _get_auth_headers(self, for_profiling: bool = False) -> Dict[str, str]:
        """Get headers with authentication token."""
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

        if self.session_token:
            if for_profiling:
                # IDMC profiling API uses IDS-SESSION-ID header
                headers["IDS-SESSION-ID"] = self.session_token
            else:
                # Other endpoints use icSessionId
                headers["icSessionId"] = self.session_token
                headers["Authorization"] = f"Bearer {self.session_token}"

        return headers

    async def test_connection(self) -> Dict[str, Any]:
        """
        Test connection to IDMC by attempting to authenticate and fetch profiling data.
        """
        try:
            # Attempt login
            login_result = await self.login()

            if not login_result.get("success"):
                return {
                    "success": False,
                    "message": "Authentication failed",
                    "detail": login_result.get("error")
                }

            # Test profiling API access
            # Use profiling URL if provided, otherwise construct from base URL
            if self.profiling_url:
                profiling_base = self.profiling_url.rstrip('/')
            else:
                # Default to na1-dqprofile for testing
                profiling_base = "https://na1-dqprofile.dm-us.informaticacloud.com"

            test_endpoint = f"{profiling_base}/profiling-service/api/v1/profile"
            headers = self._get_auth_headers(for_profiling=True)

            response = await self.client.get(test_endpoint, headers=headers)
            response.raise_for_status()

            return {
                "success": True,
                "message": "Connection successful - profiling API accessible",
                "timestamp": datetime.utcnow()
            }

        except Exception as e:
            return {
                "success": False,
                "message": "Connection test failed",
                "detail": str(e),
                "timestamp": datetime.utcnow()
            }

    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()

    async def __aenter__(self):
        """Async context manager entry."""
        await self.ensure_authenticated()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()
