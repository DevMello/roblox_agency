from fastapi import APIRouter, HTTPException

router = APIRouter(tags=["schedule"])

def _svc():
    from webui.server.services.scheduler import scheduler_service
    return scheduler_service

@router.get("/")
async def list_schedule():
    try: return _svc().list_jobs()
    except Exception: return []

@router.post("/")
async def add_job(body: dict):
    try:
        job_id = _svc().add_job(
            game=body["game"],
            script=body["script"],
            cron=body["cron"],
            label=body.get("label", ""),
        )
        return {"job_id": job_id}
    except KeyError as e:
        raise HTTPException(400, f"Missing field: {e}")
    except Exception as e:
        raise HTTPException(500, str(e))

@router.delete("/{job_id}")
async def remove_job(job_id: str):
    try:
        removed = _svc().remove_job(job_id)
        return {"removed": removed}
    except Exception as e: raise HTTPException(500, str(e))

@router.post("/{job_id}/pause")
async def pause_job(job_id: str):
    try: _svc().pause_job(job_id); return {"paused": True}
    except Exception as e: raise HTTPException(500, str(e))

@router.post("/{job_id}/resume")
async def resume_job(job_id: str):
    try: _svc().resume_job(job_id); return {"resumed": True}
    except Exception as e: raise HTTPException(500, str(e))

@router.get("/upcoming")
async def upcoming_runs(n: int = 10):
    try: return _svc().next_runs(n)
    except Exception: return []
