from __future__ import annotations

from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel

from auth import get_current_user
from database import get_db
from models import User, Post, PostLike, PostComment, PostRepost, PostSave

router = APIRouter(prefix="/posts", tags=["posts"])


class PostCreate(BaseModel):
    content: str
    image_url: Optional[str] = None


class PostResponse(BaseModel):
    id: int
    user_id: int
    content: str
    image_url: Optional[str] = None
    likes_count: int
    comments_count: int = 0
    reposts_count: int = 0
    author_name: Optional[str] = None
    author_username: Optional[str] = None
    author_avatar: Optional[str] = None
    author_verified: bool = False
    created_at: Optional[str] = None
    liked_by_me: bool = False
    reposted_by_me: bool = False
    saved_by_me: bool = False

    class Config:
        from_attributes = True


class CommentResponse(BaseModel):
    id: int
    post_id: int
    user_id: int
    content: str
    author_name: Optional[str] = None
    author_username: Optional[str] = None
    author_avatar: Optional[str] = None
    created_at: Optional[str] = None


class CommentCreate(BaseModel):
    content: str


def _post_to_response(
    p: Post,
    current_user_id: int,
    db: Session,
    *,
    liked: Optional[bool] = None,
    reposted: Optional[bool] = None,
    saved: Optional[bool] = None,
) -> PostResponse:
    if liked is None:
        liked = db.query(PostLike).filter(
            PostLike.post_id == p.id, PostLike.user_id == current_user_id
        ).first() is not None
    if reposted is None:
        reposted = db.query(PostRepost).filter(
            PostRepost.post_id == p.id, PostRepost.user_id == current_user_id
        ).first() is not None
    if saved is None:
        saved = db.query(PostSave).filter(
            PostSave.post_id == p.id, PostSave.user_id == current_user_id
        ).first() is not None
    author_verified = False
    if p.author:
        author_verified = bool(getattr(p.author, "verified", 0))
    return PostResponse(
        id=p.id,
        user_id=p.user_id,
        content=p.content,
        image_url=p.image_url,
        likes_count=p.likes_count or 0,
        comments_count=p.comments_count or 0,
        reposts_count=p.reposts_count or 0,
        author_name=p.author.name if p.author else None,
        author_username=p.author.username if p.author else None,
        author_avatar=p.author.avatar_url if p.author else None,
        author_verified=author_verified,
        created_at=p.created_at.isoformat() if p.created_at else None,
        liked_by_me=liked,
        reposted_by_me=reposted,
        saved_by_me=saved,
    )


