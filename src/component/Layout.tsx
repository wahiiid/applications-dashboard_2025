import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { useAuthenticationState } from "@/hooks/zus-store";
import { useFetchApplications } from "@/hooks/query-hooks";
import React from "react";
import { Outlet, Link } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import nablaLogo from "@/assets/company.png";

const Layout = () => {
  const {
    authenticated,
    keyCloakInitialized,
    setAuthenticated,
    setToken,
    setLoggedUserProfile,
    LoggedUserProfile,
  } = useAuthenticationState((state) => state);

  const { toast } = useToast();
  const { data: applications } = useFetchApplications();

  // Calculate status counts dynamically
  const getStatusCounts = React.useMemo(() => {
    if (!applications || !Array.isArray(applications)) {
      return { active: 0, inactive: 0 };
    }

    const counts = applications.reduce(
      (acc, app) => {
        switch (app.applicationStatus) {
          case "Active":
            acc.active++;
            break;
          case "Inactive":
            acc.inactive++;
            break;
          default:
            break;
        }
        return acc;
      },
      { active: 0, inactive: 0 }
    );

    return counts;
  }, [applications]);

  const userProfile = async () => {
    try {
      const res = await keyCloakInitialized.loadUserProfile();
      setLoggedUserProfile(res);
    } catch (error) {
      console.log("Error Retrieving Data");
    }
  };

  const getUserProfile = async () => {
    await userProfile();
    setToken(keyCloakInitialized.token);
  };

  keyCloakInitialized.onReady = (auth) => {
    setAuthenticated(auth);
    if (auth) {
      toast({
        variant: "default",
        title: "User Logged In Successfully",
      });
    }
  };

  keyCloakInitialized.onAuthLogout = () => {
    console.log("Logged Out");
  };
  keyCloakInitialized.onAuthSuccess = getUserProfile;

  keyCloakInitialized.onTokenExpired = () => { };

  keyCloakInitialized.onAuthError = (errorData) =>
    console.log(errorData, "failed");

  keyCloakInitialized.onTokenExpired = () => {
    keyCloakInitialized
      .updateToken(60) // try refreshing if token will expire in 60s or less
      .then((refreshed) => {
        if (refreshed) {
          console.log("Token successfully refreshed");
          setToken(keyCloakInitialized.token);
        } else {
          console.warn("Token is still valid; no refresh needed");
        }
      })
      .catch(() => {
        console.error("Failed to refresh token");
        setAuthenticated(false);
      });
  };

  React.useEffect(() => {
    const interval = setInterval(() => {
      if (keyCloakInitialized?.token) {
        keyCloakInitialized
          .updateToken(60)
          .then((refreshed) => {
            if (refreshed) {
              console.log("Proactively refreshed token");
              setToken(keyCloakInitialized.token);
            }
          })
          .catch((err) => {
            console.error("Failed to proactively refresh token", err);
            setAuthenticated(false);
          });
      }
    }, 60 * 1000); // every 60 seconds

    return () => clearInterval(interval);
  }, [keyCloakInitialized, setToken, setAuthenticated]);

  React.useEffect(() => {
    if (keyCloakInitialized.didInitialize === true) {
      return;
    }
    keyCloakInitialized
      .init({
        onLoad: "login-required",
        silentCheckSsoRedirectUri: "http://localhost:5173/",
        pkceMethod: "S256",
      })
      .catch((err) => {
        setAuthenticated(false);
        console.log(err);
      });
  }, [authenticated, keyCloakInitialized, setAuthenticated]);

  return (
    <div className="h-screen bg-gray-100 overflow-auto">
      {/* Navbar */}
      <nav className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            {/* Left side - Logo/Title and Description */}
            <div className="flex items-center space-x-4">
              <Link
                to="/applications"
                className="flex items-center space-x-3 hover:opacity-90 transition-opacity cursor-pointer"
              >
                <div className="w-14 h-14 bg-transparent rounded-lg flex items-center justify-center p-1">
                  <img
                    src={nablaLogo}
                    alt="Nabla Logo"
                    className="w-full h-full object-contain rounded-lg "
                  />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-white hover:text-blue-100 transition-colors">
                    Nabla Applications Dashboard
                  </h1>
                  <p className="text-blue-100 text-sm">
                    Organize and operate over applications and business documents.
                  </p>
                </div>
              </Link>
            </div>

            {/* Center - Status indicators */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <span className="text-white text-sm font-medium">{getStatusCounts.active} Active</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                <span className="text-white text-sm font-medium">{getStatusCounts.inactive} Inactive</span>
              </div>

            </div>

            {/* Right side - User profile */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  {LoggedUserProfile?.username === undefined ? null : (
                    <>
                      <div className="text-white text-sm">Hello,</div>
                      <div className="text-blue-100 text-sm font-medium">
                        {LoggedUserProfile?.username}
                      </div>
                    </>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center hover:bg-blue-400 transition-colors">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width={20}
                        height={20}
                        viewBox="0 0 32 32"
                      >
                        <path
                          fill="#fff"
                          d="M16 8a5 5 0 1 0 5 5a5 5 0 0 0-5-5"
                          strokeWidth={1}
                          stroke="#fff"
                        ></path>
                        <path
                          fill="#fff"
                          d="M16 2a14 14 0 1 0 14 14A14.016 14.016 0 0 0 16 2m7.993 22.926A5 5 0 0 0 19 20h-6a5 5 0 0 0-4.992 4.926a12 12 0 1 1 15.985 0"
                          strokeWidth={1}
                          stroke="#fff"
                        ></path>
                      </svg>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    side="bottom"
                    align="end"
                    className="flex flex-col"
                  >
                    <DropdownMenuItem
                      onClick={() => keyCloakInitialized.logout()}
                      className="flex flex-row cursor-pointer justify-start py-2"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width={20}
                        height={20}
                        viewBox="0 0 24 24"
                        className="mr-2"
                      >
                        <path
                          fill="#000"
                          d="M9 2h9c1.1 0 2 .9 2 2v16c0 1.1-.9 2-2 2H9c-1.1 0-2-.9-2-2v-2h2v2h9V4H9v2H7V4c0-1.1.9-2 2-2"
                          strokeWidth={0.5}
                          stroke="#000"
                        ></path>
                        <path
                          fill="#000"
                          d="M10.09 15.59L11.5 17l5-5l-5-5l-1.41 1.41L12.67 11H3v2h9.67z"
                          strokeWidth={0.5}
                          stroke="#000"
                        ></path>
                      </svg>
                      <span>Log Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      {authenticated === undefined ? (
        <div className="w-full h-full flex flex-col justify-center items-center">
          <ClipLoader />
          <span>Fetching user details</span>
        </div>
      ) : (
        <div className="p-6">
          <Outlet />
          <Toaster />
        </div>
      )}
    </div>
  );
};

export default Layout;
