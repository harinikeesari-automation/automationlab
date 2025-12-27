import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { BookOpen, Video, Award, ArrowRight } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DashboardPage = ({ auth }) => {
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [enrollmentsRes, coursesRes] = await Promise.all([
          fetch(`${API}/enrollments`, {
            headers: { Authorization: `Bearer ${auth.token}` },
            credentials: "include"
          }),
          fetch(`${API}/courses`)
        ]);

        const enrollmentsData = enrollmentsRes.ok ? await enrollmentsRes.json() : [];
        const coursesData = await coursesRes.json();

        setEnrollments(enrollmentsData);
        setCourses(coursesData);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [auth.token]);

  const enrolledCourses = enrollments.map(enrollment => {
    const course = courses.find(c => c.course_id === enrollment.course_id);
    return { ...enrollment, course };
  }).filter(e => e.course);

  const recommendedCourses = courses.filter(
    course => !enrollments.some(e => e.course_id === course.course_id)
  ).slice(0, 3);

  return (
    <Layout auth={auth}>
      <div className="min-h-screen py-12" data-testid="dashboard-page">
        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="mb-12">
            <h1 className="font-heading text-3xl md:text-4xl font-bold mb-2">
              Welcome back, {auth.user?.name?.split(' ')[0]}!
            </h1>
            <p className="text-muted-foreground">Track your progress and continue learning</p>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card className="stats-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Enrolled Courses</p>
                    <p className="font-heading text-3xl font-bold">{enrolledCourses.length}</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="stats-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Hours Learned</p>
                    <p className="font-heading text-3xl font-bold">
                      {enrolledCourses.reduce((acc, e) => {
                        const hours = parseInt(e.course?.duration) || 0;
                        return acc + Math.floor(hours * 0.3);
                      }, 0)}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Video className="w-6 h-6 text-accent" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="stats-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Certificates</p>
                    <p className="font-heading text-3xl font-bold">0</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                    <Award className="w-6 h-6 text-yellow-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* My Courses */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-2xl font-bold">My Courses</h2>
              <Button variant="ghost" onClick={() => navigate("/recordings")}>
                View Recordings
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="bg-card border-white/10 animate-pulse">
                    <div className="aspect-video bg-muted"></div>
                    <CardContent className="p-6">
                      <div className="h-6 bg-muted rounded mb-3"></div>
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : enrolledCourses.length === 0 ? (
              <Card className="bg-card border-white/10">
                <CardContent className="p-12 text-center">
                  <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-heading text-xl font-semibold mb-2">No courses yet</h3>
                  <p className="text-muted-foreground mb-6">Start your learning journey by enrolling in a course</p>
                  <Button onClick={() => navigate("/courses")} data-testid="browse-courses-btn">
                    Browse Courses
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrolledCourses.map((enrollment) => (
                  <Card
                    key={enrollment.enrollment_id}
                    className="bg-card border-white/10 card-hover cursor-pointer overflow-hidden"
                    onClick={() => navigate(`/courses/${enrollment.course_id}`)}
                    data-testid={`enrolled-course-${enrollment.course_id}`}
                  >
                    <div className="aspect-video relative">
                      <img
                        src={enrollment.course?.image_url || "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600"}
                        alt={enrollment.course?.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                        <Button size="sm" className="gap-2">
                          <Video className="w-4 h-4" />
                          Continue
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-5">
                      <h3 className="font-heading font-semibold mb-3 line-clamp-2">
                        {enrollment.course?.title}
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="text-accent">30%</span>
                        </div>
                        <Progress value={30} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Recommended Courses */}
          {recommendedCourses.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-heading text-2xl font-bold">Recommended for You</h2>
                <Button variant="ghost" onClick={() => navigate("/courses")}>
                  View All
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {recommendedCourses.map((course) => (
                  <Card
                    key={course.course_id}
                    className="bg-card border-white/10 card-hover cursor-pointer overflow-hidden"
                    onClick={() => navigate(`/courses/${course.course_id}`)}
                    data-testid={`recommended-course-${course.course_id}`}
                  >
                    <div className="aspect-video">
                      <img
                        src={course.image_url || "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600"}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <CardContent className="p-5">
                      <h3 className="font-heading font-semibold mb-2 line-clamp-2">{course.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{course.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="font-heading text-xl font-bold text-primary">${course.price}</span>
                        <Button size="sm">Enroll</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default DashboardPage;