@router.get("/", response_model=list[PostResponse])
def list_posts(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user_id: Optional[str] = None,
    following: Optional[str] = None,
):
    from models import Follow
    q = db.query(Post).options(joinedload(Post.author)).order_by(Post.created_at.desc())
    if user_id:
        try:
            user_id_int = int(user_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid user_id")
        q = q.filter(Post.user_id == user_id_int)
    elif following == "true":
        followed_ids = [
            f.following_id for f in
            db.query(Follow.following_id).filter(Follow.follower_id == current_user.id).all()
        ]
        followed_ids.append(current_user.id)
        q = q.filter(Post.user_id.in_(followed_ids))
    posts = q.offset(offset).limit(limit).all()

    # Batch load liked/reposted/saved status to avoid N+1 queries
    post_ids = [p.id for p in posts]
    if post_ids:
        liked_ids = {
            r[0] for r in db.query(PostLike.post_id)
            .filter(PostLike.post_id.in_(post_ids), PostLike.user_id == current_user.id).all()
        }
        reposted_ids = {
            r[0] for r in db.query(PostRepost.post_id)
            .filter(PostRepost.post_id.in_(post_ids), PostRepost.user_id == current_user.id).all()
        }
        saved_ids = {
            r[0] for r in db.query(PostSave.post_id)
            .filter(PostSave.post_id.in_(post_ids), PostSave.user_id == current_user.id).all()
        }
    else:
        liked_ids = reposted_ids = saved_ids = set()

    return [
        _post_to_response(p, current_user.id, db, liked=p.id in liked_ids, reposted=p.id in reposted_ids, saved=p.id in saved_ids)
        for p in posts
    ]


@router.get("/{post_id}", response_model=PostResponse)
def get_post(
    post_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    post = db.query(Post).options(joinedload(Post.author)).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return _post_to_response(post, current_user.id, db)


@router.post("/", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
def create_post(
    body: PostCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    if not body.content.strip() and not body.image_url:
        raise HTTPException(status_code=400, detail="Content cannot be empty")
    post = Post(
        user_id=current_user.id,
        content=body.content.strip(),
        image_url=body.image_url,
    )
    db.add(post)
    current_user.posts_count = (current_user.posts_count or 0) + 1
    db.commit()
    db.refresh(post)
    return _post_to_response(post, current_user.id, db)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your post")
    db.delete(post)
    current_user.posts_count = max((current_user.posts_count or 1) - 1, 0)
    db.commit()


@router.post("/{post_id}/like", status_code=status.HTTP_204_NO_CONTENT)
def like_post(
    post_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    existing = db.query(PostLike).filter(
        PostLike.post_id == post_id, PostLike.user_id == current_user.id
    ).first()
    if existing:
        return
    like = PostLike(post_id=post_id, user_id=current_user.id)
    db.add(like)
    post.likes_count = (post.likes_count or 0) + 1
    db.commit()

    from models import Notification
    if post.user_id != current_user.id:
        db.add(Notification(
            user_id=post.user_id,
            type="like",
            title="New like",
            body=f"{current_user.name or current_user.username} liked your post",
            actor_id=current_user.id,
            reference_id=str(post_id),
        ))
        db.commit()


@router.post("/{post_id}/unlike", status_code=status.HTTP_204_NO_CONTENT)
def unlike_post(
    post_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    existing = db.query(PostLike).filter(
        PostLike.post_id == post_id, PostLike.user_id == current_user.id
    ).first()
    if not existing:
        return
    db.delete(existing)
    post.likes_count = max((post.likes_count or 1) - 1, 0)
    db.commit()


# ─── Comments ────────────────────────────────────────────────────────────────

@router.get("/{post_id}/comments", response_model=list[CommentResponse])
def list_comments(
    post_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    comments = (
        db.query(PostComment)
        .filter(PostComment.post_id == post_id)
        .order_by(PostComment.created_at.asc())
        .all()
    )
    return [
        CommentResponse(
            id=c.id,
            post_id=c.post_id,
            user_id=c.user_id,
            content=c.content,
            author_name=c.author.name if c.author else None,
            author_username=c.author.username if c.author else None,
            author_avatar=c.author.avatar_url if c.author else None,
            created_at=c.created_at.isoformat() if c.created_at else None,
        )
        for c in comments
    ]


@router.post("/{post_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
def create_comment(
    post_id: int,
    body: CommentCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    if not body.content.strip():
        raise HTTPException(status_code=400, detail="Comment cannot be empty")
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    comment = PostComment(
        post_id=post_id,
        user_id=current_user.id,
        content=body.content.strip(),
    )
    db.add(comment)
    post.comments_count = (post.comments_count or 0) + 1

    from models import Notification
    if post.user_id != current_user.id:
        db.add(Notification(
            user_id=post.user_id,
            type="comment",
            title="New comment",
            body=f"{current_user.name or current_user.username} commented on your post",
            actor_id=current_user.id,
            reference_id=str(post_id),
        ))
    db.commit()
    db.refresh(comment)

    return CommentResponse(
        id=comment.id,
        post_id=comment.post_id,
        user_id=comment.user_id,
        content=comment.content,
        author_name=current_user.name,
        author_username=current_user.username,
        author_avatar=current_user.avatar_url,
        created_at=comment.created_at.isoformat() if comment.created_at else None,
    )


@router.delete("/{post_id}/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(
    post_id: int,
    comment_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    comment = db.query(PostComment).filter(
        PostComment.id == comment_id, PostComment.post_id == post_id
    ).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your comment")
    post = db.query(Post).filter(Post.id == post_id).first()
    if post:
        post.comments_count = max((post.comments_count or 1) - 1, 0)
    db.delete(comment)
    db.commit()


# ─── Reposts ──────────────────────────────────────────────────────────────────

@router.post("/{post_id}/repost", status_code=status.HTTP_204_NO_CONTENT)
def repost(
    post_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    existing = db.query(PostRepost).filter(
        PostRepost.post_id == post_id, PostRepost.user_id == current_user.id
    ).first()
    if existing:
        return
    db.add(PostRepost(post_id=post_id, user_id=current_user.id))
    post.reposts_count = (post.reposts_count or 0) + 1
    db.commit()


@router.delete("/{post_id}/repost", status_code=status.HTTP_204_NO_CONTENT)
def unrepost(
    post_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    existing = db.query(PostRepost).filter(
        PostRepost.post_id == post_id, PostRepost.user_id == current_user.id
    ).first()
    if not existing:
        return
    db.delete(existing)
    post.reposts_count = max((post.reposts_count or 1) - 1, 0)
    db.commit()


# ─── Saves / Bookmarks ───────────────────────────────────────────────────────

@router.post("/{post_id}/save", status_code=status.HTTP_204_NO_CONTENT)
def save_post(
    post_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    existing = db.query(PostSave).filter(
        PostSave.post_id == post_id, PostSave.user_id == current_user.id
    ).first()
    if existing:
        return
    db.add(PostSave(post_id=post_id, user_id=current_user.id))
    db.commit()


@router.delete("/{post_id}/save", status_code=status.HTTP_204_NO_CONTENT)
def unsave_post(
    post_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    existing = db.query(PostSave).filter(
        PostSave.post_id == post_id, PostSave.user_id == current_user.id
    ).first()
    if not existing:
        return
    db.delete(existing)
    db.commit()


@router.get("/saved", response_model=list[PostResponse])
def list_saved_posts(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    saved_rows = (
        db.query(PostSave.post_id)
        .filter(PostSave.user_id == current_user.id)
        .order_by(PostSave.created_at.desc())
        .offset(offset).limit(limit)
        .all()
    )
    ids = [s[0] for s in saved_rows]
    if not ids:
        return []
    posts = db.query(Post).options(joinedload(Post.author)).filter(Post.id.in_(ids)).all()
    post_map = {p.id: p for p in posts}

    liked_ids = {
        r[0] for r in db.query(PostLike.post_id)
        .filter(PostLike.post_id.in_(ids), PostLike.user_id == current_user.id).all()
    }
    reposted_ids = {
        r[0] for r in db.query(PostRepost.post_id)
        .filter(PostRepost.post_id.in_(ids), PostRepost.user_id == current_user.id).all()
    }

    return [
        _post_to_response(post_map[pid], current_user.id, db, liked=pid in liked_ids, reposted=pid in reposted_ids, saved=True)
        for pid in ids if pid in post_map
    ]


# ─── Hashtags / Trending ──────────────────────────────────────────────────────

import re as _re

@router.get("/trending-hashtags")
def trending_hashtags(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    limit: int = Query(10, le=30),
):
    """Extract trending hashtags from recent posts."""
    recent = db.query(Post).order_by(Post.created_at.desc()).limit(500).all()
    counts: dict[str, int] = {}
    for p in recent:
        tags = _re.findall(r"#(\w+)", p.content or "")
        for tag in tags:
            t = tag.lower()
            counts[t] = counts.get(t, 0) + 1
    sorted_tags = sorted(counts.items(), key=lambda x: x[1], reverse=True)[:limit]
    return [{"hashtag": t, "count": c} for t, c in sorted_tags]


@router.get("/by-hashtag/{tag}", response_model=list[PostResponse])
def posts_by_hashtag(
    tag: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    limit: int = Query(30, le=100),
    offset: int = Query(0, ge=0),
):
    """Get posts containing a specific hashtag."""
    posts = (
        db.query(Post)
        .options(joinedload(Post.author))
        .filter(Post.content.ilike(f"%#{tag}%"))
        .order_by(Post.created_at.desc())
        .offset(offset).limit(limit).all()
    )
    post_ids = [p.id for p in posts]
    liked_ids = {r[0] for r in db.query(PostLike.post_id).filter(PostLike.post_id.in_(post_ids), PostLike.user_id == current_user.id).all()} if post_ids else set()
    reposted_ids = {r[0] for r in db.query(PostRepost.post_id).filter(PostRepost.post_id.in_(post_ids), PostRepost.user_id == current_user.id).all()} if post_ids else set()
    saved_ids = {r[0] for r in db.query(PostSave.post_id).filter(PostSave.post_id.in_(post_ids), PostSave.user_id == current_user.id).all()} if post_ids else set()
    return [_post_to_response(p, current_user.id, db, liked=p.id in liked_ids, reposted=p.id in reposted_ids, saved=p.id in saved_ids) for p in posts]
