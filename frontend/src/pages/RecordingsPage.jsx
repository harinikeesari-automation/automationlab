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
import { Video, Upload, Download, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const RecordingsPage = ({ auth }) => {
  const navigate = useNavigate();
  const [recordings, setRecordings] = useState([]);
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    course_id: "",
    file: null
  });

  const canUpload = auth.user?.role === "admin" || auth.user?.role === "instructor";

  useEffect(() => {
    fetchData();
  }, [auth.token]);

  const fetchData = async () => {
    try {
      const [recordingsRes, coursesRes, enrollmentsRes] = await Promise.all([
        fetch(`${API}/recordings`, {
          headers: { Authorization: `Bearer ${auth.token}` },
          credentials: "include"
        }),
        fetch(`${API}/courses`),
        fetch(`${API}/enrollments`, {
          headers: { Authorization: `Bearer ${auth.token}` },
          credentials: "include"
        })
      ]);

      const recordingsData = recordingsRes.ok ? await recordingsRes.json() : [];
      const coursesData = await coursesRes.json();
      const enrollmentsData = enrollmentsRes.ok ? await enrollmentsRes.json() : [];

      setRecordings(recordingsData);
      setCourses(coursesData);
      setEnrollments(enrollmentsData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!formData.file || !formData.title || !formData.course_id) {
      toast.error("Please fill all required fields");
      return;
    }

    setUploading(true);
    try {
      const data = new FormData();
      data.append("title", formData.title);
      data.append("description", formData.description);
      data.append("course_id", formData.course_id);
      data.append("file", formData.file);

      const response = await fetch(`${API}/recordings/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${auth.token}` },
        credentials: "include",
        body: data
      });

      if (response.ok) {
        toast.success("Recording uploaded successfully");
        setDialogOpen(false);
        setFormData({ title: "", description: "", course_id: "", file: null });
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Upload failed");
      }
    } catch (error) {
      toast.error("An error occurred during upload");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (recordingId) => {
    try {
      const response = await fetch(`${API}/recordings/${recordingId}/download`, {
        headers: { Authorization: `Bearer ${auth.token}` },
        credentials: "include"
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `recording_${recordingId}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const error = await response.json();
        toast.error(error.detail || "Download failed");
      }
    } catch (error) {
      toast.error("Failed to download recording");
    }
  };

  const handleDelete = async (recordingId) => {
    if (!confirm("Are you sure you want to delete this recording?")) return;

    try {
      const response = await fetch(`${API}/recordings/${recordingId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${auth.token}` },
        credentials: "include"
      });

      if (response.ok) {
        toast.success("Recording deleted");
        fetchData();
      } else {
        toast.error("Failed to delete recording");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  // Filter recordings based on enrolled courses (for students)
  const accessibleRecordings = recordings.filter(recording => {
    if (canUpload) return true;
    return enrollments.some(e => e.course_id === recording.course_id && e.payment_status === "paid");
  });

  const getCourseName = (courseId) => {
    const course = courses.find(c => c.course_id === courseId);
    return course?.title || "Unknown Course";
  };

  return (
    <Layout auth={auth}>
      <div className="min-h-screen py-12" data-testid="recordings-page">
        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-12">
            <div>
              <h1 className="font-heading text-3xl md:text-4xl font-bold mb-2">Course Recordings</h1>
              <p className="text-muted-foreground">Access video recordings for your enrolled courses</p>
            </div>
            
            {canUpload && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="btn-glow" data-testid="upload-recording-btn">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Recording
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-white/10">
                  <DialogHeader>
                    <DialogTitle>Upload Recording</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleUpload} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        placeholder="Recording title"
                        className="bg-background border-white/10"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                        data-testid="recording-title-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Brief description"
                        className="bg-background border-white/10"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        data-testid="recording-description-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="course">Course *</Label>
                      <Select
                        value={formData.course_id}
                        onValueChange={(value) => setFormData({ ...formData, course_id: value })}
                      >
                        <SelectTrigger className="bg-background border-white/10" data-testid="recording-course-select">
                          <SelectValue placeholder="Select course" />
                        </SelectTrigger>
                        <SelectContent>
                          {courses.map(course => (
                            <SelectItem key={course.course_id} value={course.course_id}>
                              {course.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="file">Video File *</Label>
                      <Input
                        id="file"
                        type="file"
                        accept="video/*"
                        className="bg-background border-white/10"
                        onChange={(e) => setFormData({ ...formData, file: e.target.files[0] })}
                        required
                        data-testid="recording-file-input"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={uploading} data-testid="submit-recording-btn">
                      {uploading ? "Uploading..." : "Upload Recording"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Recordings Grid */}
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="bg-card border-white/10 animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-6 bg-muted rounded mb-3"></div>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : accessibleRecordings.length === 0 ? (
            <Card className="bg-card border-white/10">
              <CardContent className="p-12 text-center">
                <Video className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-heading text-xl font-semibold mb-2">No recordings available</h3>
                <p className="text-muted-foreground mb-6">
                  {canUpload
                    ? "Upload recordings for your courses"
                    : "Enroll in a course to access recordings"}
                </p>
                {!canUpload && (
                  <Button onClick={() => navigate("/courses")}>Browse Courses</Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {accessibleRecordings.map((recording) => (
                <Card
                  key={recording.recording_id}
                  className="bg-card border-white/10 card-hover"
                  data-testid={`recording-card-${recording.recording_id}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Video className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-heading font-semibold mb-1 truncate">{recording.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {recording.description || "No description"}
                        </p>
                        <p className="text-xs text-primary truncate">{getCourseName(recording.course_id)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleDownload(recording.recording_id)}
                        data-testid={`download-btn-${recording.recording_id}`}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                      {auth.user?.role === "admin" && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(recording.recording_id)}
                          data-testid={`delete-btn-${recording.recording_id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
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

export default RecordingsPage;
