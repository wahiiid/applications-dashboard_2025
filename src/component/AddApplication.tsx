import React, { useState, useRef } from "react";
import { useCreateApplication } from "../hooks/query-hooks";
import {
  CloudUpload,
  FileText,
  Trash2,
  ChevronRight,
  AlertTriangle,
  ArrowLeft,
  Settings,
  Database,
  Upload,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css"; // Import Quill styles
import { Icon } from "@iconify/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAsterisk } from "@fortawesome/free-solid-svg-icons";

// import lineMdUploading from "@iconify-icons/line-md/uploading";

const Dashboard = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    applicationName: "",
    appUrl: "",
    appDescription: "", // This will now store HTML content
    applicationStatus: "Active",
    backendRepoUrl: "",
    frontendRepoUrl: "",
    socketRepoUrl: "",
    logFileUrl: "",
    backendPipelineUrl: "",
    frontendPipelineUrl: "",
    socketPipelineUrl: "",
    backendAppUrl: "",
  });

  const [inputFiles, setInputFiles] = useState<File[]>([]);
  const [outputFiles, setOutputFiles] = useState<File[]>([]);
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const submitMutation = useCreateApplication();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  const inputFileRef = useRef<HTMLInputElement>(null);
  const outputFileRef = useRef<HTMLInputElement>(null);
  const referenceFileRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState({
    applicationName: "",
    appUrl: "",
    appDescription: "",
  });

  // Refs for focusing on error
  const nameRef = useRef<HTMLInputElement | null>(null);
  const urlRef = useRef<HTMLInputElement | null>(null);
  const descRef = useRef<ReactQuill | null>(null);

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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDescriptionChange = (value: string) => {
    setFormData({ ...formData, appDescription: value });
  };

  const handleFileSelection = (
    selectedFiles: File[],
    fileType: "input" | "output" | "reference",
  ) => {
    switch (fileType) {
      case "input":
        setInputFiles((prevFiles) => [...prevFiles, ...selectedFiles]);
        break;
      case "output":
        setOutputFiles((prevFiles) => [...prevFiles, ...selectedFiles]);
        break;
      case "reference":
        setReferenceFiles((prevFiles) => [...prevFiles, ...selectedFiles]);
        break;
    }
  };

  const removeFile = (
    index: number,
    fileType: "input" | "output" | "reference",
  ) => {
    switch (fileType) {
      case "input":
        setInputFiles(inputFiles.filter((_, i) => i !== index));
        break;
      case "output":
        setOutputFiles(outputFiles.filter((_, i) => i !== index));
        break;
      case "reference":
        setReferenceFiles(referenceFiles.filter((_, i) => i !== index));
        break;
    }
  };

  const validateStep = (step: number) => {
    const newErrors = {
      applicationName: "",
      appUrl: "",
      appDescription: "",
    };

    let hasError = false;

    if (step === 1) {
      // Validate Application Name
      if (!formData.applicationName.trim()) {
        newErrors.applicationName = "Application Name is required.";
        hasError = true;
      }
      // Validate Application URL
      if (!formData.appUrl.trim()) {
        newErrors.appUrl = "Application URL is required.";
        hasError = true;
      }
      // Validate Application Description
      if (
        !formData.appDescription ||
        formData.appDescription === "<p><br></p>" ||
        formData.appDescription.trim() === ""
      ) {
        newErrors.appDescription = "Description is required.";
        hasError = true;
      }
    }

    setErrors(newErrors);

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
    setErrors({ applicationName: "", appUrl: "", appDescription: "" }); // Clear errors when going back
  };

  const handleBackClick = () => {
    setShowExitModal(true);
  };

  const handleConfirmExit = () => {
    setShowExitModal(false);
    navigate(-1);
  };

  const handleCancelExit = () => {
    setShowExitModal(false);
  };

  const handleSubmit = async () => {
    // Final validation before submission
    if (!validateStep(1)) {
      setCurrentStep(1);
      return;
    }

    setIsSubmitting(true);

    try {
      await submitMutation.mutateAsync({
        application: formData,
        inputFiles,
        outputFiles,
        referenceFiles,
      });

      alert("✅ Application submitted successfully!");
      setFormData({
        applicationName: "",
        appUrl: "",
        appDescription: "",
        applicationStatus: "Active",
        backendRepoUrl: "",
        frontendRepoUrl: "",
        socketRepoUrl: "",
        logFileUrl: "",
        backendPipelineUrl: "",
        frontendPipelineUrl: "",
        socketPipelineUrl: "",
        backendAppUrl: "",
      });

      setInputFiles([]);
      setOutputFiles([]);
      setReferenceFiles([]);
      setErrorMessage(null);
      navigate("/applications");
    } catch (error) {
      console.error("Submission failed:", error);
      setErrorMessage("🚨 Submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const FileUploadSection = ({
    files,
    onFileSelect,
    fileRef,
    title,
    fileType,
  }: {
    files: File[];
    onFileSelect: (files: File[]) => void;
    fileRef: React.RefObject<HTMLInputElement>;
    title: string;
    fileType: "input" | "output" | "reference";
  }) => (
    <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-indigo-300 transition-colors cursor-pointer bg-slate-50 ">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onFileSelect(Array.from(e.dataTransfer.files));
        }}
      >
        <CloudUpload className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-slate-700 mb-2">{title}</h3>
        <p className="text-slate-600 mb-1">Drag & Drop files here</p>
        <p className="text-slate-400 text-sm mb-4">or click to browse</p>
        <input
          ref={fileRef}
          type="file"
          multiple
          onChange={(e) => onFileSelect(Array.from(e.target.files || []))}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="px-6 py-2.5 text-indigo-600 bg-white border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors font-medium"
        >
          Select Files
        </button>
        <p className="text-slate-500 text-xs mt-3">
          (max 200 Mb file can be uploaded)
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2 overflow-y-auto max-h-[210px] border border-slate-200 rounded-lg p-2 bg-gray-200 mt-4">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-white rounded-md border border-slate-200 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <FileText className="w-5 h-5 text-slate-500 flex-shrink-0" />
                <span className="text-slate-700 text-sm truncate" title={file.name}>
                  {file.name}
                </span>
              </div>
              <button
                onClick={() => removeFile(index, fileType)}
                className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors flex-shrink-0"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

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
                  <FontAwesomeIcon
                    icon={faAsterisk}
                    style={{ color: "red", fontSize: "10px" }}
                  />
                </label>
                <input
                  type="text"
                  name="applicationName"
                  ref={nameRef}
                  value={formData.applicationName}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 placeholder-slate-400"
                  placeholder="My Application"
                />
                {errors.applicationName && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-600 mt-2">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    <span className="text-sm">{errors.applicationName}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Application URL
                  <span style={{ marginRight: "4px" }} />
                  <FontAwesomeIcon
                    icon={faAsterisk}
                    style={{ color: "red", fontSize: "10px" }}
                  />
                </label>
                <input
                  type="url"
                  name="appUrl"
                  ref={urlRef}
                  value={formData.appUrl}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 placeholder-slate-400"
                  placeholder="https://example.com"
                />
                {errors.appUrl && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-600 mt-2">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    <span className="text-sm">{errors.appUrl}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Status
                </label>
                <select
                  name="applicationStatus"
                  value={formData.applicationStatus}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="In Progress">In Progress</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Backend API Base URL
                </label>
                <input
                  type="url"
                  name="backendAppUrl"
                  value={formData.backendAppUrl}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 placeholder-slate-400"
                  placeholder="https://backendurl.example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description
                <span style={{ marginRight: "4px" }} />
                <FontAwesomeIcon
                  icon={faAsterisk}
                  style={{ color: "red", fontSize: "10px" }}
                />
              </label>
              <ReactQuill
                value={formData.appDescription}
                ref={descRef}
                onChange={handleDescriptionChange}
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
              {errors.appDescription && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-600 mt-2">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  <span className="text-sm">{errors.appDescription}</span>
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
                <input
                  type="url"
                  name="backendPipelineUrl"
                  value={formData.backendPipelineUrl}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 placeholder-slate-400"
                  placeholder="https://jenkins.example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Frontend
                </label>
                <input
                  type="url"
                  name="frontendPipelineUrl"
                  value={formData.frontendPipelineUrl}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 placeholder-slate-400"
                  placeholder="https://jenkins.example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Socket
                </label>
                <input
                  type="url"
                  name="socketPipelineUrl"
                  value={formData.socketPipelineUrl}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 placeholder-slate-400"
                  placeholder="https://jenkins.example.com"
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
                <input
                  type="url"
                  name="backendRepoUrl"
                  value={formData.backendRepoUrl}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 placeholder-slate-400"
                  placeholder="https://github.com/backend"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Frontend URL
                </label>
                <input
                  type="url"
                  name="frontendRepoUrl"
                  value={formData.frontendRepoUrl}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 placeholder-slate-400"
                  placeholder="https://github.com/frontend"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Socket URL
                </label>
                <input
                  type="url"
                  name="socketRepoUrl"
                  value={formData.socketRepoUrl}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 placeholder-slate-400"
                  placeholder="https://github.com/socket"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Log File Location URL
              </label>
              <input
                type="url"
                name="logFileUrl"
                value={formData.logFileUrl}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 placeholder-slate-400"
                placeholder="https://logs.example.com/application-logs"
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
              <FileUploadSection
                files={inputFiles}
                onFileSelect={(files) => handleFileSelection(files, "input")}
                fileRef={inputFileRef}
                title="Input Files"
                fileType="input"
              />

              <FileUploadSection
                files={outputFiles}
                onFileSelect={(files) => handleFileSelection(files, "output")}
                fileRef={outputFileRef}
                title="Output Files"
                fileType="output"
              />

              <FileUploadSection
                files={referenceFiles}
                onFileSelect={(files) => handleFileSelection(files, "reference")}
                fileRef={referenceFileRef}
                title="Reference Documents"
                fileType="reference"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const ExitConfirmationModal = () => {
    if (!showExitModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 mx-4 max-w-md w-full shadow-xl">
          <div className="flex items-center mb-4">
            <AlertTriangle className="w-6 h-6 text-amber-500 mr-3" />
            <h3 className="text-lg font-semibold text-slate-800">
              Confirm Exit
            </h3>
          </div>

          <div className="mb-6">
            <p className="text-slate-600 mb-2">
              Are you sure you want to leave this page?
            </p>
            {currentStep >= 2 && (
              <p className="text-slate-600">
                The changes you made will be lost.
              </p>
            )}
          </div>

          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={handleCancelExit}
              className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmExit}
              className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Leave Page
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-50 min-h-screen px-2 pt-2 pb-6">
        <div className="max-w-7xl mx-auto">
          {/* Progress Steps */}
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

          {/* Main Content */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200">
            <div className="px-8 py-4 bg-gray-100 rounded-t-xl border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Icon icon="mdi:plus-circle" className="w-6 h-6 text-indigo-600 mr-3" />
                  <h2 className="text-xl font-semibold text-slate-800">
                    Add Application
                  </h2>
                </div>
                <button
                  onClick={handleBackClick}
                  className="flex items-center text-slate-600 hover:text-slate-800 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </button>
              </div>
              <p className="text-slate-600 text-sm">
                Fill in the required information to register a new application
              </p>
            </div>

            <div className="px-8 py-8">
              {renderStepContent()}

              {errorMessage && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-600 mt-6">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  {errorMessage}
                </div>
              )}

              {/* Navigation Buttons */}
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
                      type="button"
                      onClick={handleSubmit}
                      className="px-6 py-2.5 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Icon
                            icon="line-md:uploading"
                            className="w-5 h-5 mr-2 animate-spin"
                          />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Icon icon="mdi:plus" className="w-5 h-5 mr-2" />
                          Submit Application
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ExitConfirmationModal />
    </div>
  );
};

export default Dashboard;

