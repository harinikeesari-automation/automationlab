import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { ArrowRight, CheckCircle, Star, Users, Award, Clock, ChevronRight } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const LandingPage = ({ auth }) => {
  const navigate = useNavigate();
  const [testimonials, setTestimonials] = useState([]);
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    fetch(`${API}/testimonials`).then(r => r.json()).then(setTestimonials).catch(() => {});
    fetch(`${API}/courses`).then(r => r.json()).then(data => setCourses(data.slice(0, 4))).catch(() => {});
  }, []);

  const features = [
    { icon: <Users className="w-6 h-6" />, title: "Expert Instructors", desc: "Learn from industry professionals with real-world experience" },
    { icon: <Award className="w-6 h-6" />, title: "Certifications", desc: "Earn recognized certifications to boost your career" },
    { icon: <Clock className="w-6 h-6" />, title: "Lifetime Access", desc: "Access course materials anytime, anywhere, forever" },
  ];

  const categories = [
    { name: "AWS", color: "from-orange-500 to-amber-500", courses: 5 },
    { name: "Python", color: "from-blue-500 to-cyan-500", courses: 8 },
    { name: "DevOps", color: "from-purple-500 to-pink-500", courses: 6 },
    { name: "Kubernetes", color: "from-cyan-500 to-teal-500", courses: 4 },
    { name: "AI & ML", color: "from-pink-500 to-rose-500", courses: 3 },
    { name: "Career Prep", color: "from-green-500 to-emerald-500", courses: 4 },
  ];

  return (
    <Layout auth={auth}>
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center hero-gradient noise">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1692106979244-a2ac98253f6b?w=1920')] bg-cover bg-center opacity-10"></div>
        <div className="max-w-7xl mx-auto px-6 py-24 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
              <span className="text-xs font-mono uppercase tracking-wider text-primary">Now Enrolling for 2024</span>
            </div>
            
            <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6 animate-fade-in">
              Master Tech Skills.<br />
              <span className="text-gradient">Accelerate Your Career.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl">
              Industry-leading training in AWS, Python, DevOps, Kubernetes, and AI. 
              Plus resume prep, interview coaching, and Java job support.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <Button 
                size="lg" 
                className="btn-glow group"
                onClick={() => navigate("/courses")}
                data-testid="hero-explore-btn"
              >
                Explore Courses
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate("/register")}
                data-testid="hero-start-btn"
              >
                Start Free Trial
              </Button>
            </div>
            
            <div className="mt-12 flex items-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-accent" />
                <span>10,000+ Students</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-accent" />
                <span>95% Success Rate</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-accent" />
                <span>24/7 Support</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-primary mb-4 block">Why Choose Us</span>
            <h2 className="font-heading text-3xl md:text-4xl font-bold">Everything You Need to Succeed</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <Card 
                key={idx} 
                className="bg-card border-white/10 card-hover"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <CardContent className="p-8">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-6">
                    {feature.icon}
                  </div>
                  <h3 className="font-heading text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-24 bg-card/30 border-y border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-primary mb-4 block">Learning Paths</span>
            <h2 className="font-heading text-3xl md:text-4xl font-bold">Choose Your Track</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((cat, idx) => (
              <button
                key={idx}
                onClick={() => navigate(`/courses?category=${cat.name}`)}
                className="group p-6 rounded-lg border border-white/10 bg-card hover:border-primary/50 transition-all text-left"
                data-testid={`category-${cat.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${cat.color} mb-4 opacity-80 group-hover:opacity-100 transition-opacity`}></div>
                <h3 className="font-heading font-semibold mb-1">{cat.name}</h3>
                <p className="text-xs text-muted-foreground">{cat.courses} courses</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between mb-12">
            <div>
              <span className="text-xs font-mono uppercase tracking-[0.2em] text-primary mb-4 block">Featured</span>
              <h2 className="font-heading text-3xl md:text-4xl font-bold">Popular Courses</h2>
            </div>
            <Button variant="ghost" onClick={() => navigate("/courses")} data-testid="view-all-courses">
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {courses.map((course, idx) => (
              <Card 
                key={course.course_id} 
                className="bg-card border-white/10 card-hover cursor-pointer overflow-hidden"
                onClick={() => navigate(`/courses/${course.course_id}`)}
                data-testid={`course-card-${course.course_id}`}
              >
                <div className="aspect-video relative">
                  <img 
                    src={course.image_url || "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400"} 
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3">
                    <span className={`category-badge category-${course.category.toLowerCase().split(' ')[0]}`}>
                      {course.category}
                    </span>
                  </div>
                </div>
                <CardContent className="p-5">
                  <h3 className="font-heading font-semibold mb-2 line-clamp-2">{course.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{course.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-heading text-xl font-bold text-primary">${course.price}</span>
                    <span className="text-xs text-muted-foreground">{course.duration}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-card/30 border-y border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-primary mb-4 block">Testimonials</span>
            <h2 className="font-heading text-3xl md:text-4xl font-bold">What Our Students Say</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, idx) => (
              <Card key={testimonial.testimonial_id || idx} className="bg-card border-white/10" data-testid={`testimonial-${idx}`}>
                <CardContent className="p-8">
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating || 5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-6 italic">&ldquo;{testimonial.content}&rdquo;</p>
                  <div className="flex items-center gap-4">
                    <img 
                      src={testimonial.image_url || `https://ui-avatars.com/api/?name=${testimonial.name}&background=6366f1&color=fff`}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.role} at {testimonial.company}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-heading text-3xl md:text-5xl font-bold mb-6">
            Ready to Start Your Journey?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of professionals who have transformed their careers with TechPro Academy.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button 
              size="lg" 
              className="btn-glow"
              onClick={() => navigate("/register")}
              data-testid="cta-get-started"
            >
              Get Started Today
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate("/courses")}
            >
              Browse Courses
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default LandingPage;
