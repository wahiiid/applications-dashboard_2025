interface FilesType {
  id: string;
  applicationId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  description: string;
  gridFsFileId: string;
  uploadDate: string;
}
export type GetApplicationsResponse = {
  id: string;
  applicationName: string;
  appUrl: string;
  appDescription: string;
  applicationStatus: string;
  frontendRepoUrl: string;
  frontendPipelineUrl: string;
  backendRepoUrl: string;
  backendPipelineUrl: string;
  socketRepoUrl: string;
  socketPipelineUrl: string;
  logFileUrl: string;
  backendAppUrl: string;
  referenceFiles: FilesType[];
  inputFiles: FilesType[];
  outputFiles: FilesType[];
};
