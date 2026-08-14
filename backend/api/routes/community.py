"""
NETRA Community Forensic Blog & Research API Routes
Allows logged-in users and researchers to compose, format, embed media,
and publish blogs to the public NETRA community.
"""

from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

router = APIRouter(prefix="/community", tags=["Community Blog & Research"])

class AuthorModel(BaseModel):
    id: Optional[str] = None
    name: str
    email: Optional[str] = None
    avatar: Optional[str] = None
    avatar_index: Optional[int] = None
    role: Optional[str] = None

class CommunityPostCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    category: str = Field(..., description="DEEPFAKE, SCAM_ANALYSIS, VOICE_CLONE, SAFETY_GUIDE, THREAT_INTEL")
    content: str = Field(..., min_length=10, description="Full markdown/rich article content")
    excerpt: Optional[str] = None
    cover_image: Optional[str] = None
    embed_url: Optional[str] = Field(None, description="YouTube, Twitter/X, or external video embed URL")
    author: AuthorModel

class CommunityPost(BaseModel):
    id: str
    title: str
    category: str
    content: str
    excerpt: str
    cover_image: Optional[str] = None
    embed_url: Optional[str] = None
    author: AuthorModel
    created_at: str
    read_time: str
    likes: int = 0
    views: int = 0
    tags: List[str] = []

from ..db import (
    get_community_posts as db_get_community_posts,
    insert_community_post as db_insert_community_post,
    get_community_post_by_id as db_get_community_post_by_id,
    like_community_post as db_like_community_post
)

@router.get("/posts")
async def get_community_posts(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    author_id: Optional[str] = Query(None),
    author_email: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    """
    Returns public community posts filtered by category, search term, or author.
    Fetched dynamically from SQLite persistence store.
    """
    posts = db_get_community_posts(
        category=category,
        search=search,
        author_id=author_id,
        author_email=author_email,
        limit=limit,
        offset=offset
    )
    return {
        "status": "success",
        "count": len(posts),
        "posts": posts
    }

@router.post("/posts")
async def create_community_post(post: CommunityPostCreate):
    """
    Publishes a new blog post to the public community SQLite database.
    """
    saved_post = db_insert_community_post(post.model_dump())
    return {
        "status": "success",
        "message": "Post published successfully to the community.",
        "post": saved_post
    }

@router.get("/posts/{post_id}")
async def get_community_post(post_id: str):
    """
    Retrieves a single community post from SQLite and increments view counter.
    """
    post = db_get_community_post_by_id(post_id, increment_view=True)
    if not post:
        raise HTTPException(status_code=404, detail="Community post not found")
    return {"status": "success", "post": post}

@router.post("/posts/{post_id}/like")
async def like_community_post(post_id: str):
    """
    Increments like counter for a post in SQLite.
    """
    new_likes = db_like_community_post(post_id)
    if new_likes is None:
        raise HTTPException(status_code=404, detail="Community post not found")
    return {"status": "success", "likes": new_likes}

