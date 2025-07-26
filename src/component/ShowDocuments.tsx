import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload, faPen, faTrash, faExclamationTriangle, faExclamationCircle, faInfoCircle, faFilter } from "@fortawesome/free-solid-svg-icons";
import Navigation from "./Navigation";
import { useAuthenticationState } from "@/hooks/zus-store";
import {
    useFetchDocument,
    useFetchAllDocuments,
    useDeleteDocument,
    DocumentResponse,
    useDocDownloadDocument,
} from "@/hooks/query-hooks";
import { linkify } from "@/utils/linkify";
import { toast } from "react-toastify";

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

function Documents() {
    const { id } = useParams();
    const { data: document, isLoading: isDocumentLoading } = useFetchDocument(id || "");
    const { data: allDocuments, isLoading: isAllDocumentsLoading } = useFetchAllDocuments();
    const deleteDocumentMutation = useDeleteDocument();
    const { mutate: downloadDocument } = useDocDownloadDocument();

    const [documents, setDocuments] = useState<DocumentResponse[] | undefined>(undefined);
    const [filteredDocuments, setFilteredDocuments] = useState<DocumentResponse[]>([]);
    const [docSearchQuery, setDocSearchQuery] = useState<string>("");
    const [selectedDoc, setSelectedDoc] = useState<DocumentResponse | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const [modalType, setModalType] = useState<'download' | 'delete' | null>(null);
    const [expandedDescriptions, setExpandedDescriptions] = useState<{ [key: string]: boolean }>({});
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
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);
    const categoryFilterRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (categoryFilterRef.current && !categoryFilterRef.current.contains(event.target as Node)) {
                setIsCategoryFilterOpen(false);
            }
        };

        if (typeof window !== 'undefined') {
            window.document.addEventListener('mousedown', handleClickOutside);
            return () => {
                window.document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, []);

    const keyCloakInitialized = useAuthenticationState((state) => state.keyCloakInitialized);
    const isAdmin = keyCloakInitialized.hasResourceRole("admin", "admin-cli");

    useEffect(() => {
        if (allDocuments?.results) {
            const filteredDocs = allDocuments.results.filter(doc =>
                doc.files && doc.files.length > 0
            );
            setDocuments(filteredDocs);
            setFilteredDocuments(filteredDocs);
        }
    }, [allDocuments]);

    useEffect(() => {
        if (document) {
            if (document.files && document.files.length > 0) {
                setDocuments(prev => {
                    if (!prev) return [document];
                    const exists = prev.some(doc => doc.id === document.id);
                    return exists ? prev : [...prev, document];
                });
                setFilteredDocuments(prev => {
                    if (!prev) return [document];
                    const exists = prev.some(doc => doc.id === document.id);
                    return exists ? prev : [...prev, document];
                });
            }
        }
    }, [document]);

    useEffect(() => {
        if (!documents) return;

        if (docSearchQuery.trim() === "") {
            setFilteredDocuments(documents);
        } else {
            const query = docSearchQuery.toLowerCase();
            const filtered = documents.filter(
                (doc) =>
                    (doc.title ?? "").toLowerCase().includes(query) ||
                    (doc.description ?? "").toLowerCase().includes(query) ||
                    (doc.files?.some((file) => file.fileName.toLowerCase().includes(query)) ?? false)
            );
            setFilteredDocuments(filtered);
        }
    }, [docSearchQuery, documents]);

    const uniqueCategories = useMemo(() => {
        const categories = new Set<string>();
        documents?.forEach(doc => {
            doc.documentCategories?.forEach(category => categories.add(category));
        });
        return Array.from(categories).sort();
    }, [documents]);

    useEffect(() => {
        if (!documents) return;

        if (selectedCategory) {
            const filtered = documents.filter(doc =>
                doc.documentCategories?.includes(selectedCategory)
            );
            setFilteredDocuments(filtered);
        } else {
            setFilteredDocuments(documents);
        }
    }, [selectedCategory, documents]);

    const toggleDescription = useCallback((id: string) => {
        setExpandedDescriptions((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    }, []);

    const handleDocSearch = (e: React.FormEvent) => {
        e.preventDefault();
    };

    const showAlert = (title: string, message: string, onConfirm: () => void, type: 'warning' | 'danger' | 'info' = 'warning') => {
        setAlertModal({
            isOpen: true,
            title,
            message,
            onConfirm: () => {
                onConfirm();
                setAlertModal(prev => ({ ...prev, isOpen: false }));
            },
            type
        });
    };

    const handleDeleteSelected = () => {
        if (!selectedDoc || selectedFiles.length === 0) {
            toast.info("No files selected for delete");
            return;
        }

        const isAllFilesSelected = selectedDoc.files?.length === selectedFiles.length;

        if (isAllFilesSelected) {
            showAlert(
                'Delete Document Record',
                '<strong>⚠️ Warning: This action will permanently delete all documents and remove the record from the system. This cannot be undone.</strong> Are you sure you want to proceed?',
                async () => {
                    setIsDeleting(true);
                    try {
                        await deleteDocumentMutation.mutateAsync({ id: selectedDoc.id, fileIds: selectedFiles });
                        setDocuments(prev => prev?.filter(doc => doc.id !== selectedDoc.id) || []);
                        setFilteredDocuments(prev => prev.filter(doc => doc.id !== selectedDoc.id));
                        setSelectedDoc(null);
                        setModalType(null);
                        toast.success("Document record removed successfully");
                    } catch (error) {
                        toast.error("Failed to delete selected files");
                        console.error("Error deleting selected files:", error);
                    } finally {
                        setIsDeleting(false);
                    }
                },
                'danger'
            );
        } else {
            showAlert(
                'Delete Files',
                `Are you sure you want to delete ${selectedFiles.length} selected file(s)?`,
                async () => {
                    setIsDeleting(true);
                    try {
                        await deleteDocumentMutation.mutateAsync({ id: selectedDoc.id, fileIds: selectedFiles });
                        const updatedFiles = selectedDoc.files?.filter(
                            (file) => !selectedFiles.includes(file.fileId)
                        ) || [];
                        const updatedDoc: DocumentResponse = {
                            ...selectedDoc,
                            files: updatedFiles
                        };
                        setSelectedDoc(updatedDoc);
                        setDocuments((prev) =>
                            prev?.map((doc) => (doc.id === updatedDoc.id ? updatedDoc : doc))
                        );
                        setFilteredDocuments((prev) =>
                            prev.map((doc) => (doc.id === updatedDoc.id ? updatedDoc : doc))
                        );
                        toast.success("Selected files deleted successfully");
                    } catch (error) {
                        toast.error("Failed to delete selected files");
                        console.error("Error deleting selected files:", error);
                    } finally {
                        setIsDeleting(false);
                    }
                },
                'warning'
            );
        }
    };

    const handleDownloadSelected = () => {
        if (selectedFiles.length === 0) {
            toast.info("No files selected for download");
            return;
        }

        const isAllFilesSelected = selectedDoc?.files?.length === selectedFiles.length;

        if (isAllFilesSelected) {
            showAlert(
                'Download All Files',
                `<strong>📥 You are about to download all ${selectedDoc?.files?.length} file(s) under this record.</strong><br><span style="font-size: 0.9em; color: #666; font-style: italic;">Note: This may take a few moments to complete</span>`,
                () => {
                    setIsDownloading(true);
                    Promise.all(
                        selectedFiles.map((fileId) => {
                            const file = selectedDoc?.files?.find((f) => f.fileId === fileId);
                            if (file) {
                                return downloadDocument({ fileId: file.fileId, fileName: file.fileName });
                            }
                            return Promise.resolve();
                        })
                    ).finally(() => {
                        setIsDownloading(false);
                    });
                },
                'info'
            );
        } else {
            setIsDownloading(true);
            Promise.all(
                selectedFiles.map((fileId) => {
                    const file = selectedDoc?.files?.find((f) => f.fileId === fileId);
                    if (file) {
                        return downloadDocument({ fileId: file.fileId, fileName: file.fileName });
                    }
                    return Promise.resolve();
                })
            ).finally(() => {
                setIsDownloading(false);
            });
        }
    };

    const handleDownloadAll = () => {
        if (!selectedDoc?.files) return;

        setSelectedFiles(selectedDoc.files.map(file => file.fileId));

        showAlert(
            'Download All Files',
            `<strong>📥 You are about to download all ${selectedDoc.files.length} file(s) under this record.</strong><br><span style="font-size: 0.9em; color: #666; font-style: italic;">Note: This may take a few moments to complete</span>`,
            () => {
                selectedDoc.files?.forEach(file => {
                    downloadDocument({ fileId: file.fileId, fileName: file.fileName });
                });
            },
            'info'
        );
    };

    const docTable = useMemo(() => {
        if (filteredDocuments.length === 0) {
            return (
                <div className="text-center p-8">
                    <p className="text-blue-600 mb-4">
                        No documents with files found
                    </p>
                    {isAdmin && (
                        <Link
                            to="/document/new"
                            className="text-blue-500 hover:underline"
                        >
                            Create a new document
                        </Link>
                    )}
                </div>
            );
        }

        return (
            <table className="w-full border-collapse text-sm shadow-md rounded-lg">
                <thead className="bg-gradient-to-r from-blue-400 to-blue-600 text-white">
                    <tr>
                        <th className="py-3 px-4 border">SL No</th>
                        <th className="py-3 px-4 border text-left">Title</th>
                        <th className="py-3 px-4 border text-left w-1/3">Description</th>
                        <th className="py-3 px-4 border text-left">
                            <div className="flex items-center justify-between">
                                <span>Category</span>
                                <div className="relative" ref={categoryFilterRef}>
                                    <button
                                        onClick={() => setIsCategoryFilterOpen(!isCategoryFilterOpen)}
                                        className={`p-1 m-2 rounded-full hover:bg-blue-500 transition-colors ${selectedCategory ? 'bg-blue-500' : ''}`}
                                        title="Filter by category"
                                    >
                                        <FontAwesomeIcon icon={faFilter} className="w-4 h-4" />
                                    </button>
                                    {isCategoryFilterOpen && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-50 border border-gray-200">
                                            <div className="p-2">
                                                <div className="mb-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedCategory(null);
                                                            setIsCategoryFilterOpen(false);
                                                        }}
                                                        className={`w-full text-left px-3 py-1.5 rounded-md text-sm hover:bg-blue-50 ${!selectedCategory ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700'}`}
                                                    >
                                                        All Categories
                                                    </button>
                                                </div>
                                                <div className="max-h-48 overflow-y-auto">
                                                    {uniqueCategories.map((category) => (
                                                        <button
                                                            key={category}
                                                            onClick={() => {
                                                                setSelectedCategory(category);
                                                                setIsCategoryFilterOpen(false);
                                                            }}
                                                            className={`w-full text-left px-3 py-1.5 rounded-md text-sm hover:bg-blue-50 ${selectedCategory === category ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700'}`}
                                                        >
                                                            {category}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </th>
                        <th className="py-3 px-4 border text-left">Files</th>
                        <th className="py-3 px-4 border text-center">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredDocuments.map((doc, index) => (
                        <tr
                            key={doc.id}
                            className={`border border-gray-300 transition ${(!doc.files || doc.files.length === 0)
                                ? "bg-gray-100 hover:bg-gray-200"
                                : "hover:bg-blue-50"
                                }`}
                        >
                            <td className="py-2 px-4 text-center border">{index + 1}</td>
                            <td className="py-2 px-4 border">{doc.title || "Untitled"}</td>
                            <td className="py-2 px-4 border">
                                {doc.description ? (
                                    <div className="relative">
                                        <div
                                            className={`overflow-hidden transition-all ${expandedDescriptions[doc.id] ? "max-h-[1000px]" : "max-h-20"}`}
                                            dangerouslySetInnerHTML={{ __html: linkify(doc.description) }}
                                        />
                                        <button
                                            onClick={() => toggleDescription(doc.id)}
                                            className="text-blue-500 hover:underline mt-1"
                                        >
                                            {expandedDescriptions[doc.id] ? "Show less" : "Show more"}
                                        </button>
                                    </div>
                                ) : (
                                    <span className="text-gray-400">No description</span>
                                )}
                            </td>
                            <td className="py-2 px-4 border">
                                {doc.documentCategories && doc.documentCategories.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                        {doc.documentCategories.map((category, index) => (
                                            <span
                                                key={index}
                                                className="bg-blue-100 px-2 py-1 rounded-md text-xs text-blue-800 font-medium"
                                            >
                                                {category}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-gray-400">No category</span>
                                )}
                            </td>
                            <td className="py-2 px-4 border">
                                {doc.files && doc.files.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                        {doc.files.map((file) => (
                                            <span
                                                key={file.fileId}
                                                className="bg-indigo-100 px-2 py-1 rounded-md text-xs text-indigo-800 font-medium max-w-[400px] truncate inline-block"
                                                title={file.fileName}
                                            >
                                                {file.fileName}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-gray-400">No files</span>
                                )}
                            </td>
                            <td className="py-2 px-4 border text-center">
                                <div className="flex justify-center space-x-2">
                                    <button
                                        onClick={() => {
                                            setSelectedDoc(doc);
                                            setModalType('download');
                                            setSelectedFiles([]);
                                        }}
                                        className="text-blue-500 hover:text-blue-700 px-2"
                                        title="Download Files"
                                    >
                                        <FontAwesomeIcon icon={faDownload} />
                                    </button>
                                    {isAdmin && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    setSelectedDoc(doc);
                                                    setModalType('delete');
                                                    setSelectedFiles([]);
                                                }}
                                                className="text-red-500 hover:text-red-700 px-2"
                                                title="Delete Files"
                                            >
                                                <FontAwesomeIcon icon={faTrash} />
                                            </button>
                                            <Link
                                                to={`/document/edit/${doc.id}`}
                                                className="text-yellow-500 hover:text-yellow-700 px-2"
                                                title="Edit Document"
                                            >
                                                <FontAwesomeIcon icon={faPen} />
                                            </Link>
                                        </>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    }, [filteredDocuments, isAdmin, expandedDescriptions, toggleDescription, uniqueCategories, selectedCategory, isCategoryFilterOpen]);

    const fileActionsModal = selectedDoc && modalType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-3xl max-h-[80vh] flex flex-col">
                <div className="p-6 border-b">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                            <h3 className="text-lg font-medium mb-2">
                                {modalType === 'download' ? 'Download Files' : 'Delete Files'}
                            </h3>
                            <h4 className="text-base font-normal text-gray-900 mb-1 bg-indigo-50 px-3 py-1.5 rounded-md inline-block">
                                <span className="font-bold">Title:</span> <span className="text-gray-800">{selectedDoc.title || 'Untitled Document'}</span>
                            </h4>
                        </div>
                        <button
                            onClick={() => {
                                setSelectedDoc(null);
                                setModalType(null);
                                setSelectedFiles([]);
                            }}
                            className="text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none ml-4"
                            aria-label="Close modal"
                        >
                            &times;
                        </button>
                    </div>

                    {modalType === 'download' && selectedDoc.files && selectedDoc.files.length > 0 && (
                        <div className="flex justify-end items-center space-x-4">
                            {selectedFiles.length > 0 && (
                                <button
                                    onClick={() => setSelectedFiles([])}
                                    className="text-sm text-gray-600 hover:text-gray-800 font-medium"
                                >
                                    Unselect All
                                </button>
                            )}
                            <button
                                onClick={handleDownloadAll}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                                Download All
                            </button>
                        </div>
                    )}

                    {modalType === 'delete' && selectedDoc.files && selectedDoc.files.length > 0 && (
                        <div className="flex justify-between items-center">
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={selectedFiles.length === selectedDoc.files.length}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedFiles(selectedDoc.files?.map(file => file.fileId) || []);
                                        } else {
                                            setSelectedFiles([]);
                                        }
                                    }}
                                    className="mr-2 h-4 w-4 text-blue-600 rounded"
                                />
                                <span className="text-sm font-medium">Select All</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-3">
                        {selectedDoc.files && selectedDoc.files.length > 0 ? (
                            selectedDoc.files.map((file) => (
                                <div key={file.fileId} className="flex items-center justify-between p-2 border rounded">
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedFiles.includes(file.fileId)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedFiles((prev) => [...prev, file.fileId]);
                                                } else {
                                                    setSelectedFiles((prev) => prev.filter((id) => id !== file.fileId));
                                                }
                                            }}
                                            className="mr-3 h-4 w-4 text-blue-600 rounded"
                                        />
                                        <span className="text-sm truncate max-w-xs" title={file.fileName}>
                                            {file.fileName}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p>No files available for this document.</p>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t bg-white">
                    <div className="flex justify-end space-x-3">
                        {modalType === 'download' && (
                            <button
                                onClick={handleDownloadSelected}
                                disabled={selectedFiles.length === 0 || isDownloading}
                                className={`px-3 py-1 rounded flex items-center space-x-2 ${selectedFiles.length === 0 || isDownloading
                                    ? 'bg-gray-300 text-gray-400 cursor-not-allowed'
                                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                                    }`}
                            >
                                {isDownloading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>Downloading...</span>
                                    </>
                                ) : (
                                    <span>Download Selected</span>
                                )}
                            </button>
                        )}
                        {modalType === 'delete' && isAdmin && (
                            <button
                                onClick={handleDeleteSelected}
                                disabled={selectedFiles.length === 0 || isDeleting}
                                className={`px-3 py-1 rounded flex items-center space-x-2 ${selectedFiles.length === 0 || isDeleting
                                    ? 'bg-gray-300 text-gray-400 cursor-not-allowed'
                                    : 'bg-red-500 hover:bg-red-600 text-white'
                                    }`}
                            >
                                {isDeleting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>Deleting...</span>
                                    </>
                                ) : (
                                    <span>Delete Selected</span>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    if (isDocumentLoading || isAllDocumentsLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-slate-50">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-300 border-t-blue-400 rounded-full animate-spin mx-auto"></div>
                    <p>Loading Documents...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200">
                <Navigation />
                <div className="px-8 py-6">
                    <div className="mb-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800">Documents Management</h2>
                                <p className="text-slate-500">Manage your documents with advanced filtering and search</p>
                            </div>
                            <div className="text-sm text-slate-600 bg-slate-100 px-3 py-2 rounded-lg">
                                <span className="font-medium">{filteredDocuments.length}</span> documents found
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center mb-6">
                        <form onSubmit={handleDocSearch} className="w-[300px]">
                            <input
                                type="text"
                                placeholder="Search documents..."
                                value={docSearchQuery}
                                onChange={(e) => setDocSearchQuery(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 placeholder-slate-400"
                            />
                        </form>

                        {isAdmin && (
                            <Link
                                to="/document/new"
                                className="px-4 py-2 bg-indigo-600/95 text-white rounded-lg shadow-md hover:bg-indigo-700 transition"
                            >
                                + Add New Document
                            </Link>
                        )}
                    </div>

                    <div className="overflow-x-auto">{docTable}</div>
                </div>
            </div>
            {fileActionsModal}
            <AlertModal
                isOpen={alertModal.isOpen}
                title={alertModal.title}
                message={alertModal.message}
                onConfirm={alertModal.onConfirm}
                onCancel={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                type={alertModal.type}
            />
        </div>
    );
}

export default Documents; 