import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Trash2,
  FileText,
  CloudUpload,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  X,
  AlertTriangle,
  Settings,
  Database,
  Upload,
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import {
  useFetchApplicationDetails,
  useEditApplication,
  useDeleteApplication,
  useDeleteFile,
  useDownloadFile,
} from "../hooks/query-hooks";
import ReactQuill from "react-quill";
import * as React from "react";
import { Icon } from "@iconify/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload } from "@fortawesome/free-solid-svg-icons";
import { faAsterisk } from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";
import { useAuthenticationState } from "@/hooks/zus-store";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface FileDetails {
  fileName: string;
  fileType: string;
  fileSize: number;
  description: string;
  gridFsFileId: string;
  uploadDate: string;
  id: string;
}

interface Application {
  applicationName: string;
  appUrl: string;
  appDescription: string;
  applicationStatus: string;
  id: string;
  backendPipelineUrl?: string;
  frontendPipelineUrl?: string;
  socketPipelineUrl?: string;
  backendRepoUrl?: string;
  frontendRepoUrl?: string;
  socketRepoUrl?: string;
  logFileUrl?: string;
  inputFiles?: FileDetails[];
  outputFiles?: FileDetails[];
  referenceFiles?: FileDetails[];
  backendAppUrl: string;
}

interface DownloadingStates {
  [key: string]: boolean;
}

