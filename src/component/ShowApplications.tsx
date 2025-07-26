import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationTriangle, faExclamationCircle, faInfoCircle, faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import Navigation from "./Navigation";
import { Grid, List, Eye, Edit, Trash2, CheckCircle, XCircle, Filter, Search, ChevronDown, X, ChevronLeft, ChevronRight, MoreVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuthenticationState } from "@/hooks/zus-store";
import {
  useFetchApplications,
  useDeleteApplication,
} from "@/hooks/query-hooks";
import { linkify } from "@/utils/linkify";
import { toast } from "react-toastify";

interface Application {
  applicationName: string;
  appUrl: string;
  appDescription: string;
  applicationStatus: string;
  backendRepoUrl: string;
  frontendRepoUrl: string;
  socketRepoUrl: string;
  logFileUrl: string;
  backendAppUrl: string;
  backendPipelineUrl: string;
  frontendPipelineUrl: string;
  socketPipelineUrl: string;
  files?: File[];
  id: string;
}

interface AlertModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info';
}

const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning'
}) => {
  if (!isOpen) return null;

  const getModalStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: faExclamationCircle,
          iconColor: 'text-red-500',
          borderColor: 'border-red-200',
          bgColor: 'bg-red-50',
          buttonColor: 'bg-red-500 hover:bg-red-600',
          buttonText: 'text-white'
        };
      case 'info':
        return {
          icon: faInfoCircle,
          iconColor: 'text-blue-500',
          borderColor: 'border-blue-200',
          bgColor: 'bg-blue-50',
          buttonColor: 'bg-blue-500 hover:bg-blue-600',
          buttonText: 'text-white'
        };
      default:
        return {
          icon: faExclamationTriangle,
          iconColor: 'text-yellow-500',
          borderColor: 'border-yellow-200',
          bgColor: 'bg-yellow-50',
          buttonColor: 'bg-yellow-500 hover:bg-yellow-600',
          buttonText: 'text-white'
        };
    }
  };

  const styles = getModalStyles();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all">
        <div className={`p-6 ${styles.bgColor} rounded-t-xl border-b ${styles.borderColor}`}>
          <div className="flex items-start">
            <div className={`flex-shrink-0 ${styles.iconColor} mr-4`}>
              <FontAwesomeIcon icon={styles.icon} size="2x" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: message }} />
            </div>
          </div>
        </div>
        <div className="p-6 bg-white rounded-b-xl">
          <div className="flex justify-end space-x-4">
            <button
              onClick={onCancel}
              className="px-6 py-2.5 text-gray-700 hover:text-gray-900 font-medium rounded-lg hover:bg-gray-100 transition-colors duration-200"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`px-6 py-2.5 ${styles.buttonColor} ${styles.buttonText} font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Modern Multi-Select Filter Component for Application Names
const MultiSelectFilter = ({
  title,
  options,
  selectedValues,
  onSelectionChange,
  placeholder = "Select items...",
  maxDisplayTags = 2
}: {
  title: string;
  options: string[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  placeholder?: string;
  maxDisplayTags?: number;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleOption = (option: string) => {
    const newSelection = selectedValues.includes(option)
      ? selectedValues.filter(item => item !== option)
      : [...selectedValues, option];
    onSelectionChange(newSelection);
  };

  const removeTag = (option: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectionChange(selectedValues.filter(item => item !== option));
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  const selectAll = () => {
    onSelectionChange([...options]);
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const displayTags = selectedValues.slice(0, maxDisplayTags);
  const remainingCount = selectedValues.length - maxDisplayTags;

  return (
    <div className="relative w-full sm:w-auto" ref={containerRef}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
        <span className="text-xs sm:text-sm font-medium text-gray-700">{title}</span>
        <motion.div
          onClick={() => setIsOpen(!isOpen)}
          className="relative flex items-center gap-2 px-2 sm:px-3 py-1.5 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-blue-500 transition-all duration-200 min-w-[120px] w-full sm:w-auto"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Filter size={14} className="text-gray-500" />

          {selectedValues.length === 0 ? (
            <span className="text-xs text-gray-400">{placeholder}</span>
          ) : (
            <div className="flex items-center gap-1 flex-1">
              {displayTags.map((tag) => (
                <motion.span
                  key={tag}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 rounded-full text-xs font-medium border border-blue-300"
                >
                  <span className="truncate max-w-[60px]">{tag}</span>
                  <button
                    onClick={(e) => removeTag(tag, e)}
                    className="hover:bg-blue-300 rounded-full p-0.5"
                    style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
                  >
                    <X size={10} />
                  </button>
                </motion.span>
              ))}
              {remainingCount > 0 && (
                <span className="text-xs text-gray-500 font-medium">
                  +{remainingCount} more
                </span>
              )}
            </div>
          )}

          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={14} className="text-gray-500" />
          </motion.div>
        </motion.div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-full mt-2 left-0 right-0 sm:right-auto w-full sm:w-80 bg-white border border-gray-200 rounded-xl shadow-2xl z-50"
            style={{ boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
          >
            {/* Header with search */}
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search applications, descriptions, URLs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-between items-center p-3 bg-gray-50 border-b border-gray-100">
              <div className="text-xs text-gray-600">
                {selectedValues.length} of {options.length} selected
              </div>
              <div className="flex">
                <button
                  onClick={clearAll}
                  className="text-xs text-red-500 hover:text-red-700 px-1.5 py-0.5 rounded transition-colors"
                  style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  Clear All
                </button>
                <button
                  onClick={selectAll}
                  className="text-xs text-blue-600 hover:text-blue-900 px-1.5 py-0.5 rounded transition-colors"
                  style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  Select All
                </button>
              </div>
            </div>

            {/* Options list */}
            <div className="max-h-60 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No applications found
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = selectedValues.includes(option);
                  return (
                    <motion.div
                      key={option}
                      onClick={() => toggleOption(option)}
                      className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-all duration-150 ${isSelected
                        ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-500'
                        : 'hover:bg-gray-50'
                        }`}
                    >
                      <span className={`text-sm ${isSelected ? 'text-blue-600 font-medium' : 'text-gray-700'}`}>
                        {option}
                      </span>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center"
                        >
                          <motion.div
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.2, delay: 0.1 }}
                          >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path
                                d="M2 6L5 9L10 3"
                                stroke="white"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </motion.div>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Modern Pagination Component
