import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Separator } from "../components/ui/separator";
import { Clock, Award, User, CheckCircle, Play, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CourseDetailPage = ({ auth }) => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const response = await fetch(`${API}/courses/${courseId}`);
        if (response.ok) {
          const data = await response.json();
          setCourse(data);
        } else {
          navigate("/courses");
        }
      } catch (error) {
        console.error("Failed to fetch course:", error);
      } finally {
        setLoading(false);
      }
    };

    const checkEnrollment = async () => {
      if (!auth.user) return;
      try {
        const response = await fetch(`${API}/enrollments/course/${courseId}`, {
          headers: { Authorization: `Bearer ${auth.token}` },
          credentials: "include"
        });
        if (response.ok) {
          const data = await response.json();
          setIsEnrolled(data.enrolled);
        }
      } catch (error) {
        console.error("Failed to check enrollment:", error);
      }
    };

    fetchCourse();
    checkEnrollment();
  }, [courseId, auth.user, auth.token, navigate]);

  const handleEnroll = async () => {
    if (!auth.user) {
      navigate("/login", { state: { from: `/courses/${courseId}` } });
      return;
    }

    if (isEnrolled) {
      navigate("/dashboard");
      return;
    }

    setEnrolling(true);
    try {
      const response = await fetch(`${API}/payments/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`
        },
        credentials: "include",
        body: JSON.stringify({
          course_id: courseId,
          origin_url: window.location.origin
        })
      });

      const data = await response.json();

      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.detail || "Failed to create checkout session");
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setEnrolling(false);
    }
  };

  const getCategoryClass = (category) => {
    const cat = category?.toLowerCase().split(' ')[0] || 'devops';
    const classes = {
      'aws': 'category-aws',
      'python': 'category-python',
      'devops': 'category-devops',
      'kubernetes': 'category-kubernetes',
      'ai': 'category-ai',
      'resume': 'category-resume',
      'interview': 'category-interview',
      'job': 'category-job'
    };
    return classes[cat] || 'category-devops';
  };

  if (loading) {
    return (
      <Layout auth={auth}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!course) {
    return (
      <Layout auth={auth}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Course not found</h2>
            <Button onClick={() => navigate("/courses")}>Browse Courses</Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout auth={auth}>
      <div className="min-h-screen py-12">
        <div className="max-w-7xl mx-auto px-6">
          {/* Back button */}
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => navigate("/courses")}
            data-testid="back-to-courses"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Courses
          </Button>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Hero Image */}
              <div className="aspect-video rounded-xl overflow-hidden mb-8">
                <img
                  src={course.image_url || "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200"}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Course Info */}
              <div className="mb-8">
                <span className={`category-badge ${getCategoryClass(course.category)} mb-4 inline-block`}>
                  {course.category}
                </span>
                <h1 className="font-heading text-3xl md:text-4xl font-bold mb-4" data-testid="course-title">
                  {course.title}
                </h1>
                <p className="text-lg text-muted-foreground mb-6">{course.description}</p>

                <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>By {course.instructor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{course.duration}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    <span>{course.level}</span>
                  </div>
                </div>
              </div>

              <Separator className="my-8" />

              {/* Curriculum */}
              <div className="mb-8">
                <h2 className="font-heading text-2xl font-bold mb-6">What You'll Learn</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {course.curriculum?.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator className="my-8" />

              {/* Features */}
              <div>
                <h2 className="font-heading text-2xl font-bold mb-6">Course Features</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {course.features?.map((feature, idx) => (
                    <Card key={idx} className="bg-card border-white/10">
                      <CardContent className="p-4 flex items-center gap-3">
                        <Play className="w-5 h-5 text-primary" />
                        <span>{feature}</span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <Card className="bg-card border-white/10 sticky top-24" data-testid="course-sidebar">
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <span className="font-heading text-4xl font-bold text-primary">
                      ${course.price}
                    </span>
                    <p className="text-sm text-muted-foreground mt-1">One-time payment</p>
                  </div>

                  <Button
                    className="w-full h-12 btn-glow mb-4"
                    onClick={handleEnroll}
                    disabled={enrolling}
                    data-testid="enroll-button"
                  >
                    {enrolling ? (
                      "Processing..."
                    ) : isEnrolled ? (
                      "Go to Dashboard"
                    ) : (
                      "Enroll Now"
                    )}
                  </Button>

                  {isEnrolled && (
                    <p className="text-center text-sm text-accent mb-4">
                      <CheckCircle className="w-4 h-4 inline mr-1" />
                      You&apos;re enrolled!
                    </p>
                  )}

                  <Separator className="my-6" />

                  <div className="space-y-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium">{course.duration}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Level</span>
                      <span className="font-medium">{course.level}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Certificate</span>
                      <span className="font-medium text-accent">Included</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Access</span>
                      <span className="font-medium">Lifetime</span>
                    </div>
                  </div>

                  <Separator className="my-6" />

                  <div className="text-center text-sm text-muted-foreground">
                    <p>30-day money-back guarantee</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CourseDetailPage;
