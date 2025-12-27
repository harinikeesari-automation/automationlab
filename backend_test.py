import requests
import sys
import json
from datetime import datetime

class TechProAPITester:
    def __init__(self, base_url="https://devopstraining-1.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, use_admin=False):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
            
        if use_admin and self.admin_token:
            test_headers['Authorization'] = f'Bearer {self.admin_token}'
        elif self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Error: {response.text}")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "endpoint": endpoint
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "error": str(e),
                "endpoint": endpoint
            })
            return False, {}

    def test_seed_data(self):
        """Test seeding initial data"""
        success, response = self.run_test(
            "Seed Data",
            "POST",
            "seed",
            200
        )
        return success

    def test_get_courses(self):
        """Test getting all courses"""
        success, response = self.run_test(
            "Get All Courses",
            "GET",
            "courses",
            200
        )
        if success and isinstance(response, list) and len(response) > 0:
            print(f"   Found {len(response)} courses")
            return True
        return False

    def test_get_testimonials(self):
        """Test getting testimonials"""
        success, response = self.run_test(
            "Get Testimonials",
            "GET",
            "testimonials",
            200
        )
        if success and isinstance(response, list):
            print(f"   Found {len(response)} testimonials")
            return True
        return False

    def test_register_user(self):
        """Test user registration"""
        test_user_data = {
            "email": f"test_user_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "TestPass123!",
            "name": "Test User"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_user_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            print(f"   User registered with ID: {response.get('user', {}).get('user_id')}")
            return True
        return False

    def test_admin_login(self):
        """Test admin login"""
        admin_credentials = {
            "email": "admin@techpro.com",
            "password": "admin123"
        }
        
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data=admin_credentials
        )
        
        if success and 'token' in response:
            self.admin_token = response['token']
            print(f"   Admin logged in: {response.get('user', {}).get('email')}")
            return True
        return False

    def test_get_me(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        if success and 'user_id' in response:
            print(f"   Current user: {response.get('email')}")
            return True
        return False

    def test_admin_stats(self):
        """Test admin stats endpoint"""
        success, response = self.run_test(
            "Admin Stats",
            "GET",
            "admin/stats",
            200,
            use_admin=True
        )
        if success and 'total_users' in response:
            print(f"   Stats - Users: {response.get('total_users')}, Courses: {response.get('total_courses')}")
            return True
        return False

    def test_admin_users(self):
        """Test admin users endpoint"""
        success, response = self.run_test(
            "Admin Get Users",
            "GET",
            "admin/users",
            200,
            use_admin=True
        )
        if success and isinstance(response, list):
            print(f"   Found {len(response)} users")
            return True
        return False

    def test_create_course(self):
        """Test creating a new course"""
        course_data = {
            "title": "Test Course",
            "description": "A test course for API testing",
            "category": "Python",
            "price": 99.99,
            "duration": "10 hours",
            "level": "Beginner",
            "instructor": "Test Instructor",
            "curriculum": ["Module 1", "Module 2"],
            "features": ["Feature 1", "Feature 2"]
        }
        
        success, response = self.run_test(
            "Create Course",
            "POST",
            "courses",
            200,
            data=course_data,
            use_admin=True
        )
        
        if success and 'course_id' in response:
            self.test_course_id = response['course_id']
            print(f"   Course created with ID: {self.test_course_id}")
            return True
        return False

    def test_get_course_detail(self):
        """Test getting course details"""
        if hasattr(self, 'test_course_id'):
            success, response = self.run_test(
                "Get Course Detail",
                "GET",
                f"courses/{self.test_course_id}",
                200
            )
            if success and response.get('course_id') == self.test_course_id:
                print(f"   Course details retrieved: {response.get('title')}")
                return True
        return False

    def test_recordings_access(self):
        """Test recordings endpoint access"""
        success, response = self.run_test(
            "Get Recordings",
            "GET",
            "recordings",
            200
        )
        if success and isinstance(response, list):
            print(f"   Found {len(response)} recordings")
            return True
        return False

def main():
    print("🚀 Starting TechPro Academy API Tests")
    print("=" * 50)
    
    tester = TechProAPITester()
    
    # Test sequence
    tests = [
        ("Seed Data", tester.test_seed_data),
        ("Get Courses", tester.test_get_courses),
        ("Get Testimonials", tester.test_get_testimonials),
        ("User Registration", tester.test_register_user),
        ("Get Current User", tester.test_get_me),
        ("Admin Login", tester.test_admin_login),
        ("Admin Stats", tester.test_admin_stats),
        ("Admin Users", tester.test_admin_users),
        ("Create Course", tester.test_create_course),
        ("Get Course Detail", tester.test_get_course_detail),
        ("Recordings Access", tester.test_recordings_access),
    ]
    
    for test_name, test_func in tests:
        try:
            test_func()
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
            tester.failed_tests.append({
                "test": test_name,
                "error": str(e)
            })
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.failed_tests:
        print("\n❌ Failed Tests:")
        for failure in tester.failed_tests:
            print(f"   - {failure['test']}: {failure.get('error', f\"Expected {failure.get('expected')}, got {failure.get('actual')}\"")}")
    
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"\n✅ Success Rate: {success_rate:.1f}%")
    
    return 0 if success_rate >= 80 else 1

if __name__ == "__main__":
    sys.exit(main())