const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  startIndex,
  endIndex
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
  startIndex: number;
  endIndex: number;
}) => {
  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const visiblePages = getVisiblePages();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-white border-t border-gray-200">
      {/* Results info */}
      <div className="text-sm text-gray-700">
        Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
        <span className="font-medium">{Math.min(endIndex, totalItems)}</span> of{' '}
        <span className="font-medium">{totalItems}</span> results
      </div>

      {/* Pagination controls */}
      <div className="flex items-center space-x-2">
        {/* Previous button */}
        <motion.button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg border transition-all duration-200 ${currentPage === 1
            ? 'border-gray-300 text-gray-400 cursor-not-allowed'
            : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
            }`}
          whileHover={currentPage !== 1 ? { scale: 1.05 } : {}}
          whileTap={currentPage !== 1 ? { scale: 0.95 } : {}}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </motion.button>

        {/* Page numbers */}
        <div className="flex items-center space-x-1">
          {visiblePages.map((page, index) => (
            <motion.button
              key={index}
              onClick={() => typeof page === 'number' && onPageChange(page)}
              disabled={typeof page !== 'number'}
              className={`min-w-[40px] h-10 text-sm font-medium rounded-lg transition-all duration-200 ${page === currentPage
                ? 'bg-blue-600 text-white border border-blue-600 shadow-sm'
                : typeof page === 'number'
                  ? 'text-gray-700 hover:bg-gray-50 border border-gray-300 hover:border-gray-400'
                  : 'text-gray-400 cursor-default'
                }`}
              whileHover={typeof page === 'number' && page !== currentPage ? { scale: 1.1 } : {}}
              whileTap={typeof page === 'number' && page !== currentPage ? { scale: 0.95 } : {}}
            >
              {page}
            </motion.button>
          ))}
        </div>

        {/* Next button */}
        <motion.button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg border transition-all duration-200 ${currentPage === totalPages
            ? 'border-gray-300 text-gray-400 cursor-not-allowed'
            : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
            }`}
          whileHover={currentPage !== totalPages ? { scale: 1.05 } : {}}
          whileTap={currentPage !== totalPages ? { scale: 0.95 } : {}}
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </motion.button>
      </div>
    </div>
  );
};

