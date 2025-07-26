import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosResponse } from "axios";
import { GetApplicationsResponse } from "./query-types";
import { useAuthenticationState } from "./zus-store";
import { toast } from "react-toastify";

const BASE_URL = "https://application-service-dev.nablainfotech.com";
// 18.211.134.5:30639/applications - deployed URL for the backend

// Fetch Applications (GET)

// Delete File (DELETE)
const deleteFile = async ({
  applicationId,
  gridFsFileId,
  token,
}: {
  applicationId: string;
  gridFsFileId: string;
  token: string;
}) => {
  const res = await axios.delete(`${BASE_URL}/application/files`, {
    params: { applicationId, gridFsFileId },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
};

const deleteApplication = async (id: string, token: string) => {
  const res = await axios.delete(`${BASE_URL}/application/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
};

// Fetch Application by ID (GET)
const fetchApplicationById = async (id: string, token: string) => {
  const res: AxiosResponse<GetApplicationsResponse> = await axios.get(
    `${BASE_URL}/application/${id}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return res.data;
};

const fetchApplications = async (token: string) => {
  const res: AxiosResponse<GetApplicationsResponse> = await axios.get(`${BASE_URL}/applications`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
};

// Hook to Fetch Applications
export const useFetchApplications = () => {
  const token = useAuthenticationState((state) => state.token);
  return useQuery({
    queryKey: ["applications"],
    queryFn: () => fetchApplications(token!),
    enabled: !!token,
    retry: false,
  });
};

// Hook to Fetch Application by ID
export const useFetchApplicationDetails = (applicationId: string) => {
  const token = useAuthenticationState((state) => state.token);
  const shouldFetch = applicationId && token ? true : false;

  return useQuery({
    queryKey: ["application"],
    queryFn: () => fetchApplicationById(applicationId, token!),
    enabled: !!shouldFetch, // Only run query when applicationId is available
    retry: false,
  });
};

const createApplication = async (applicationData: FormData, token: string) => {
  const res = await axios.post(`${BASE_URL}/application`, applicationData, {
    headers: {
      "Content-Type": "multipart/form-data",
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
};

export const useCreateApplication = () => {
  const token = useAuthenticationState((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["create-application"],
    mutationFn: async (formData: {
      application: any; // Application data
      inputFiles: File[];
      outputFiles: File[];
      referenceFiles: File[];
    }) => {
      const formDataToSend = new FormData();

      // Append application data as a JSON string
      formDataToSend.append("application", JSON.stringify(formData.application));

      // Append files
      formData.inputFiles.forEach((file) => formDataToSend.append("inputFiles", file));
      formData.outputFiles.forEach((file) => formDataToSend.append("outputFiles", file));
      formData.referenceFiles.forEach((file) => formDataToSend.append("referenceFiles", file));

      return createApplication(formDataToSend, token!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] }); // Refresh applications list
    },
  });
};

export const useDeleteFile = () => {
  const token = useAuthenticationState((state) => state.token);
  return useMutation({
    mutationKey: ["delete-file"],
    mutationFn: ({
      applicationId,
      gridFsFileId,
    }: {
      applicationId: string;
      gridFsFileId: string;
    }) => deleteFile({ applicationId, gridFsFileId, token: token! }),
    // Remove the onSuccess callback to prevent refetching
  });
};

export const useDeleteApplication = () => {
  const queryClient = useQueryClient();
  const token = useAuthenticationState((state) => state.token);
  return useMutation({
    mutationKey: ["delete-application"],
    mutationFn: (id: string) => deleteApplication(id, token!), // Directly pass the function
    onSuccess: () => {
      console.log("Application deleted successfully! Invalidating queries...");
      queryClient.invalidateQueries({ queryKey: ["applications"] }); // Refresh applications list
    },
    onError: (error: any) => {
      console.error(
        "Mutation error while deleting application:",
        error?.response?.data || error.message
      );
    },
  });
};

const downloadFile = async (gridFsFileId: string, token: string) => {
  try {
    const { data } = await axios.get(`${BASE_URL}/application/download/${gridFsFileId}`, {
      responseType: "blob",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return data;
  } catch (error) {
    console.error("Failed to download file:", error);
    throw new Error("Failed to download file. Please try again.");
  }
};

export const useDownloadFile = () => {
  const token = useAuthenticationState((state) => state.token);
  return useMutation({
    mutationKey: ["download-file"],
    mutationFn: (gridFsFileId: string) => downloadFile(gridFsFileId, token!),
  });
};

const editApplication = async (id: string, applicationData: FormData, token: string) => {
  try {
    const { data } = await axios.put(`${BASE_URL}/application/${id}`, applicationData, {
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${token}`,
      },
    });
    return data;
  } catch (error) {
    if (axios.isCancel(error)) {
      console.log("Request canceled:", error.message);
      throw new Error("Request canceled");
    } else {
      console.error("Error updating application:", error);
      throw error;
    }
  }
};

export const useEditApplication = () => {
  const token = useAuthenticationState((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["edit-application"],
    mutationFn: async (payload: {
      id: string;
      application: any; // Application data
      inputFiles: File[];
      outputFiles: File[];
      referenceFiles: File[];
    }) => {
      const formDataToSend = new FormData();

      // Append application data as a JSON string
      formDataToSend.append("application", JSON.stringify(payload.application));

      // Append files if they exist
      payload.inputFiles.forEach((file) => formDataToSend.append("inputFiles", file));
      payload.outputFiles.forEach((file) => formDataToSend.append("outputFiles", file));
      payload.referenceFiles.forEach((file) => formDataToSend.append("referenceFiles", file));

      return editApplication(payload.id, formDataToSend, token!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] }); // Refresh applications list
    },
  });
};

//DOCUMENTS SECTION:

export interface DocumentResponse {
  id: string;
  title: string;
  description: string;
  uploadDate: number;
  files: DocumentFile[] | null;
  fileIds: string[] | null;
  fileName?: string | null;
  documentCategories: string[];
}

export interface DocumentsApiResponse {
  statusCode: number;
  statusMessage: string;
  results: DocumentResponse[];
}

interface UpdateDocumentParams {
  id: string;
  title: string;
  description: string;
  files?: File[];
  keepExisting?: boolean; // Flag to keep existing files
  deletedFieldId: string[];
  existingFileNames?: string[];
  documentCategories: string[];
}

export interface DocumentFile {
  fileName: string;
  contentType: string;
  size: number;
  fileId: string;
}

// GET Document by Id
const fetchDocumentById = async (id: string, token: string): Promise<DocumentResponse> => {
  try {
    const res: AxiosResponse<{
      statusCode: number;
      statusMessage: string;
      results: DocumentResponse[];
      errorMessages: string | null;
    }> = await axios.get(`${BASE_URL}/document/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.data.results || res.data.results.length === 0) {
      throw new Error("Document not found in response");
    }

    return res.data.results[0];
  } catch (error) {
    throw error;
  }
};

export const useFetchDocument = (documentId: string) => {
  const token = useAuthenticationState((state) => state.token);
  const shouldFetch = documentId && token ? true : false;

  return useQuery<DocumentResponse>({
    queryKey: ["document", documentId],
    queryFn: () => fetchDocumentById(documentId, token!),
    enabled: !!shouldFetch,
    retry: false,
  });
};

// Fetch all documents
const fetchAllDocuments = async (token: string) => {
  const res: AxiosResponse<DocumentsApiResponse> = await axios.get(`${BASE_URL}/document`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  // console.log("token: ", token);
  return res.data;
};

// Hook to fetch all documents
export const useFetchAllDocuments = () => {
  const token = useAuthenticationState((state) => state.token);
  // console.log("Token in useFetchAllDocuments:", token); // Debugging line
  return useQuery({
    queryKey: ["documents"],
    queryFn: () => fetchAllDocuments(token!),
    enabled: !!token,
    retry: false,
  });
};

// Upload Document (POST)
const uploadDocument = async (files: File[], title: string, description: string, documentCategories: string[], token: string) => {
  const formData = new FormData();

  // Append each file to the formData
  files.forEach((file) => {
    formData.append("files", file);
  });

  // Append document categories
  documentCategories.forEach((category) => {
    formData.append("documentCategories", category);
  });

  // Calculate total size
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > 200 * 1024 * 1024) {
    // 200MB limit
    throw new Error("Total files size exceeds 200MB limit");
  }

  try {
    const res: AxiosResponse = await axios.post(
      `${BASE_URL}/document?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        maxBodyLength: 200 * 1024 * 1024, // 200MB
        maxContentLength: 200 * 1024 * 1024, // 200MB
      }
    );
    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 413) {
      throw new Error("File size too large. Please upload smaller files.");
    }
    throw error;
  }
};

// Hook to Upload Document
export const useUploadDocument = () => {
  const token = useAuthenticationState((state) => state.token);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      files,
      title,
      description,
      documentCategories,
    }: {
      files: File[];
      title: string;
      description: string;
      documentCategories: string[];
    }) => uploadDocument(files, title, description, documentCategories, token!),
    onSuccess: () => {
      // Invalidate the documents query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
};

// Delete Document or Files within Document
const deleteDocument = async (id: string, token: string, fileIds?: string[]) => {
  const url = new URL(`${BASE_URL}/document/${id}`);

  if (fileIds && fileIds.length > 0) {
    fileIds.forEach((fileId) => url.searchParams.append("fileIds", fileId));
  }

  const res = await axios.delete(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
};

// Hook to Delete Document or Files
export const useDeleteDocument = () => {
  const token = useAuthenticationState((state) => state.token);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, fileIds }: { id: string; fileIds?: string[] }) =>
      deleteDocument(id, token!, fileIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
};

const updateDocument = async (
  id: string,
  title: string,
  description: string,
  files: File[] | undefined,
  deletedFieldId: string[],
  documentCategories: string[],
  token: string
) => {
  const formData = new FormData();

  // Append title and description first
  formData.append("title", title);
  formData.append("description", description);
  
  // Append document categories
  documentCategories.forEach((category) => {
    formData.append("documentCategories", category);
  });

  if (deletedFieldId && deletedFieldId.length > 0) {
    deletedFieldId.forEach((fieldId) => {
      formData.append("deletedFileIds", fieldId);
    });
  }

  if (files !== undefined) {
    files.forEach((file) => {
      formData.append("files", file);
    });
  }

  const res = await axios.put(`${BASE_URL}/document/${id}`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
};

// Hook to Update Document
export const useUpdateDocument = () => {
  const token = useAuthenticationState((state) => state.token);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      title,
      description,
      files,
      deletedFieldId,
      documentCategories,
    }: UpdateDocumentParams) =>
      updateDocument(id, title, description, files, deletedFieldId, documentCategories, token!),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["document", id] });
    },
    onError: (error) => {
      console.error("Update document failed:", error);
    },
  });
};

//download file
const downloadDocument = async (fileId: string, token: string): Promise<Blob> => {
  try {
    const response = await axios.get(`${BASE_URL}/download/${fileId}`, {
      responseType: "blob",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error downloading document:", error);
    throw new Error("Failed to download document");
  }
};

export const useDocDownloadDocument = () => {
  const token = useAuthenticationState((state) => state.token);
  return useMutation({
    mutationFn: (file: { fileId: string; fileName: string }) =>
      downloadDocument(file.fileId, token!),
    onSuccess: (blob, variables) => {
      // Create a download link and trigger it
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", variables.fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
    onError: (error: Error) => {
      toast.error(error.message);
      console.error("Download error:", error);
    },
  });
};
