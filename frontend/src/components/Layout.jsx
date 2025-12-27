import { Link, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { BookOpen, User, LogOut, Settings, LayoutDashboard, Video } from "lucide-react";

export const Navbar = ({ auth }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    auth.logout();
    navigate("/");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="font-heading text-xl font-bold text-white">TechPro</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link
            to="/courses"
            className="text-sm text-muted-foreground hover:text-white transition-colors"
            data-testid="nav-courses"
          >
            Courses
          </Link>
          {auth.user && (
            <>
              <Link
                to="/dashboard"
                className="text-sm text-muted-foreground hover:text-white transition-colors"
                data-testid="nav-dashboard"
              >
                Dashboard
              </Link>
              <Link
                to="/recordings"
                className="text-sm text-muted-foreground hover:text-white transition-colors"
                data-testid="nav-recordings"
              >
                Recordings
              </Link>
              {auth.user.role === "admin" && (
                <Link
                  to="/admin"
                  className="text-sm text-muted-foreground hover:text-white transition-colors"
                  data-testid="nav-admin"
                >
                  Admin
                </Link>
              )}
            </>
          )}
        </nav>

        <div className="flex items-center gap-4">
          {auth.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2" data-testid="user-menu">
                  {auth.user.picture ? (
                    <img
                      src={auth.user.picture}
                      alt={auth.user.name}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <span className="hidden md:inline text-sm">{auth.user.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate("/dashboard")} data-testid="menu-dashboard">
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/recordings")} data-testid="menu-recordings">
                  <Video className="w-4 h-4 mr-2" />
                  Recordings
                </DropdownMenuItem>
                {auth.user.role === "admin" && (
                  <DropdownMenuItem onClick={() => navigate("/admin")} data-testid="menu-admin">
                    <Settings className="w-4 h-4 mr-2" />
                    Admin Panel
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} data-testid="menu-logout">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" onClick={() => navigate("/login")} data-testid="login-btn">
                Sign In
              </Button>
              <Button onClick={() => navigate("/register")} data-testid="register-btn">
                Get Started
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export const Footer = () => {
  return (
    <footer className="border-t border-white/10 bg-card/50">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="font-heading text-xl font-bold">TechPro</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Empowering tech professionals with cutting-edge training and career support.
            </p>
          </div>

          <div>
            <h4 className="font-heading font-semibold mb-4">Courses</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/courses?category=AWS" className="hover:text-white transition-colors">AWS Training</Link></li>
              <li><Link to="/courses?category=Python" className="hover:text-white transition-colors">Python Development</Link></li>
              <li><Link to="/courses?category=DevOps" className="hover:text-white transition-colors">DevOps Engineering</Link></li>
              <li><Link to="/courses?category=Kubernetes" className="hover:text-white transition-colors">Kubernetes</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold mb-4">Career</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/courses?category=Resume Preparation" className="hover:text-white transition-colors">Resume Prep</Link></li>
              <li><Link to="/courses?category=Interview Preparation" className="hover:text-white transition-colors">Interview Prep</Link></li>
              <li><Link to="/courses?category=Job Support" className="hover:text-white transition-colors">Job Support</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>support@techpro.academy</li>
              <li>+1 (555) 123-4567</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 TechPro Academy. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

const Layout = ({ children, auth }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar auth={auth} />
      <main className="flex-1 pt-16">{children}</main>
      <Footer />
    </div>
  );
};

export default Layout;
