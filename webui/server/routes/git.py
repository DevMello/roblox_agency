from fastapi import APIRouter, HTTPException

router = APIRouter(tags=["git"])

def _gs():
    from webui.server.services.git_service import git_service
    return git_service

@router.get("/branches")
async def list_branches():
    try: return _gs().branches()
    except Exception: return []

@router.get("/prs")
async def list_prs():
    try: return _gs().open_prs()
    except Exception: return []

@router.get("/prs/{pr_number}")
async def get_pr(pr_number: int):
    import subprocess, json
    try:
        r = subprocess.run(["gh", "pr", "view", str(pr_number), "--json", "number,title,headRefName,state,url,body,createdAt"], capture_output=True, text=True, timeout=10)
        return json.loads(r.stdout)
    except Exception as e:
        raise HTTPException(500, str(e))

@router.post("/prs/{pr_number}/merge")
async def merge_pr(pr_number: int):
    import subprocess
    r = subprocess.run(["gh", "pr", "merge", str(pr_number), "--squash", "--auto"], capture_output=True, text=True, timeout=30)
    if r.returncode != 0:
        raise HTTPException(500, r.stderr)
    return {"merged": True}

@router.post("/prs/{pr_number}/close")
async def close_pr(pr_number: int, body: dict = {}):
    import subprocess
    r = subprocess.run(["gh", "pr", "close", str(pr_number)], capture_output=True, text=True, timeout=30)
    if r.returncode != 0:
        raise HTTPException(500, r.stderr)
    return {"closed": True}

@router.get("/diff")
async def get_diff(base: str, head: str):
    try: return {"diff": _gs().diff(base, head)}
    except Exception as e: raise HTTPException(500, str(e))

@router.get("/commits")
async def get_commits(branch: str = "main", n: int = 20):
    try: return _gs().commits(branch, n)
    except Exception: return []

@router.post("/checkout")
async def checkout(body: dict):
    branch = body.get("branch")
    if not branch: raise HTTPException(400, "branch required")
    try:
        _gs().checkout(branch)
        return {"checked_out": branch}
    except Exception as e: raise HTTPException(500, str(e))