function ShowApplications() {
  const navigate = useNavigate();
  const { data: applications, isLoading, error, refetch } = useFetchApplications();
  const deleteApplicationMutation = useDeleteApplication();

  const [appList, setAppList] = useState<Application[]>([]);
  const [filteredAppList, setFilteredAppList] = useState<Application[]>([]);
  const [appSearchQuery, setAppSearchQuery] = useState<string>("");
  const [expandedDescriptions, setExpandedDescriptions] = useState<{ [key: string]: boolean }>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showDeleteAppConfirmation, setShowDeleteAppConfirmation] = useState<{
    show: boolean;
    appId: string | null;
    appName: string | null;
  }>({ show: false, appId: null, appName: null });
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'warning' | 'danger' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    type: 'warning'
  });
  const [selectedApplicationNames, setSelectedApplicationNames] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const keyCloakInitialized = useAuthenticationState((state) => state.keyCloakInitialized);
  const isAdmin = keyCloakInitialized.hasResourceRole("admin", "admin-cli");

  useEffect(() => {
    if (applications) {
      const apps = Array.isArray(applications) ? applications : [];

      // Sort applications immediately: Active first, then Inactive, then by name
      const sortedApps = apps.sort((a, b) => {
        const statusOrder: { [key: string]: number } = { 'Active': 0, 'Inactive': 1 };
        const statusComparison = (statusOrder[a.applicationStatus] ?? 2) - (statusOrder[b.applicationStatus] ?? 2);

        // If statuses are the same, sort by application name
        if (statusComparison === 0) {
          return a.applicationName.localeCompare(b.applicationName);
        }

        return statusComparison;
      });

      setAppList(sortedApps);
      setFilteredAppList(sortedApps);
    }
  }, [applications]);

  // Filter and sort applications based on search query and status filter
  useEffect(() => {
    let filtered = appList;

    // Apply text search filter
    if (appSearchQuery.trim() !== "") {
      const query = appSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (app) =>
          app.applicationName.toLowerCase().includes(query) ||
          app.appDescription.toLowerCase().includes(query) ||
          app.appUrl.toLowerCase().includes(query) ||
          app.applicationStatus.toLowerCase().includes(query)
      );
    }

    // Apply application status filter
    if (selectedApplicationNames.length > 0) {
      filtered = filtered.filter(app =>
        selectedApplicationNames.includes(app.applicationStatus)
      );
    }

    // Sort by status: Active first, then Inactive, then by name within each status
    filtered = filtered.sort((a, b) => {
      const statusOrder: { [key: string]: number } = { 'Active': 0, 'Inactive': 1 };
      const statusComparison = (statusOrder[a.applicationStatus] ?? 2) - (statusOrder[b.applicationStatus] ?? 2);

      // If statuses are the same, sort by application name
      if (statusComparison === 0) {
        return a.applicationName.localeCompare(b.applicationName);
      }

      return statusComparison;
    });

    setFilteredAppList(filtered);
  }, [appSearchQuery, appList, selectedApplicationNames]);

  // Get unique application statuses for filter (excluding In Progress)
  const uniqueApplicationStatuses = useMemo(() => {
    const statuses = Array.from(new Set(appList.map(app => app.applicationStatus)))
      .filter(status => status !== 'In Progress')
      .sort();
    return statuses;
  }, [appList]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredAppList.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageData = filteredAppList.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [appSearchQuery, selectedApplicationNames]);

  const toggleDescription = useCallback((id: string) => {
    setExpandedDescriptions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  const handleAppSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };


  // Handle application delete
  const handleDeleteApplication = (appId: string, appName: string) => {
    setShowDeleteAppConfirmation({
      show: true,
      appId,
      appName
    });
  };

  // Confirm application delete
  const confirmDeleteApplication = () => {
    if (showDeleteAppConfirmation.appId) {
      deleteApplicationMutation.mutate(showDeleteAppConfirmation.appId, {
        onSuccess: () => {
          toast.success(`Application "${showDeleteAppConfirmation.appName}" deleted successfully!`);
          setShowDeleteAppConfirmation({ show: false, appId: null, appName: null });
          refetch();
        },
        onError: (error) => {
          console.error("Error deleting application:", error);
          toast.error("Failed to delete application. Please try again.");
        }
      });
    }
  };

  // Handle application edit
  const handleEditApplication = (appId: string) => {
    navigate(`/application/${appId}?edit=true`);
  };

  // Application Card Component
  const ApplicationCard = ({ app, isListView = false }: { app: Application; index: number; isListView?: boolean }) => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case "Active":
          return "bg-green-100 text-green-800 border-green-200";
        case "Inactive":
          return "bg-red-100 text-red-800 border-red-200";
        default:
          return "bg-gray-100 text-gray-800 border-gray-200";
      }
    };

    const getStatusIcon = (status: string) => {
      switch (status) {
        case "Active":
          return <CheckCircle className="w-3 h-3 mr-1 text-green-500" />;
        case "Inactive":
          return <XCircle className="w-3 h-3 mr-1 text-red-500" />;
        default:
          return null;
      }
    };

    const shouldShowToggle = () => {
      const plainTextDescription = app.appDescription.replace(/<[^>]*>/g, ''); // Remove HTML tags

      // For list view, show toggle for any description longer than 20 characters
      // For grid view, show toggle for any description longer than 100 characters
      if (isListView) {
        return plainTextDescription.trim().length > 20;
      } else {
        return plainTextDescription.trim().length > 100;
      }
    };

    if (isListView) {
      // List view layout - horizontal with actions on the right
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 p-4 min-h-32 w-full flex items-start">
          {/* Left side - Content */}
          <div className="flex-1 pr-6 flex flex-col min-w-0">
            {/* Header with name and status */}
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-base font-semibold text-gray-900 truncate">{app.applicationName}</h3>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0 ${getStatusColor(app.applicationStatus)}`}>
                {getStatusIcon(app.applicationStatus)}
                {app.applicationStatus}
              </span>
            </div>

            {/* Description */}
            <div className="flex-1 min-h-0">
              <div
                className={`text-gray-600 text-sm transition-all duration-200 ${expandedDescriptions[app.id]
                  ? "line-clamp-none"
                  : "line-clamp-3"
                  }`}
                dangerouslySetInnerHTML={{ __html: linkify(app.appDescription) }}
              />
              {shouldShowToggle() && (
                <div className="mt-1">
                  <button
                    onClick={() => toggleDescription(app.id)}
                    className="text-blue-500 hover:text-blue-700 text-xs font-medium hover:bg-blue-50 rounded px-1"
                  >
                    {expandedDescriptions[app.id] ? "Show less" : "Show more"}
                  </button>
                </div>
              )}
            </div>

            {/* URL */}
            <div className="mt-1">
              <a
                href={app.appUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700 text-xs font-medium inline-flex items-center truncate"
              >
                <FontAwesomeIcon icon={faExternalLinkAlt} className="mr-1 flex-shrink-0" />
                <span className="truncate">{app.appUrl}</span>
              </a>
            </div>
          </div>

          {/* Right side - Action buttons */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            <a
              href={app.appUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-800 text-white text-sm rounded-lg hover:from-blue-700 hover:to-blue-900 transition-colors"
            >
              Open <FontAwesomeIcon icon={faExternalLinkAlt} className="ml-2" />
            </a>

            {/* Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex items-center px-2 py-2 text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem asChild>
                  <Link
                    to={`/application/${app.id}`}
                    className="flex items-center w-full"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleEditApplication(app.id)}
                      className="flex items-center cursor-pointer"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDeleteApplication(app.id, app.applicationName)}
                      className="flex items-center cursor-pointer text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      );
    }

    // Grid view layout - vertical layout
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 p-4 h-72 w-full flex flex-col">
        {/* Header with name, status and actions */}
        <div className="flex items-start justify-between mb-2 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-gray-900 truncate flex-1">{app.applicationName}</h3>
              {/* Three dots menu inline with name */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="inline-flex items-center px-1 py-1 text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors ml-2">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem asChild>
                    <Link
                      to={`/application/${app.id}`}
                      className="flex items-center w-full"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleEditApplication(app.id)}
                        className="flex items-center cursor-pointer"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteApplication(app.id, app.applicationName)}
                        className="flex items-center cursor-pointer text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0 ${getStatusColor(app.applicationStatus)}`}>
              {getStatusIcon(app.applicationStatus)}
              {app.applicationStatus}
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="flex-1 overflow-hidden mb-2">
          <div
            className={`text-gray-600 text-sm line-clamp-3 ${expandedDescriptions[app.id] ? "line-clamp-5" : "line-clamp-3"}`}
            dangerouslySetInnerHTML={{ __html: linkify(app.appDescription) }}
          />
          {shouldShowToggle() && (
            <button
              onClick={() => toggleDescription(app.id)}
              className="text-blue-500 hover:text-blue-700 text-xs font-medium hover:bg-blue-50 rounded px-1 mt-1"
            >
              {expandedDescriptions[app.id] ? "Show less" : "Show more"}
            </button>
          )}
        </div>

        {/* URL */}
        <div className="mb-3 flex-shrink-0">
          <a
            href={app.appUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-700 text-xs font-medium inline-flex items-center truncate"
            title={app.appUrl}
          >
            <FontAwesomeIcon icon={faExternalLinkAlt} className="mr-1 flex-shrink-0" />
            <span className="truncate">{app.appUrl}</span>
          </a>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end flex-shrink-0 mt-auto">
          <a
            href={app.appUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-800 text-white text-xs rounded-lg hover:from-blue-700 hover:to-blue-900 transition-colors"
          >
            Open <FontAwesomeIcon icon={faExternalLinkAlt} className="ml-2" />
          </a>
        </div>
      </div>
    );
  };

  const appGridView = useMemo(() => {
    if (filteredAppList.length === 0) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-center text-blue-600">No applications found matching your search.</p>
        </motion.div>
      );
    }
    return (
      <motion.div
        key="grid-view"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {currentPageData.map((app, index) => (
          <motion.div
            key={app.id}
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 0.5,
              delay: index * 0.1,
              ease: "easeOut"
            }}
            whileHover={{
              y: -5,
              scale: 1.02,
              transition: { duration: 0.2 }
            }}
          >
            <ApplicationCard app={app} index={startIndex + index} />
          </motion.div>
        ))}
      </motion.div>
    );
  }, [currentPageData, startIndex, expandedDescriptions, toggleDescription, isAdmin]);

  const appListView = useMemo(() => {
    if (filteredAppList.length === 0) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-center text-blue-600">No applications found matching your search.</p>
        </motion.div>
      );
    }
    return (
      <motion.div
        key="list-view"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="space-y-4"
      >
        {currentPageData.map((app, index) => (
          <motion.div
            key={app.id}
            initial={{ opacity: 0, x: -50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{
              duration: 0.5,
              delay: index * 0.08,
              ease: "easeOut"
            }}
            whileHover={{
              x: 5,
              scale: 1.01,
              transition: { duration: 0.2 }
            }}
          >
            <ApplicationCard app={app} index={startIndex + index} isListView={true} />
          </motion.div>
        ))}
      </motion.div>
    );
  }, [currentPageData, startIndex, expandedDescriptions, toggleDescription, isAdmin]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-300 border-t-blue-400 rounded-full animate-spin mx-auto"></div>
          <p>Loading Applications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <p className="text-center text-red-600">Error loading applications.</p>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 rounded-sm">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200">
        <Navigation />

        <div className="px-8 py-6">
          <div className="mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Applications Management</h2>
                <p className="text-slate-500">Manage your applications with advanced filtering and search</p>
              </div>
              <div className="text-sm text-slate-600 bg-slate-100 px-3 py-2 rounded-lg">
                <span className="font-medium">{filteredAppList.length}</span> applications found
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              <form onSubmit={handleAppSearch} className="w-[300px]">
                <input
                  type="text"
                  placeholder="Search applications, descriptions, URLs..."
                  value={appSearchQuery}
                  onChange={(e) => setAppSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 placeholder-slate-400"
                />
              </form>

              {/* Application Status Filter */}
              <MultiSelectFilter
                title="Filter by Application Status"
                options={uniqueApplicationStatuses}
                selectedValues={selectedApplicationNames}
                onSelectionChange={setSelectedApplicationNames}
                placeholder="Select statuses..."
                maxDisplayTags={1}
              />

              {/* View Switcher */}
              <div className="flex items-center bg-gray-100 rounded-lg p-2 relative">
                <motion.button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-300 relative z-10 ${viewMode === 'list'
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <List className="w-4 h-4 mr-1" />
                </motion.button>
                <motion.button
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-300 relative z-10 ${viewMode === 'grid'
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Grid className="w-4 h-4" />
                </motion.button>

                {/* Animated background indicator */}
                <motion.div
                  className="absolute bg-white shadow-sm rounded-md h-8 top-1"
                  initial={false}
                  animate={{
                    x: viewMode === 'list' ? 4 : 48,
                    width: 40
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30
                  }}
                />
              </div>
            </div>

            {isAdmin && (
              <Link
                to="/application/new"
                className="px-4 py-2 bg-indigo-600/95 text-white rounded-lg shadow-md hover:bg-indigo-700 transition"
              >
                + Add New Application
              </Link>
            )}
          </div>

          <div className="relative">
            <AnimatePresence mode="wait">
              {viewMode === 'grid' ? appGridView : appListView}
            </AnimatePresence>
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredAppList.length}
            itemsPerPage={itemsPerPage}
            startIndex={startIndex}
            endIndex={endIndex}
          />
        </div>
      </div>

      <AlertModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        onConfirm={alertModal.onConfirm}
        onCancel={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
        type={alertModal.type}
      />

      {/* Delete Application Confirmation Modal */}
      {showDeleteAppConfirmation.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl max-w-md w-full shadow-2xl border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Confirm Delete</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>

            <p className="mb-8 text-gray-600 text-base">
              Are you sure you want to delete <span className="font-medium text-gray-900">{showDeleteAppConfirmation.appName}</span>? All associated data will be permanently removed.
            </p>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowDeleteAppConfirmation({ show: false, appId: null, appName: null })}
                className="px-5 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteApplication}
                disabled={deleteApplicationMutation.isPending}
                className="px-5 py-2.5 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleteApplicationMutation.isPending ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Application
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ShowApplications;



