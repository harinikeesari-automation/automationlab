from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, UploadFile, File, Response
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import aiofiles
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutSessionRequest

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'default_secret_key')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Stripe Config
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY')

# Upload directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str
    role: str
    picture: Optional[str] = None
    created_at: str

class CourseCreate(BaseModel):
    title: str
    description: str
    category: str
    price: float
    duration: str
    level: str
    instructor: str
    image_url: Optional[str] = None
    curriculum: Optional[List[str]] = []
    features: Optional[List[str]] = []

class CourseResponse(BaseModel):
    course_id: str
    title: str
    description: str
    category: str
    price: float
    duration: str
    level: str
    instructor: str
    image_url: Optional[str] = None
    curriculum: List[str]
    features: List[str]
    created_at: str
    is_active: bool

class RecordingCreate(BaseModel):
    title: str
    description: str
    course_id: str

class RecordingResponse(BaseModel):
    recording_id: str
    title: str
    description: str
    course_id: str
    file_path: str
    uploaded_by: str
    created_at: str

class EnrollmentResponse(BaseModel):
    enrollment_id: str
    user_id: str
    course_id: str
    payment_status: str
    enrolled_at: str

class CheckoutRequest(BaseModel):
    course_id: str
    origin_url: str

class TestimonialCreate(BaseModel):
    name: str
    role: str
    company: str
    content: str
    rating: int
    image_url: Optional[str] = None

class TestimonialResponse(BaseModel):
    testimonial_id: str
    name: str
    role: str
    company: str
    content: str
    rating: int
    image_url: Optional[str] = None

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    # Check cookie first
    token = request.cookies.get("session_token")
    
    # Then check Authorization header
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(user_data: UserCreate, response: Response):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    hashed_password = hash_password(user_data.password)
    
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password": hashed_password,
        "role": "student",
        "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, user_data.email, "student")
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=JWT_EXPIRATION_HOURS * 3600
    )
    
    return {
        "token": token,
        "user": {
            "user_id": user_id,
            "email": user_data.email,
            "name": user_data.name,
            "role": "student"
        }
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin, response: Response):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["user_id"], user["email"], user["role"])
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=JWT_EXPIRATION_HOURS * 3600
    )
    
    return {
        "token": token,
        "user": {
            "user_id": user["user_id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "picture": user.get("picture")
        }
    }

# REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
@api_router.post("/auth/google/session")
async def google_session(request: Request, response: Response):
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    import aiohttp
    async with aiohttp.ClientSession() as session:
        async with session.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        ) as resp:
            if resp.status != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            data = await resp.json()
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": data["email"]}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        # Update user info
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data["name"], "picture": data.get("picture")}}
        )
        role = existing_user["role"]
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": data["email"],
            "name": data["name"],
            "picture": data.get("picture"),
            "role": "student",
            "password": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
        role = "student"
    
    token = create_token(user_id, data["email"], role)
    
    # Store session
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": token,
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "created_at": datetime.now(timezone.utc)
    })
    
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=JWT_EXPIRATION_HOURS * 3600
    )
    
    return {
        "token": token,
        "user": {
            "user_id": user_id,
            "email": data["email"],
            "name": data["name"],
            "role": role,
            "picture": data.get("picture")
        }
    }

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "picture": user.get("picture")
    }

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# ==================== COURSES ROUTES ====================

@api_router.get("/courses", response_model=List[CourseResponse])
async def get_courses(category: Optional[str] = None):
    query = {"is_active": True}
    if category:
        query["category"] = category
    
    courses = await db.courses.find(query, {"_id": 0}).to_list(100)
    return courses