const ApplicationDetails = () => {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: appData, isLoading, error, refetch } = useFetchApplicationDetails(appId || "");
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [showFileDeleteConfirmation, setShowFileDeleteConfirmation] = useState<{
    show: boolean;
    gridFsFileId: string | null;
    fileType: "input" | "output" | "reference" | null;
    fileName: string | null;
  }>({ show: false, gridFsFileId: null, fileType: null, fileName: null });

  // Accordion state management (for view mode)
  const [openSections, setOpenSections] = useState({
    applicationDetails: true, // Default to expanded
    jenkinsRepo: false,
    fileUploads: false,
  });

  // Step-based wizard state management (for edit mode)
  const [currentStep, setCurrentStep] = useState(1);
  const [stepErrors, setStepErrors] = useState({
    applicationName: "",
    appUrl: "",
    appDescription: "",
  });

  // Refs for focusing on error in edit mode
  const nameRef = useRef<HTMLInputElement | null>(null);
  const urlRef = useRef<HTMLInputElement | null>(null);
  const descRef = useRef<ReactQuill | null>(null);

  // Steps configuration for edit mode
  const steps = [
    {
      number: 1,
      title: "Application Details",
      icon: Settings,
      description: "Step 1",
    },
    {
      number: 2,
      title: "Jenkins & Repository Configuration",
      icon: Database,
      description: "Step 2",
    },
    {
      number: 3,
      title: "File Uploads",
      icon: Upload,
      description: "Step 3",
    },
  ];

  const keyCloakInitialized = useAuthenticationState((state) => state.keyCloakInitialized);

  const [newInputFiles, setNewInputFiles] = useState<File[]>([]);
  const [newOutputFiles, setNewOutputFiles] = useState<File[]>([]);
  const [newReferenceFiles, setNewReferenceFiles] = useState<File[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  const inputFileRef = useRef<HTMLInputElement>(null);
  const outputFileRef = useRef<HTMLInputElement>(null);
  const referenceFileRef = useRef<HTMLInputElement>(null);
  const downloadMutation = useDownloadFile();
  const [, setDownloadingStates] = React.useState<DownloadingStates>({});

  const isCancelled = useRef(false); // Track if the save operation is canceled
  const abortControllerRef = useRef<AbortController | null>(null); // Ref to store AbortController
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Application>({
    defaultValues: {
      applicationName: "",
      appUrl: "",
      appDescription: "",
      applicationStatus: "Active",
      backendPipelineUrl: "",
      frontendPipelineUrl: "",
      socketPipelineUrl: "",
      backendRepoUrl: "",
      frontendRepoUrl: "",
      socketRepoUrl: "",
      logFileUrl: "",
      inputFiles: [],
      outputFiles: [],
      referenceFiles: [],
      backendAppUrl: "",
    },
  });

  const [localAppData, setLocalAppData] = useState<Application | null>(null);

  useEffect(() => {
    if (appData) {
      setLocalAppData(appData);
    }
  }, [appData]);

  // Handle edit mode from URL parameter
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('edit') === 'true') {
      setIsEditingMode(true);
    }
  }, [location.search]);

  const handleCancelEdit = () => {
    setShowCancelConfirmation(true);
  };

  const handleConfirmCancel = () => {
    isCancelled.current = true; // Set the cancel flag
    if (abortControllerRef.current) {
      abortControllerRef.current.abort(); // Abort the ongoing request
    }
    setIsEditingMode(false); // Exit editing mode
    reset(appData); // Reset form fields to their original values
    setNewInputFiles([]); // Clear new input files
    setNewOutputFiles([]); // Clear new output files
    setNewReferenceFiles([]); // Clear new reference files
    setValidationError(null); // Clear validation error
    setShowCancelConfirmation(false); // Close the modal
    toast.info("Edit operation canceled."); // Provide user feedback
  };

  const handleCancelCancel = () => {
    setShowCancelConfirmation(false);
  };

  const handleEditClick = () => {
    isCancelled.current = false; // Reset the cancel flag
    abortControllerRef.current = new AbortController(); // Create a new AbortController
    setIsEditingMode(true); // Enter editing mode
    setCurrentStep(1); // Reset to first step when entering edit mode
    setStepErrors({ applicationName: "", appUrl: "", appDescription: "" }); // Clear step errors
  };

  // Step validation for edit mode
  const validateStep = (step: number) => {
    const newErrors = {
      applicationName: "",
      appUrl: "",
      appDescription: "",
    };

    let hasError = false;

    if (step === 1) {
      const currentValues = localAppData;
      // Validate Application Name
      if (!currentValues?.applicationName?.trim()) {
        newErrors.applicationName = "Application Name is required.";
        hasError = true;
      }
      // Validate Application URL
      if (!currentValues?.appUrl?.trim()) {
        newErrors.appUrl = "Application URL is required.";
        hasError = true;
      }
      // Validate Application Description
      if (
        !currentValues?.appDescription ||
        currentValues.appDescription === "<p><br></p>" ||
        currentValues.appDescription.trim() === ""
      ) {
        newErrors.appDescription = "Description is required.";
        hasError = true;
      }
    }

    setStepErrors(newErrors);

    // Focus on the first field with an error (with null check)
    if (newErrors.applicationName && nameRef.current) {
      nameRef.current.focus();
    } else if (newErrors.appUrl && urlRef.current) {
      urlRef.current.focus();
    } else if (newErrors.appDescription && descRef.current) {
      setTimeout(() => {
        descRef.current?.getEditor().focus();
      }, 0);
    }

    return !hasError;
  };

  const handleNext = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 3));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    setStepErrors({ applicationName: "", appUrl: "", appDescription: "" }); // Clear errors when going back
  };

  // Toggle accordion sections
  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Drag-and-drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add("border-indigo-300");
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove("border-indigo-300");
  };

  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
    fileType: "input" | "output" | "reference"
  ) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove("border-indigo-300");
    const files = Array.from(e.dataTransfer.files);
    handleFileSelection(files, fileType);
  };

  const handleFileSelection = (
    selectedFiles: File[],
    fileType: "input" | "output" | "reference"
  ) => {
    const maxFileSize = 200 * 1024 * 1024; // 200MB in bytes

    // Check if any single file exceeds 200MB
    const hasLargeFile = selectedFiles.some((file) => file.size > maxFileSize);

    if (hasLargeFile) {
      setValidationError(`One or more files exceed the maximum file size of 200MB.`);
      return; // Stop if any single file exceeds 200MB
    }

    // If no single file exceeds 200MB, proceed with adding the files
    switch (fileType) {
      case "input":
        setNewInputFiles((prevFiles) => [...prevFiles, ...selectedFiles]);
        break;
      case "output":
        setNewOutputFiles((prevFiles) => [...prevFiles, ...selectedFiles]);
        break;
      case "reference":
        setNewReferenceFiles((prevFiles) => [...prevFiles, ...selectedFiles]);
        break;
    }
    setValidationError(null); // Clear validation error if successful
  };

  const removeSelectedFile = (file: File, fileType: "input" | "output" | "reference") => {
    switch (fileType) {
      case "input":
        setNewInputFiles((prevFiles) => prevFiles.filter((f) => f !== file));
        break;
      case "output":
        setNewOutputFiles((prevFiles) => prevFiles.filter((f) => f !== file));
        break;
      case "reference":
        setNewReferenceFiles((prevFiles) => prevFiles.filter((f) => f !== file));
        break;
    }
  };

  useEffect(() => {
    if (appData) {
      reset(appData);
    }
  }, [appData, reset]);

  const updateMutation = useEditApplication();
  const deleteMutation = useDeleteApplication();
  const deleteFileMutation = useDeleteFile();

  const handleSaveChanges = (data: Application) => {
    isCancelled.current = false; // Reset the cancel flag
    if (isCancelled.current) {
      console.log("Save operation was canceled before starting.");
      return;
    }

    const formData = new FormData();
    formData.append("application", JSON.stringify(data));
    newInputFiles.forEach((file) => formData.append("inputFiles", file));
    newOutputFiles.forEach((file) => formData.append("outputFiles", file));
    newReferenceFiles.forEach((file) => formData.append("referenceFiles", file));

    console.log(newInputFiles);
    updateMutation.mutate(
      {
        id: appId || "",
        application: data,
        inputFiles: newInputFiles,
        outputFiles: newOutputFiles,
        referenceFiles: newReferenceFiles,
      },
      {
        onSuccess: (updatedData) => {
          // Check if the operation was cancelled before proceeding
          if (isCancelled.current) {
            console.log("Save operation was canceled.");
            toast.info("Save operation canceled."); // Provide user feedback
            return; // Stop if the operation was canceled
          }

          setLocalAppData(updatedData); // Update local state with the new data

          setIsEditingMode(false);
          refetch();

          // Clear the new files states after saving
          setNewInputFiles([]);
          setNewOutputFiles([]);
          setNewReferenceFiles([]);
          setValidationError(null); // Clear validation error after successful save
        },
        onError: (error) => {
          // Handle error if needed
          console.error("Error saving application:", error);
          toast.error("Failed to save application. Please try again."); // Provide user feedback
        },
      }
    );
  };

  const handleDelete = () => {
    if (appId) {
      deleteMutation.mutate(appId, {
        onSuccess: () => {
          navigate("/applications", {
            state: { message: "Application deleted successfully!" },
          });
        },
      });
    }
  };

  const handleDownloadFile = (gridFsFileId: string, fileName: string) => {
    setDownloadingStates((prev) => ({ ...prev, [gridFsFileId]: true }));
    console.log(gridFsFileId);
    downloadMutation.mutate(gridFsFileId, {
      onSuccess: (data) => {
        const blob = new Blob([data], { type: "application/octet-stream" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        setDownloadingStates((prev) => ({ ...prev, [gridFsFileId]: false }));
        toast.success(`${fileName} downloaded successfully!`);
      },
      onError: (error) => {
        console.error("Failed to download file:", error);
        toast.error("Failed to download file. Please try again.");
        setDownloadingStates((prev) => ({ ...prev, [gridFsFileId]: false }));
      },
    });
  };

  const handleDeleteFile = (
    e: React.MouseEvent,
    gridFsFileId: string,
    fileType: "input" | "output" | "reference",
    fileName: string
  ) => {
    e.preventDefault();
    e.stopPropagation(); // Stop event propagation
    setShowFileDeleteConfirmation({
      show: true,
      gridFsFileId,
      fileType,
      fileName,
    });
  };
  const confirmDeleteFile = () => {
    const { gridFsFileId, fileType, fileName } = showFileDeleteConfirmation;
    if (appId && gridFsFileId && localAppData) {
      deleteFileMutation.mutate(
        { applicationId: appId, gridFsFileId },
        {
          onSuccess: () => {
            // Update the local state to remove the deleted file
            let updatedFiles;
            switch (fileType) {
              case "input":
                updatedFiles =
                  localAppData.inputFiles?.filter((file) => file.gridFsFileId !== gridFsFileId) ||
                  [];
                setLocalAppData({ ...localAppData, inputFiles: updatedFiles });
                break;
              case "output":
                updatedFiles =
                  localAppData.outputFiles?.filter((file) => file.gridFsFileId !== gridFsFileId) ||
                  [];
                setLocalAppData({ ...localAppData, outputFiles: updatedFiles });
                break;
              case "reference":
                updatedFiles =
                  localAppData.referenceFiles?.filter(
                    (file) => file.gridFsFileId !== gridFsFileId
                  ) || [];
                setLocalAppData({
                  ...localAppData,
                  referenceFiles: updatedFiles,
                });
                break;
            }

            setShowFileDeleteConfirmation({
              show: false,
              gridFsFileId: null,
              fileType: null,
              fileName: null,
            });
            alert(`✅ File "${fileName}" deleted successfully!`); // Include filename in the alert
          },
          onError: (error) => {
            console.error("Failed to delete file:", error);
            if ((error as any).response?.status === 404) {
              alert("File not found. It may have already been deleted.");
            } else {
              alert("Failed to delete file. Please try again.");
            }
          },
        }
      );
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Application Name
                  <span style={{ marginRight: "4px" }} />
                  <FontAwesomeIcon icon={faAsterisk} style={{ color: "red", fontSize: "10px" }} />
                </label>
                <Controller
                  name="applicationName"
                  control={control}
                  rules={{
                    required: "Application Name is required",
                  }}
                  render={({ field }) => (
                    <input
                      {...field}
                      ref={nameRef}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 placeholder-slate-400"
                      maxLength={3000}
                      placeholder="My Application"
                    />
                  )}
                />
                {stepErrors.applicationName && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-600 mt-2">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    <span className="text-sm">{stepErrors.applicationName}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Application URL
                  <span style={{ marginRight: "4px" }} />
                  <FontAwesomeIcon icon={faAsterisk} style={{ color: "red", fontSize: "10px" }} />
                </label>
                <div className="flex items-center gap-2">
                  <Controller
                    name="appUrl"
                    control={control}
                    rules={{
                      required: "Application URL is required",
                    }}
                    render={({ field }) => (
                      <input
                        {...field}
                        ref={urlRef}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 placeholder-slate-400"
                        placeholder="https://example.com"
                      />
                    )}
                  />
                  {stepErrors.appUrl && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-600 mt-2">
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      <span className="text-sm">{stepErrors.appUrl}</span>
                    </div>
                  )}
                  {appData?.appUrl && (
                    <a
                      href={appData.appUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                <Controller
                  name="applicationStatus"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="In Progress">In Progress</option>
                    </select>
                  )}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Backend API Base URL
                </label>
                <Controller
                  name="backendAppUrl"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 placeholder-slate-400"
                      placeholder="https://backendurl.example.com"
                    />
                  )}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description
                <span style={{ marginRight: "4px" }} />
                <FontAwesomeIcon icon={faAsterisk} style={{ color: "red", fontSize: "10px" }} />
              </label>
              <Controller
                name="appDescription"
                control={control}
                rules={{
                  required: "Description is required",
                  validate: {
                    isNotEmpty: (value) => {
                      if (value === "<p><br></p>" || value.trim() === "") {
                        return "Description is required";
                      }
                      return true;
                    },
                  },
                }}
                render={({ field }) => (
                  <ReactQuill
                    {...field}
                    ref={descRef}
                    modules={{
                      toolbar: [
                        [{ header: [1, 2, 3, false] }],
                        ["bold", "italic", "underline", "strike"],
                        [{ color: [] }, { background: [] }],
                        [{ list: "ordered" }, { list: "bullet" }],
                        ["link", "image"],
                        ["clean"],
                      ],
                    }}
                    theme="snow"
                    placeholder="Describe your application..."
                    className="bg-white rounded-lg"
                  />
                )}
              />
              {stepErrors.appDescription && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-600 mt-2">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  <span className="text-sm">{stepErrors.appDescription}</span>
                </div>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-8">
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3">
              <div className="flex items-center mb-4">
                <Database className="w-6 h-6 text-indigo-600 mr-3" />
                <h3 className="text-lg font-semibold text-indigo-900">
                  Jenkins Configuration
                </h3>
              </div>
              <p className="text-indigo-700 text-sm mb-0.5">
                Configure your Jenkins URLs for automated deployment and CI/CD processes.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Backend
                </label>
                <Controller
                  name="backendPipelineUrl"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 placeholder-slate-400"
                      placeholder="https://jenkins.example.com"
                    />
                  )}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Frontend
                </label>
                <Controller
                  name="frontendPipelineUrl"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 placeholder-slate-400"
                      placeholder="https://jenkins.example.com"
                    />
                  )}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Socket
                </label>
                <Controller
                  name="socketPipelineUrl"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 placeholder-slate-400"
                      placeholder="https://jenkins.example.com"
                    />
                  )}
                />
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <div className="flex items-center mb-4">
                <Icon icon="mdi:git" className="w-6 h-6 text-green-600 mr-3" />
                <h3 className="text-lg font-semibold text-green-900">
                  Repository URLs
                </h3>
              </div>
              <p className="text-green-700 text-sm mb-0.5">
                Link your source code repositories for each component of your application.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Backend URL
                </label>
                <Controller
                  name="backendRepoUrl"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 placeholder-slate-400"
                      placeholder="https://github.com/backend"
                    />
                  )}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Frontend URL
                </label>
                <Controller
                  name="frontendRepoUrl"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 placeholder-slate-400"
                      placeholder="https://github.com/frontend"
                    />
                  )}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Socket URL
                </label>
                <Controller
                  name="socketRepoUrl"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 placeholder-slate-400"
                      placeholder="https://github.com/socket"
                    />
                  )}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Log File Location URL
              </label>
              <Controller
                name="logFileUrl"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 placeholder-slate-400"
                    placeholder="https://logs.example.com/application-logs"
                  />
                )}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Upload className="w-12 h-12 text-indigo-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                File Uploads
              </h3>
              <p className="text-slate-600">
                Upload input files, output files, and reference documents for your application.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Input Files Section */}
              <div className="bg-gray-100 p-4 rounded-lg">
                <label className="block text-sm font-medium text-slate-700 mb-2">Input Files</label>
                <div className="space-y-2 overflow-y-auto max-h-[250px] border border-slate-200 rounded-lg p-2 bg-white">
                  {localAppData?.inputFiles?.length ? (
                    localAppData.inputFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white rounded-md border border-slate-200 hover:bg-slate-100 transition-colors">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <FileText className="w-5 h-5 text-slate-500 flex-shrink-0" />
                          <span className="text-slate-700 text-sm truncate" title={file.fileName}>{file.fileName}</span>
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <button onClick={() => handleDownloadFile(file.gridFsFileId, file.fileName)} className="text-blue-500 hover:text-blue-700 cursor-pointer">
                            <FontAwesomeIcon icon={faDownload} className="w-4 h-4" />
                          </button>
                          <button onClick={(e) => handleDeleteFile(e, file.gridFsFileId, "input", file.fileName)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-sm">No input files available.</p>
                  )}
                </div>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-indigo-300 transition-colors cursor-pointer bg-slate-50 mt-4" onClick={() => inputFileRef.current?.click()} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, "input")}>
                  <CloudUpload className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
                  <p className="text-slate-600 mb-1 font-medium">Drag & Drop files here</p>
                  <p className="text-slate-400 text-sm mb-4">or click to browse</p>
                  <input ref={inputFileRef} type="file" multiple onChange={(e) => handleFileSelection(Array.from(e.target.files || []), "input")} className="hidden" />
                  <p className="text-slate-500 text-sm">(max 200 Mb file can be uploaded)</p>
                </div>
                {newInputFiles.length > 0 && (
                  <div className="mt-4">
                    {newInputFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white rounded-md border border-slate-200 hover:bg-slate-100 transition-colors">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <FileText className="w-5 h-5 text-slate-500 flex-shrink-0" />
                          <span className="text-slate-700 text-sm truncate" title={file.name}>{file.name}</span>
                        </div>
                        <button type="button" onClick={() => removeSelectedFile(file, "input")} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Output Files Section */}
              <div className="bg-gray-100 p-4 rounded-lg">
                <label className="block text-sm font-medium text-slate-700 mb-2">Output Files</label>
                <div className="space-y-2 overflow-y-auto max-h-[250px] border border-slate-200 rounded-lg p-2 bg-white">
                  {localAppData?.outputFiles?.length ? (
                    localAppData.outputFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white rounded-md border border-slate-200 hover:bg-slate-100 transition-colors">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <FileText className="w-5 h-5 text-slate-500 flex-shrink-0" />
                          <span className="text-slate-700 text-sm truncate" title={file.fileName}>{file.fileName}</span>
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <button onClick={() => handleDownloadFile(file.gridFsFileId, file.fileName)} className="text-blue-500 hover:text-blue-700 cursor-pointer">
                            <FontAwesomeIcon icon={faDownload} className="w-4 h-4" />
                          </button>
                          <button onClick={(e) => handleDeleteFile(e, file.gridFsFileId, "output", file.fileName)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-sm">No output files available.</p>
                  )}
                </div>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-indigo-300 transition-colors cursor-pointer bg-slate-50 mt-4" onClick={() => outputFileRef.current?.click()} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, "output")}>
                  <CloudUpload className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
                  <p className="text-slate-600 mb-1 font-medium">Drag & Drop files here</p>
                  <p className="text-slate-400 text-sm mb-4">or click to browse</p>
                  <input ref={outputFileRef} type="file" multiple onChange={(e) => handleFileSelection(Array.from(e.target.files || []), "output")} className="hidden" />
                  <p className="text-slate-500 text-sm">(max 200 Mb file can be uploaded)</p>
                </div>
                {newOutputFiles.length > 0 && (
                  <div className="mt-4">
                    {newOutputFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white rounded-md border border-slate-200 hover:bg-slate-100 transition-colors">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <FileText className="w-5 h-5 text-slate-500 flex-shrink-0" />
                          <span className="text-slate-700 text-sm truncate" title={file.name}>{file.name}</span>
                        </div>
                        <button type="button" onClick={() => removeSelectedFile(file, "output")} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reference Documents Section */}
              <div className="bg-gray-100 p-4 rounded-lg">
                <label className="block text-sm font-medium text-slate-700 mb-2">Reference Documents</label>
                <div className="space-y-2 overflow-y-auto max-h-[250px] border border-slate-200 rounded-lg p-2 bg-white">
                  {localAppData?.referenceFiles?.length ? (
                    localAppData.referenceFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white rounded-md border border-slate-200 hover:bg-slate-100 transition-colors">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <FileText className="w-5 h-5 text-slate-500 flex-shrink-0" />
                          <span className="text-slate-700 text-sm truncate" title={file.fileName}>{file.fileName}</span>
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <button onClick={() => handleDownloadFile(file.gridFsFileId, file.fileName)} className="text-blue-500 hover:text-blue-700 cursor-pointer">
                            <FontAwesomeIcon icon={faDownload} className="w-4 h-4" />
                          </button>
                          <button onClick={(e) => handleDeleteFile(e, file.gridFsFileId, "reference", file.fileName)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-sm">No reference documents available.</p>
                  )}
                </div>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-indigo-300 transition-colors cursor-pointer bg-slate-50 mt-4" onClick={() => referenceFileRef.current?.click()} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, "reference")}>
                  <CloudUpload className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
                  <p className="text-slate-600 mb-1 font-medium">Drag & Drop files here</p>
                  <p className="text-slate-400 text-sm mb-4">or click to browse</p>
                  <input ref={referenceFileRef} type="file" multiple onChange={(e) => handleFileSelection(Array.from(e.target.files || []), "reference")} className="hidden" />
                  <p className="text-slate-500 text-sm">(max 200 Mb file can be uploaded)</p>
                </div>
                {newReferenceFiles.length > 0 && (
                  <div className="mt-4">
                    {newReferenceFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white rounded-md border border-slate-200 hover:bg-slate-100 transition-colors">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <FileText className="w-5 h-5 text-slate-500 flex-shrink-0" />
                          <span className="text-slate-700 text-sm truncate" title={file.name}>{file.name}</span>
                        </div>
                        <button type="button" onClick={() => removeSelectedFile(file, "reference")} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderAccordionContent = () => {
    return (
      <div className="space-y-4">
        {/* Application Details Accordion */}
        <Collapsible
          open={openSections.applicationDetails}
          onOpenChange={() => toggleSection('applicationDetails')}
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-all duration-200 hover:shadow-sm">
            <div className="flex items-center space-x-3">
              <Settings className="w-5 h-5 text-indigo-600 transition-transform duration-200 hover:scale-110" />
              <h3 className="text-lg font-semibold text-slate-800">Application Details</h3>
            </div>
            <ChevronDown className={`w-5 h-5 text-slate-600 transition-transform duration-300 ${openSections.applicationDetails ? 'rotate-0' : '-rotate-90'}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 overflow-hidden transition-all duration-300 data-[state=closed]:animate-slide-up data-[state=open]:animate-slide-down">
            <div className="p-6 bg-white border border-slate-200 rounded-lg space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Application Name
                    <span style={{ marginRight: "4px" }} />
                    <FontAwesomeIcon icon={faAsterisk} style={{ color: "red", fontSize: "10px" }} />
                  </label>
                  <Controller
                    name="applicationName"
                    control={control}
                    rules={{
                      required: "Application Name is required",
                    }}
                    render={({ field }) => (
                      <input
                        {...field}
                        ref={nameRef}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 placeholder-slate-400"
                        maxLength={3000}
                        placeholder="My Application"
                      />
                    )}
                  />
                  {errors.applicationName && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-600 mt-2">
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      {errors.applicationName?.message}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Application URL
                    <span style={{ marginRight: "4px" }} />
                    <FontAwesomeIcon icon={faAsterisk} style={{ color: "red", fontSize: "10px" }} />
                  </label>
                  <div className="flex items-center gap-2">
                    <Controller
                      name="appUrl"
                      control={control}
                      rules={{
                        required: "Application URL is required",
                      }}
                      render={({ field }) => (
                        <input
                          {...field}
                          ref={urlRef}
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 placeholder-slate-400"
                          placeholder="https://example.com"
                        />
                      )}
                    />
                    {errors.appUrl && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-600 mt-2">
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        {errors.appUrl?.message}
                      </div>
                    )}
                    {appData?.appUrl && (
                      <a
                        href={appData.appUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                  <Controller
                    name="applicationStatus"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                        disabled={!isEditingMode}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="In Progress">In Progress</option>
                      </select>
                    )}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Backend API Base URL
                  </label>
                  <div className="flex items-center gap-2">
                    <Controller
                      name="backendAppUrl"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 placeholder-slate-400"
                          disabled={!isEditingMode}
                        />
                      )}
                    />
                    {appData?.backendAppUrl && (
                      <a
                        href={appData.backendAppUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                  <span style={{ marginRight: "4px" }} />
                  <FontAwesomeIcon icon={faAsterisk} style={{ color: "red", fontSize: "10px" }} />
                </label>
                <Controller
                  name="appDescription"
                  control={control}
                  rules={{
                    required: "Description is required",
                    validate: {
                      isNotEmpty: (value) => {
                        if (value === "<p><br></p>" || value.trim() === "") {
                          return "Description is required";
                        }
                        return true;
                      },
                    },
                  }}
                  render={({ field }) => (
                    <ReactQuill
                      {...field}
                      ref={descRef}
                      modules={{
                        toolbar: [
                          [{ header: [1, 2, 3, false] }],
                          ["bold", "italic", "underline", "strike"],
                          [{ color: [] }, { background: [] }],
                          [{ list: "ordered" }, { list: "bullet" }],
                          ["link", "image"],
                          ["clean"],
                        ],
                      }}
                      theme="snow"
                      readOnly={!isEditingMode}
                      className="bg-white rounded-lg"
                    />
                  )}
                />
                {errors.appDescription && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-600 mt-2">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    {errors.appDescription?.message}
                  </div>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Jenkins & Repository Configuration Accordion */}
        <Collapsible
          open={openSections.jenkinsRepo}
          onOpenChange={() => toggleSection('jenkinsRepo')}
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-all duration-200 hover:shadow-sm">
            <div className="flex items-center space-x-3">
              <Database className="w-5 h-5 text-indigo-600 transition-transform duration-200 hover:scale-110" />
              <h3 className="text-lg font-semibold text-slate-800">Jenkins & Repository Configuration</h3>
            </div>
            <ChevronDown className={`w-5 h-5 text-slate-600 transition-transform duration-300 ${openSections.jenkinsRepo ? 'rotate-0' : '-rotate-90'}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 overflow-hidden transition-all duration-300 data-[state=closed]:animate-slide-up data-[state=open]:animate-slide-down">
            <div className="p-6 bg-white border border-slate-200 rounded-lg space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-4">Jenkins</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm text-slate-600 mb-2">Backend</label>
                    <div className="flex items-center gap-2">
                      <Controller
                        name="backendPipelineUrl"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 placeholder-slate-400"
                            placeholder="https://jenkins.example.com"
                            disabled={!isEditingMode}
                          />
                        )}
                      />
                      {appData?.backendPipelineUrl && (
                        <a
                          href={appData.backendPipelineUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-2">Frontend</label>
                    <div className="flex items-center gap-2">
                      <Controller
                        name="frontendPipelineUrl"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 placeholder-slate-400"
                            placeholder="https://jenkins.example.com"
                            disabled={!isEditingMode}
                          />
                        )}
                      />
                      {appData?.frontendPipelineUrl && (
                        <a
                          href={appData.frontendPipelineUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-2">Socket</label>
                    <div className="flex items-center gap-2">
                      <Controller
                        name="socketPipelineUrl"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 placeholder-slate-400"
                            placeholder="https://jenkins.example.com"
                            disabled={!isEditingMode}
                          />
                        )}
                      />
                      {appData?.socketPipelineUrl && (
                        <a
                          href={appData.socketPipelineUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-4">Repositories</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm text-slate-600 mb-2">Backend URL</label>
                    <div className="flex items-center gap-2">
                      <Controller
                        name="backendRepoUrl"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 placeholder-slate-400"
                            placeholder="https://github.com/backend"
                            disabled={!isEditingMode}
                          />
                        )}
                      />
                      {appData?.backendRepoUrl && (
                        <a
                          href={appData.backendRepoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-2">Frontend URL</label>
                    <div className="flex items-center gap-2">
                      <Controller
                        name="frontendRepoUrl"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 placeholder-slate-400"
                            placeholder="https://github.com/frontend"
                            disabled={!isEditingMode}
                          />
                        )}
                      />
                      {appData?.frontendRepoUrl && (
                        <a
                          href={appData.frontendRepoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-2">Socket URL</label>
                    <div className="flex items-center gap-2">
                      <Controller
                        name="socketRepoUrl"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 placeholder-slate-400"
                            placeholder="https://github.com/socket"
                            disabled={!isEditingMode}
                          />
                        )}
                      />
                      {appData?.socketRepoUrl && (
                        <a
                          href={appData.socketRepoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Log File Location URL
                </label>
                <div className="flex items-center gap-2">
                  <Controller
                    name="logFileUrl"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 placeholder-slate-400"
                        disabled={!isEditingMode}
                      />
                    )}
                  />
                  {appData?.logFileUrl && (
                    <a
                      href={appData.logFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* File Uploads Accordion */}
        <Collapsible
          open={openSections.fileUploads}
          onOpenChange={() => toggleSection('fileUploads')}
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-all duration-200 hover:shadow-sm">
            <div className="flex items-center space-x-3">
              <Upload className="w-5 h-5 text-indigo-600 transition-transform duration-200 hover:scale-110" />
              <h3 className="text-lg font-semibold text-slate-800">File Uploads</h3>
            </div>
            <ChevronDown className={`w-5 h-5 text-slate-600 transition-transform duration-300 ${openSections.fileUploads ? 'rotate-0' : '-rotate-90'}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 overflow-hidden transition-all duration-300 data-[state=closed]:animate-slide-up data-[state=open]:animate-slide-down">
            <div className="p-6 bg-white border border-slate-200 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Input Files Section */}
                <div className="bg-gray-100 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Input Files</label>
                  <div className="space-y-2 overflow-y-auto max-h-[250px] border border-slate-200 rounded-lg p-2 bg-white">
                    {localAppData?.inputFiles?.length ? (
                      localAppData.inputFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white rounded-md border border-slate-200 hover:bg-slate-100 transition-colors">
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            <FileText className="w-5 h-5 text-slate-500 flex-shrink-0" />
                            <span className="text-slate-700 text-sm truncate" title={file.fileName}>{file.fileName}</span>
                          </div>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <button onClick={() => handleDownloadFile(file.gridFsFileId, file.fileName)} className="text-blue-500 hover:text-blue-700 cursor-pointer">
                              <FontAwesomeIcon icon={faDownload} className="w-4 h-4" />
                            </button>
                            {isEditingMode && (
                              <button onClick={(e) => handleDeleteFile(e, file.gridFsFileId, "input", file.fileName)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors">
                                <Trash2 className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500 text-sm">No input files available.</p>
                    )}
                  </div>
                  {isEditingMode && (
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-indigo-300 transition-colors cursor-pointer bg-slate-50 mt-4" onClick={() => inputFileRef.current?.click()} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, "input")}>
                      <CloudUpload className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
                      <p className="text-slate-600 mb-1 font-medium">Drag & Drop files here</p>
                      <p className="text-slate-400 text-sm mb-4">or click to browse</p>
                      <input ref={inputFileRef} type="file" multiple onChange={(e) => handleFileSelection(Array.from(e.target.files || []), "input")} className="hidden" />
                      <p className="text-slate-500 text-sm">(max 200 Mb file can be uploaded)</p>
                    </div>
                  )}
                  {isEditingMode && newInputFiles.length > 0 && (
                    <div className="mt-4">
                      {newInputFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white rounded-md border border-slate-200 hover:bg-slate-100 transition-colors">
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            <FileText className="w-5 h-5 text-slate-500 flex-shrink-0" />
                            <span className="text-slate-700 text-sm truncate" title={file.name}>{file.name}</span>
                          </div>
                          <button type="button" onClick={() => removeSelectedFile(file, "input")} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors">
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Output Files Section */}
                <div className="bg-gray-100 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Output Files</label>
                  <div className="space-y-2 overflow-y-auto max-h-[250px] border border-slate-200 rounded-lg p-2 bg-white">
                    {localAppData?.outputFiles?.length ? (
                      localAppData.outputFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white rounded-md border border-slate-200 hover:bg-slate-100 transition-colors">
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            <FileText className="w-5 h-5 text-slate-500 flex-shrink-0" />
                            <span className="text-slate-700 text-sm truncate" title={file.fileName}>{file.fileName}</span>
                          </div>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <button onClick={() => handleDownloadFile(file.gridFsFileId, file.fileName)} className="text-blue-500 hover:text-blue-700 cursor-pointer">
                              <FontAwesomeIcon icon={faDownload} className="w-4 h-4" />
                            </button>
                            {isEditingMode && (
                              <button onClick={(e) => handleDeleteFile(e, file.gridFsFileId, "output", file.fileName)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors">
                                <Trash2 className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500 text-sm">No output files available.</p>
                    )}
                  </div>
                  {isEditingMode && (
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-indigo-300 transition-colors cursor-pointer bg-slate-50 mt-4" onClick={() => outputFileRef.current?.click()} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, "output")}>
                      <CloudUpload className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
                      <p className="text-slate-600 mb-1 font-medium">Drag & Drop files here</p>
                      <p className="text-slate-400 text-sm mb-4">or click to browse</p>
                      <input ref={outputFileRef} type="file" multiple onChange={(e) => handleFileSelection(Array.from(e.target.files || []), "output")} className="hidden" />
                      <p className="text-slate-500 text-sm">(max 200 Mb file can be uploaded)</p>
                    </div>
                  )}
                  {isEditingMode && newOutputFiles.length > 0 && (
                    <div className="mt-4">
                      {newOutputFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white rounded-md border border-slate-200 hover:bg-slate-100 transition-colors">
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            <FileText className="w-5 h-5 text-slate-500 flex-shrink-0" />
                            <span className="text-slate-700 text-sm truncate" title={file.name}>{file.name}</span>
                          </div>
                          <button type="button" onClick={() => removeSelectedFile(file, "output")} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors">
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reference Documents Section */}
                <div className="bg-gray-100 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Reference Documents</label>
                  <div className="space-y-2 overflow-y-auto max-h-[250px] border border-slate-200 rounded-lg p-2 bg-white">
                    {localAppData?.referenceFiles?.length ? (
                      localAppData.referenceFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white rounded-md border border-slate-200 hover:bg-slate-100 transition-colors">
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            <FileText className="w-5 h-5 text-slate-500 flex-shrink-0" />
                            <span className="text-slate-700 text-sm truncate" title={file.fileName}>{file.fileName}</span>
                          </div>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <button onClick={() => handleDownloadFile(file.gridFsFileId, file.fileName)} className="text-blue-500 hover:text-blue-700 cursor-pointer">
                              <FontAwesomeIcon icon={faDownload} className="w-4 h-4" />
                            </button>
                            {isEditingMode && (
                              <button onClick={(e) => handleDeleteFile(e, file.gridFsFileId, "reference", file.fileName)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors">
                                <Trash2 className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500 text-sm">No reference documents available.</p>
                    )}
                  </div>
                  {isEditingMode && (
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-indigo-300 transition-colors cursor-pointer bg-slate-50 mt-4" onClick={() => referenceFileRef.current?.click()} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, "reference")}>
                      <CloudUpload className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
                      <p className="text-slate-600 mb-1 font-medium">Drag & Drop files here</p>
                      <p className="text-slate-400 text-sm mb-4">or click to browse</p>
                      <input ref={referenceFileRef} type="file" multiple onChange={(e) => handleFileSelection(Array.from(e.target.files || []), "reference")} className="hidden" />
                      <p className="text-slate-500 text-sm">(max 200 Mb file can be uploaded)</p>
                    </div>
                  )}
                  {isEditingMode && newReferenceFiles.length > 0 && (
                    <div className="mt-4">
                      {newReferenceFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white rounded-md border border-slate-200 hover:bg-slate-100 transition-colors">
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            <FileText className="w-5 h-5 text-slate-500 flex-shrink-0" />
                            <span className="text-slate-700 text-sm truncate" title={file.name}>{file.name}</span>
                          </div>
                          <button type="button" onClick={() => removeSelectedFile(file, "reference")} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors">
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  };

  if (isLoading) return <div className="text-center py-8">Loading...</div>;
  if (error)
    return <div className="text-center py-8 text-red-600">Error loading application details.</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-50 min-h-screen px-2 pt-2 pb-6">
        <div className="max-w-7xl mx-auto">
          {/* Progress Steps - Only show in edit mode */}
          {isEditingMode && (
            <div className="mb-1">
              <div className="px-2 py-3">
                <div className="flex items-center justify-between relative">
                  {steps.map((step, index) => (
                    <div key={step.number} className="flex items-center">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors ${currentStep >= step.number
                            ? currentStep === step.number
                              ? "bg-indigo-600 border-indigo-600 text-white"
                              : "bg-green-500 border-green-500 text-white"
                            : "border-slate-300 text-slate-400"
                            }`}
                        >
                          {currentStep > step.number ? (
                            <Icon icon="mdi:check" className="w-6 h-6" />
                          ) : (
                            <step.icon className="w-6 h-6" />
                          )}
                        </div>
                        <div className="mt-3 text-center">
                          <p
                            className={`text-sm font-medium ${currentStep >= step.number
                              ? "text-indigo-600"
                              : "text-slate-400"
                              }`}
                          >
                            {step.title}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {step.description}
                          </p>
                        </div>
                      </div>
                      {index < steps.length - 1 && (
                        <div
                          className={`w-32 md:w-48 lg:w-64 h-1 mx-6 transition-colors ${currentStep > step.number
                            ? "bg-green-500"
                            : "bg-slate-300"
                            }`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200">
            <div className="px-8 py-4 bg-gray-100 rounded-t-xl border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" className="w-6 h-6 text-indigo-600 mr-3">
                    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}>
                      <path d="M4 21.4V2.6a.6.6 0 0 1 .6-.6h11.652a.6.6 0 0 1 .424.176l3.148 3.148A.6.6 0 0 1 20 5.75V21.4a.6.6 0 0 1-.6.6H4.6a.6.6 0 0 1-.6-.6M8 10h8m-8 8h8m-8-4h4"></path>
                      <path d="M16 2v3.4a.6.6 0 0 0 .6.6H20"></path>
                    </g>
                  </svg>
                  <h2 className="text-xl font-semibold text-slate-800">
                    Application Details
                  </h2>
                </div>

                {/* Back Button - Only show when not in edit mode */}
                {!isEditingMode && (
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="px-4 py-2 text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md"
                    title="Go back to applications list"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                    <span className="hidden sm:inline">Back</span>
                  </button>
                )}
              </div>

              {/* Description with Action Icons */}
              <div className="flex items-center justify-between mt-2">
                <p className="text-slate-600 text-sm">
                  View and manage the details of your application
                </p>

                {/* Action Icons - Only show when not in edit mode and user has admin role */}
                {!isEditingMode && keyCloakInitialized.hasResourceRole("admin", "admin-cli") && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleEditClick}
                      className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                      title="Edit application details"
                    >
                      <Icon icon="mdi:pencil" className="w-5 h-5 text-indigo-600" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirmation(true)}
                      className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                      title="Delete application"
                    >
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <form id="application-form" onSubmit={handleSubmit(handleSaveChanges)} className="px-8 py-8">
              <fieldset disabled={updateMutation.isPending}>
                {isEditingMode ? renderStepContent() : renderAccordionContent()}

                {validationError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-600 mt-6">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    {validationError}
                  </div>
                )}

                {/* Edit Mode Navigation - Step-based */}
                {isEditingMode && (
                  <div className="flex items-center justify-between pt-8 mt-8 border-t border-slate-100">
                    <div className="flex space-x-2">
                      {[1, 2, 3].map((step) => (
                        <div
                          key={step}
                          className={`w-2 h-2 rounded-full transition-colors ${step === currentStep
                            ? "bg-indigo-600"
                            : step < currentStep
                              ? "bg-green-500"
                              : "bg-slate-300"
                            }`}
                        />
                      ))}
                    </div>

                    <div className="flex items-center space-x-4">
                      {currentStep > 1 && (
                        <button
                          type="button"
                          onClick={handlePrevious}
                          className="px-6 py-2.5 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                        >
                          Previous
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-6 py-2.5 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                      >
                        Cancel
                      </button>

                      {currentStep < 3 ? (
                        <button
                          type="button"
                          onClick={(e) => handleNext(e)}
                          className="px-6 py-2.5 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center"
                        >
                          Next
                          <ChevronRight className="w-5 h-5 ml-1" />
                        </button>
                      ) : (
                        <button
                          type="submit"
                          className="px-6 py-2.5 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center"
                          disabled={updateMutation.isPending}
                        >
                          {updateMutation.isPending ? (
                            <>
                              <Icon
                                icon="line-md:uploading"
                                className="w-5 h-5 mr-2 animate-spin"
                              />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Icon icon="mdi:content-save" className="w-5 h-5 mr-2" />
                              Save Changes
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}


              </fieldset>
            </form>
          </div>
        </div>
      </div>

      {/* Delete Application Confirmation */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl transform transition-all">
            <div className="flex items-center mb-6">
              <div className="bg-red-100 p-3 rounded-full mr-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800">Delete Application</h3>
            </div>
            <p className="mb-2 text-slate-600 font-medium">Are you sure you want to delete this application?</p>
            <p className="mb-8 text-slate-500 text-sm">This action cannot be undone. All associated data will be permanently removed.</p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteConfirmation(false)}
                className="px-6 py-2.5 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors font-medium flex items-center"
              >
                <X className="w-5 h-5 mr-2" />
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-6 py-2.5 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors font-medium flex items-center"
              >
                <Trash2 className="w-5 h-5 mr-2" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete File Confirmation */}
      {showFileDeleteConfirmation.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4">Confirm Delete</h3>
            <p className="mb-6 text-gray-600">Are you sure you want to delete this file?</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() =>
                  setShowFileDeleteConfirmation({
                    show: false,
                    gridFsFileId: null,
                    fileType: null,
                    fileName: null,
                  })
                }
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteFile}
                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Edit Confirmation */}
      {showCancelConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 mx-4 max-w-md w-full shadow-xl">
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-500 mr-3" />
              <h3 className="text-lg font-semibold text-slate-800">
                Discard Changes?
              </h3>
            </div>

            <div className="mb-6">
              <p className="text-slate-600 mb-2">
                Are you sure you want to cancel editing?
              </p>
              <p className="text-slate-600">
                All unsaved changes will be lost.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={handleCancelCancel}
                className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors font-medium"
              >
                Continue Editing
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationDetails;
