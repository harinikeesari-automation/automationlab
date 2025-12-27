import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Layout from "../components/Layout";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Search, Clock, BookOpen, Award } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CoursesPage = ({ auth }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "all");

  const categories = [
    "all",
    "AWS",
    "Python",
    "DevOps",
    "Kubernetes",
    "AI with DevOps",
    "Resume Preparation",
    "Interview Preparation",
    "Job Support"
  ];

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const url = selectedCategory !== "all" 
          ? `${API}/courses?category=${encodeURIComponent(selectedCategory)}`
          : `${API}/courses`;
        const response = await fetch(url);
        const data = await response.json();
        setCourses(data);
      } catch (error) {
        console.error("Failed to fetch courses:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [selectedCategory]);

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryClass = (category) => {
    const cat = category.toLowerCase().split(' ')[0];
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

  return (
    <Layout auth={auth}>
      <div className="min-h-screen py-12">
        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="mb-12">
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-primary mb-4 block">Course Catalog</span>
            <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">Explore Our Courses</h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Industry-leading training programs designed to accelerate your career in tech.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search courses..."
                className="pl-10 h-12 bg-card border-white/10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="course-search"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-[240px] h-12 bg-card border-white/10" data-testid="category-filter">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat === "all" ? "All Categories" : cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Results count */}
          <p className="text-sm text-muted-foreground mb-6">
            Showing {filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''}
          </p>

          {/* Course Grid */}
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="bg-card border-white/10 animate-pulse">
                  <div className="aspect-video bg-muted"></div>
                  <CardContent className="p-6">
                    <div className="h-6 bg-muted rounded mb-3"></div>
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-heading text-xl font-semibold mb-2">No courses found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <Card
                  key={course.course_id}
                  className="bg-card border-white/10 card-hover cursor-pointer overflow-hidden group"
                  onClick={() => navigate(`/courses/${course.course_id}`)}
                  data-testid={`course-card-${course.course_id}`}
                >
                  <div className="aspect-video relative overflow-hidden">
                    <img
                      src={course.image_url || "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600"}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3">
                      <span className={`category-badge ${getCategoryClass(course.category)}`}>
                        {course.category}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3">
                      <span className="px-2 py-1 text-xs font-medium rounded bg-black/60 text-white">
                        {course.level}
                      </span>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <h3 className="font-heading text-xl font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {course.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{course.duration}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Award className="w-3.5 h-3.5" />
                        <span>Certificate</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-heading text-2xl font-bold text-primary">
                        ${course.price}
                      </span>
                      <Button size="sm" data-testid={`enroll-btn-${course.course_id}`}>
                        Enroll Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default CoursesPage;