@api_router.get("/courses/{course_id}", response_model=CourseResponse)
async def get_course(course_id: str):
    course = await db.courses.find_one({"course_id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course

@api_router.post("/courses", response_model=CourseResponse)
async def create_course(course: CourseCreate, user: dict = Depends(get_admin_user)):
    course_id = f"course_{uuid.uuid4().hex[:12]}"
    course_doc = {
        "course_id": course_id,
        **course.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_active": True
    }
    await db.courses.insert_one(course_doc)
    return {**course_doc}

@api_router.put("/courses/{course_id}", response_model=CourseResponse)
async def update_course(course_id: str, course: CourseCreate, user: dict = Depends(get_admin_user)):
    existing = await db.courses.find_one({"course_id": course_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Course not found")
    
    await db.courses.update_one(
        {"course_id": course_id},
        {"$set": course.model_dump()}
    )
    updated = await db.courses.find_one({"course_id": course_id}, {"_id": 0})
    return updated

@api_router.delete("/courses/{course_id}")
async def delete_course(course_id: str, user: dict = Depends(get_admin_user)):
    result = await db.courses.update_one(
        {"course_id": course_id},
        {"$set": {"is_active": False}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Course not found")
    return {"message": "Course deleted"}

# ==================== PAYMENT ROUTES ====================

@api_router.post("/payments/checkout")
async def create_checkout(checkout: CheckoutRequest, request: Request, user: dict = Depends(get_current_user)):
    course = await db.courses.find_one({"course_id": checkout.course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Check if already enrolled
    existing = await db.enrollments.find_one({
        "user_id": user["user_id"],
        "course_id": checkout.course_id,
        "payment_status": "paid"
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already enrolled in this course")
    
    host_url = checkout.origin_url
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    success_url = f"{host_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{host_url}/courses/{checkout.course_id}"
    
    checkout_request = CheckoutSessionRequest(
        amount=float(course["price"]),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": user["user_id"],
            "course_id": checkout.course_id,
            "course_title": course["title"]
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    await db.payment_transactions.insert_one({
        "transaction_id": f"txn_{uuid.uuid4().hex[:12]}",
        "session_id": session.session_id,
        "user_id": user["user_id"],
        "course_id": checkout.course_id,
        "amount": float(course["price"]),
        "currency": "usd",
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, request: Request, user: dict = Depends(get_current_user)):
    transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Get status from Stripe
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update transaction status
    if status.payment_status == "paid" and transaction["payment_status"] != "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "paid", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        # Create enrollment
        existing_enrollment = await db.enrollments.find_one({
            "user_id": transaction["user_id"],
            "course_id": transaction["course_id"],
            "payment_status": "paid"
        })
        
        if not existing_enrollment:
            await db.enrollments.insert_one({
                "enrollment_id": f"enroll_{uuid.uuid4().hex[:12]}",
                "user_id": transaction["user_id"],
                "course_id": transaction["course_id"],
                "payment_status": "paid",
                "session_id": session_id,
                "enrolled_at": datetime.now(timezone.utc).isoformat()
            })
    
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.payment_status == "paid":
            session_id = webhook_response.session_id
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"payment_status": "paid", "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            
            transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
            if transaction:
                existing = await db.enrollments.find_one({
                    "user_id": transaction["user_id"],
                    "course_id": transaction["course_id"],
                    "payment_status": "paid"
                })
                if not existing:
                    await db.enrollments.insert_one({
                        "enrollment_id": f"enroll_{uuid.uuid4().hex[:12]}",
                        "user_id": transaction["user_id"],
                        "course_id": transaction["course_id"],
                        "payment_status": "paid",
                        "session_id": session_id,
                        "enrolled_at": datetime.now(timezone.utc).isoformat()
                    })
        
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}

# ==================== ENROLLMENTS ROUTES ====================

@api_router.get("/enrollments", response_model=List[EnrollmentResponse])
async def get_enrollments(user: dict = Depends(get_current_user)):
    enrollments = await db.enrollments.find(
        {"user_id": user["user_id"], "payment_status": "paid"},
        {"_id": 0}
    ).to_list(100)
    return enrollments

@api_router.get("/enrollments/course/{course_id}")
async def check_enrollment(course_id: str, user: dict = Depends(get_current_user)):
    enrollment = await db.enrollments.find_one({
        "user_id": user["user_id"],
        "course_id": course_id,
        "payment_status": "paid"
    }, {"_id": 0})
    return {"enrolled": enrollment is not None}

# ==================== RECORDINGS ROUTES ====================

@api_router.post("/recordings/upload")
async def upload_recording(
    title: str,
    description: str,
    course_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    # Check if user is admin or instructor
    if user["role"] not in ["admin", "instructor"]:
        raise HTTPException(status_code=403, detail="Only admins and instructors can upload recordings")
    
    # Verify course exists
    course = await db.courses.find_one({"course_id": course_id})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    recording_id = f"rec_{uuid.uuid4().hex[:12]}"
    file_ext = Path(file.filename).suffix
    file_name = f"{recording_id}{file_ext}"
    file_path = UPLOAD_DIR / file_name
    
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    recording_doc = {
        "recording_id": recording_id,
        "title": title,
        "description": description,
        "course_id": course_id,
        "file_path": str(file_path),
        "file_name": file_name,
        "uploaded_by": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.recordings.insert_one(recording_doc)
    
    return {"recording_id": recording_id, "message": "Recording uploaded successfully"}

@api_router.get("/recordings", response_model=List[RecordingResponse])
async def get_recordings(course_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if course_id:
        query["course_id"] = course_id
    
    recordings = await db.recordings.find(query, {"_id": 0}).to_list(100)
    return recordings

@api_router.get("/recordings/{recording_id}/download")
async def download_recording(recording_id: str, user: dict = Depends(get_current_user)):
    recording = await db.recordings.find_one({"recording_id": recording_id})
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    
    # Check if user is enrolled in the course or is admin/instructor
    if user["role"] not in ["admin", "instructor"]:
        enrollment = await db.enrollments.find_one({
            "user_id": user["user_id"],
            "course_id": recording["course_id"],
            "payment_status": "paid"
        })
        if not enrollment:
            raise HTTPException(status_code=403, detail="Not enrolled in this course")
    
    file_path = Path(recording["file_path"])
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=file_path,
        filename=recording["file_name"],
        media_type="application/octet-stream"
    )

@api_router.delete("/recordings/{recording_id}")
async def delete_recording(recording_id: str, user: dict = Depends(get_admin_user)):
    recording = await db.recordings.find_one({"recording_id": recording_id})
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    
    # Delete file
    file_path = Path(recording["file_path"])
    if file_path.exists():
        file_path.unlink()
    
    await db.recordings.delete_one({"recording_id": recording_id})
    return {"message": "Recording deleted"}

# ==================== TESTIMONIALS ROUTES ====================

@api_router.get("/testimonials", response_model=List[TestimonialResponse])
async def get_testimonials():
    testimonials = await db.testimonials.find({}, {"_id": 0}).to_list(20)
    return testimonials

@api_router.post("/testimonials", response_model=TestimonialResponse)
async def create_testimonial(testimonial: TestimonialCreate, user: dict = Depends(get_admin_user)):
    testimonial_id = f"test_{uuid.uuid4().hex[:12]}"
    testimonial_doc = {
        "testimonial_id": testimonial_id,
        **testimonial.model_dump()
    }
    await db.testimonials.insert_one(testimonial_doc)
    return testimonial_doc

@api_router.delete("/testimonials/{testimonial_id}")
async def delete_testimonial(testimonial_id: str, user: dict = Depends(get_admin_user)):
    result = await db.testimonials.delete_one({"testimonial_id": testimonial_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Testimonial not found")
    return {"message": "Testimonial deleted"}

# ==================== ADMIN ROUTES ====================

@api_router.get("/admin/users")
async def get_all_users(user: dict = Depends(get_admin_user)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return users

@api_router.put("/admin/users/{user_id}/role")
async def update_user_role(user_id: str, role: str, admin: dict = Depends(get_admin_user)):
    if role not in ["student", "instructor", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"role": role}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Role updated"}

@api_router.get("/admin/stats")
async def get_admin_stats(user: dict = Depends(get_admin_user)):
    total_users = await db.users.count_documents({})
    total_courses = await db.courses.count_documents({"is_active": True})
    total_enrollments = await db.enrollments.count_documents({"payment_status": "paid"})
    total_recordings = await db.recordings.count_documents({})
    
    # Revenue calculation
    transactions = await db.payment_transactions.find({"payment_status": "paid"}, {"_id": 0}).to_list(1000)
    total_revenue = sum(t.get("amount", 0) for t in transactions)
    
    return {
        "total_users": total_users,
        "total_courses": total_courses,
        "total_enrollments": total_enrollments,
        "total_recordings": total_recordings,
        "total_revenue": total_revenue
    }

# ==================== SEED DATA ====================

@api_router.post("/seed")
async def seed_data():
    # Check if data already exists
    existing_courses = await db.courses.count_documents({})
    if existing_courses > 0:
        return {"message": "Data already seeded"}
    
    # Seed courses
    courses = [
        {
            "course_id": "course_aws001",
            "title": "AWS Solutions Architect",
            "description": "Master AWS cloud services and become a certified Solutions Architect. Learn EC2, S3, RDS, Lambda, VPC, and more.",
            "category": "AWS",
            "price": 299.00,
            "duration": "40 hours",
            "level": "Intermediate",
            "instructor": "John Smith",
            "image_url": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800",
            "curriculum": ["AWS Fundamentals", "EC2 & Compute", "Storage & Databases", "Networking & VPC", "Security & IAM", "Serverless Architecture"],
            "features": ["50+ hands-on labs", "Practice exams", "Certificate of completion", "Lifetime access"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_active": True
        },
        {
            "course_id": "course_python001",
            "title": "Python Full Stack Development",
            "description": "Learn Python from basics to advanced. Build web applications with Django and FastAPI.",
            "category": "Python",
            "price": 249.00,
            "duration": "60 hours",
            "level": "Beginner",
            "instructor": "Sarah Johnson",
            "image_url": "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800",
            "curriculum": ["Python Basics", "OOP Concepts", "Django Framework", "FastAPI", "Database Integration", "Deployment"],
            "features": ["100+ coding exercises", "Real-world projects", "Code reviews", "Community support"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_active": True
        },
        {
            "course_id": "course_devops001",
            "title": "DevOps Engineering",
            "description": "Master CI/CD, Docker, Kubernetes, and infrastructure as code. Become a DevOps engineer.",
            "category": "DevOps",
            "price": 349.00,
            "duration": "50 hours",
            "level": "Intermediate",
            "instructor": "Mike Chen",
            "image_url": "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=800",
            "curriculum": ["Linux & Scripting", "Docker Containers", "Kubernetes", "CI/CD Pipelines", "Terraform", "Monitoring & Logging"],
            "features": ["Hands-on projects", "Industry tools", "Interview prep", "Job support"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_active": True
        },
        {
            "course_id": "course_k8s001",
            "title": "Kubernetes Mastery",
            "description": "Deep dive into Kubernetes. Learn container orchestration, deployments, services, and Helm.",
            "category": "Kubernetes",
            "price": 279.00,
            "duration": "35 hours",
            "level": "Advanced",
            "instructor": "Emily Davis",
            "image_url": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800",
            "curriculum": ["K8s Architecture", "Pods & Deployments", "Services & Networking", "Storage", "Security", "Helm Charts"],
            "features": ["CKA exam prep", "Real cluster access", "Expert mentorship", "24/7 support"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_active": True
        },
        {
            "course_id": "course_aidevops001",
            "title": "AI with DevOps",
            "description": "Integrate AI/ML into DevOps workflows. Learn MLOps, model deployment, and automation.",
            "category": "AI with DevOps",
            "price": 399.00,
            "duration": "45 hours",
            "level": "Advanced",
            "instructor": "Alex Rodriguez",
            "image_url": "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800",
            "curriculum": ["ML Fundamentals", "MLOps Practices", "Model Training Pipelines", "Model Serving", "Monitoring ML Systems", "AI Ethics"],
            "features": ["GPU access", "Industry case studies", "Research papers", "Career coaching"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_active": True
        },
        {
            "course_id": "course_resume001",
            "title": "Resume Preparation Masterclass",
            "description": "Craft a winning resume that gets interviews. Learn ATS optimization and personal branding.",
            "category": "Resume Preparation",
            "price": 99.00,
            "duration": "8 hours",
            "level": "Beginner",
            "instructor": "Lisa Wang",
            "image_url": "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800",
            "curriculum": ["Resume Formats", "ATS Optimization", "Keywords Strategy", "Portfolio Building", "LinkedIn Profile", "Cover Letters"],
            "features": ["Resume templates", "1-on-1 review", "LinkedIn optimization", "Industry insights"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_active": True
        },
        {
            "course_id": "course_interview001",
            "title": "Interview Preparation",
            "description": "Ace technical and behavioral interviews. Practice with mock interviews and expert feedback.",
            "category": "Interview Preparation",
            "price": 199.00,
            "duration": "20 hours",
            "level": "Intermediate",
            "instructor": "James Wilson",
            "image_url": "https://images.unsplash.com/photo-1565728744382-61accd4aa148?w=800",
            "curriculum": ["Technical Questions", "System Design", "Behavioral Questions", "Mock Interviews", "Salary Negotiation", "Follow-up Strategy"],
            "features": ["Mock interviews", "FAANG prep", "Feedback sessions", "Offer negotiation"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_active": True
        },
        {
            "course_id": "course_java001",
            "title": "Java Job Support",
            "description": "Get expert support for your Java projects. Debugging, code reviews, and best practices.",
            "category": "Job Support",
            "price": 499.00,
            "duration": "30 hours",
            "level": "Intermediate",
            "instructor": "David Brown",
            "image_url": "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800",
            "curriculum": ["Java Core", "Spring Framework", "Microservices", "Database Design", "Testing", "Performance Tuning"],
            "features": ["1-on-1 mentoring", "Code reviews", "Project assistance", "On-call support"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_active": True
        }
    ]
    
    await db.courses.insert_many(courses)
    
    # Seed testimonials
    testimonials = [
        {
            "testimonial_id": "test_001",
            "name": "Michael Thompson",
            "role": "Cloud Architect",
            "company": "Amazon",
            "content": "The AWS course was incredibly comprehensive. I passed my Solutions Architect exam on the first try!",
            "rating": 5,
            "image_url": "https://images.unsplash.com/photo-1576558656222-ba66febe3dec?w=200"
        },
        {
            "testimonial_id": "test_002",
            "name": "Jennifer Martinez",
            "role": "Senior Developer",
            "company": "Google",
            "content": "Best Python course I've ever taken. The hands-on projects really helped me understand the concepts.",
            "rating": 5,
            "image_url": "https://images.unsplash.com/photo-1762522921456-cdfe882d36c3?w=200"
        },
        {
            "testimonial_id": "test_003",
            "name": "Robert Kim",
            "role": "DevOps Engineer",
            "company": "Microsoft",
            "content": "The DevOps course transformed my career. I got promoted within 3 months of completing it.",
            "rating": 5,
            "image_url": "https://images.unsplash.com/photo-1758876204244-930299843f07?w=200"
        }
    ]
    
    await db.testimonials.insert_many(testimonials)
    
    # Create admin user
    admin_exists = await db.users.find_one({"email": "admin@techpro.com"})
    if not admin_exists:
        admin_user = {
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": "admin@techpro.com",
            "name": "Admin User",
            "password": hash_password("admin123"),
            "role": "admin",
            "picture": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_user)
    
    return {"message": "Data seeded successfully"}

@api_router.get("/")
async def root():
    return {"message": "TechPro Academy API"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
