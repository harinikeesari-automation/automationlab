import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Users, BookOpen, DollarSign, Video, Plus, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AdminDashboard = ({ auth }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    price: "",
    duration: "",
    level: "Beginner",
    instructor: "",
    image_url: "",
    curriculum: "",
    features: ""
  });

  const categories = [
    "AWS", "Python", "DevOps", "Kubernetes", "AI with DevOps",
    "Resume Preparation", "Interview Preparation", "Job Support"
  ];

  useEffect(() => {
    fetchData();
  }, [auth.token]);

  const fetchData = async () => {
    try {
      const [statsRes, usersRes, coursesRes] = await Promise.all([
        fetch(`${API}/admin/stats`, {
          headers: { Authorization: `Bearer ${auth.token}` },
          credentials: "include"
        }),
        fetch(`${API}/admin/users`, {
          headers: { Authorization: `Bearer ${auth.token}` },
          credentials: "include"
        }),
        fetch(`${API}/courses`)
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      setCourses(await coursesRes.json());
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCourse = async (e) => {
    e.preventDefault();
    try {
      const courseData = {
        ...formData,
        price: parseFloat(formData.price),
        curriculum: formData.curriculum.split("\n").filter(Boolean),
        features: formData.features.split("\n").filter(Boolean)
      };

      const url = editingCourse
        ? `${API}/courses/${editingCourse.course_id}`
        : `${API}/courses`;
      const method = editingCourse ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`
        },
        credentials: "include",
        body: JSON.stringify(courseData)
      });

      if (response.ok) {
        toast.success(editingCourse ? "Course updated" : "Course created");
        setDialogOpen(false);
        resetForm();
        fetchData();
      } else {
        toast.error("Operation failed");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!confirm("Are you sure you want to delete this course?")) return;

    try {
      const response = await fetch(`${API}/courses/${courseId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${auth.token}` },
        credentials: "include"
      });

      if (response.ok) {
        toast.success("Course deleted");
        fetchData();
      } else {
        toast.error("Failed to delete course");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      const response = await fetch(`${API}/admin/users/${userId}/role?role=${newRole}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${auth.token}` },
        credentials: "include"
      });

      if (response.ok) {
        toast.success("Role updated");
        fetchData();
      } else {
        toast.error("Failed to update role");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "", description: "", category: "", price: "", duration: "",
      level: "Beginner", instructor: "", image_url: "", curriculum: "", features: ""
    });
    setEditingCourse(null);
  };

  const openEditDialog = (course) => {
    setEditingCourse(course);
    setFormData({
      title: course.title,
      description: course.description,
      category: course.category,
      price: course.price.toString(),
      duration: course.duration,
      level: course.level,
      instructor: course.instructor,
      image_url: course.image_url || "",
      curriculum: course.curriculum?.join("\n") || "",
      features: course.features?.join("\n") || ""
    });
    setDialogOpen(true);
  };

  const chartData = courses.map(course => ({
    name: course.title.substring(0, 15) + "...",
    price: course.price
  }));

  return (
    <Layout auth={auth}>
      <div className="min-h-screen py-12" data-testid="admin-dashboard">
        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="mb-12">
            <h1 className="font-heading text-3xl md:text-4xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage courses, users, and platform settings</p>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-6 mb-12">
            <Card className="stats-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Users</p>
                    <p className="font-heading text-3xl font-bold">{stats?.total_users || 0}</p>
                  </div>
                  <Users className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="stats-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Courses</p>
                    <p className="font-heading text-3xl font-bold">{stats?.total_courses || 0}</p>
                  </div>
                  <BookOpen className="w-8 h-8 text-accent" />
                </div>
              </CardContent>
            </Card>

            <Card className="stats-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Enrollments</p>
                    <p className="font-heading text-3xl font-bold">{stats?.total_enrollments || 0}</p>
                  </div>
                  <Video className="w-8 h-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="stats-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Revenue</p>
                    <p className="font-heading text-3xl font-bold">${stats?.total_revenue?.toFixed(2) || "0.00"}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="courses" className="space-y-6">
            <TabsList className="bg-card border border-white/10">
              <TabsTrigger value="courses" data-testid="tab-courses">Courses</TabsTrigger>
              <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
              <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
            </TabsList>

            {/* Courses Tab */}
            <TabsContent value="courses">
              <Card className="bg-card border-white/10">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Course Management</CardTitle>
                  <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
                    <DialogTrigger asChild>
                      <Button data-testid="add-course-btn">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Course
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{editingCourse ? "Edit Course" : "Add New Course"}</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleSubmitCourse} className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Title *</Label>
                            <Input className="bg-background border-white/10" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required data-testid="course-title-input" />
                          </div>
                          <div className="space-y-2">
                            <Label>Category *</Label>
                            <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                              <SelectTrigger className="bg-background border-white/10" data-testid="course-category-select"><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Description *</Label>
                          <Textarea className="bg-background border-white/10" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required data-testid="course-description-input" />
                        </div>
                        <div className="grid md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Price ($) *</Label>
                            <Input type="number" step="0.01" className="bg-background border-white/10" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required data-testid="course-price-input" />
                          </div>
                          <div className="space-y-2">
                            <Label>Duration *</Label>
                            <Input placeholder="e.g., 40 hours" className="bg-background border-white/10" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} required />
                          </div>
                          <div className="space-y-2">
                            <Label>Level</Label>
                            <Select value={formData.level} onValueChange={(v) => setFormData({ ...formData, level: v })}>
                              <SelectTrigger className="bg-background border-white/10"><SelectValue /></SelectTrigger>
                              <SelectContent>{["Beginner", "Intermediate", "Advanced"].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Instructor *</Label>
                            <Input className="bg-background border-white/10" value={formData.instructor} onChange={(e) => setFormData({ ...formData, instructor: e.target.value })} required />
                          </div>
                          <div className="space-y-2">
                            <Label>Image URL</Label>
                            <Input className="bg-background border-white/10" value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Curriculum (one per line)</Label>
                          <Textarea className="bg-background border-white/10" rows={4} value={formData.curriculum} onChange={(e) => setFormData({ ...formData, curriculum: e.target.value })} placeholder="Module 1: Introduction&#10;Module 2: Basics" />
                        </div>
                        <div className="space-y-2">
                          <Label>Features (one per line)</Label>
                          <Textarea className="bg-background border-white/10" rows={4} value={formData.features} onChange={(e) => setFormData({ ...formData, features: e.target.value })} placeholder="Certificate included&#10;Lifetime access" />
                        </div>
                        <Button type="submit" className="w-full" data-testid="submit-course-btn">{editingCourse ? "Update Course" : "Create Course"}</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {courses.map((course) => (
                        <TableRow key={course.course_id} data-testid={`course-row-${course.course_id}`}>
                          <TableCell className="font-medium">{course.title}</TableCell>
                          <TableCell>{course.category}</TableCell>
                          <TableCell>${course.price}</TableCell>
                          <TableCell>{course.level}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => openEditDialog(course)} data-testid={`edit-course-${course.course_id}`}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteCourse(course.course_id)} data-testid={`delete-course-${course.course_id}`}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users">
              <Card className="bg-card border-white/10">
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.user_id} data-testid={`user-row-${user.user_id}`}>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 text-xs rounded ${user.role === "admin" ? "bg-primary/20 text-primary" : user.role === "instructor" ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"}`}>
                              {user.role}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Select defaultValue={user.role} onValueChange={(v) => handleUpdateRole(user.user_id, v)}>
                              <SelectTrigger className="w-32 bg-background border-white/10">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="student">Student</SelectItem>
                                <SelectItem value="instructor">Instructor</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics">
              <Card className="bg-card border-white/10">
                <CardHeader>
                  <CardTitle>Course Pricing Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                        <Bar dataKey="price" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;
