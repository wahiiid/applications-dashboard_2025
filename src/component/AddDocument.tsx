import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CloudUpload, ArrowLeft, X } from "lucide-react";
import { useUploadDocument } from "../hooks/query-hooks";
import ReactQuill from "react-quill";

function AddDocument() {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [documentCategories, setDocumentCategories] = useState<string[]>([]);
    const [currentCategory, setCurrentCategory] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const uploadDocumentMutation = useUploadDocument();

    // Add beforeunload event handler
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [hasUnsavedChanges]);

    // Update hasUnsavedChanges when form data changes
    useEffect(() => {
        setHasUnsavedChanges(
            title !== '' ||
            description !== '' ||
            selectedFiles.length > 0 ||
            documentCategories.length > 0
        );
    }, [title, description, selectedFiles, documentCategories]);

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files);
            handleFileSelection(files);
        }
    };

    const handleFileSelection = (files: File[]) => {
        const validFiles = files.filter(file => file.size <= 200 * 1024 * 1024); // 200MB limit
        if (validFiles.length !== files.length) {
            setError("Some files were too large (max 200MB) and were not added.");
        } else {
            setError(null);
        }
        setSelectedFiles(prev => [...prev, ...validFiles]);
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            handleFileSelection(files);
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (selectedFiles.length === 0) {
            setError("Please select at least one file to upload.");
            return;
        }

        // Calculate total size
        const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
        if (totalSize > 200 * 1024 * 1024) {
            setError("Total files size exceeds 200MB limit. Please upload smaller files.");
            return;
        }

        setIsSubmitting(true);

        try {
            await uploadDocumentMutation.mutateAsync({
                files: selectedFiles,
                title,
                description,
                documentCategories
            });

            // Reset form and navigate on success
            setTitle("");
            setDescription("");
            setSelectedFiles([]);
            setDocumentCategories([]);
            setHasUnsavedChanges(false);
            navigate("/documents");
        } catch (err) {
            let errorMessage = "Failed to upload documents. Please try again.";
            if (err instanceof Error) {
                errorMessage = err.message;
            }
            setError(errorMessage);
            console.error("Error uploading documents:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDiscard = () => {
        navigate("/documents");
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-100 to-white p-8 flex items-center justify-center">
            <div className="max-w-3xl w-full mx-auto bg-white bg-opacity-80 backdrop-filter backdrop-blur-lg rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                <header className="px-8 pt-6 pb-4 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                            <button
                                onClick={handleDiscard}
                                className="mr-2 text-gray-600 hover:text-gray-800 transition-colors"
                            >
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                            Add New Document
                        </h1>
                    </div>
                </header>

                <form onSubmit={handleSubmit} className="px-8 pt-6 pb-8">
                    {error && (
                        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
                            {error}
                        </div>
                    )}

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Title *
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-gray-50"
                            required
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Document Categories *
                        </label>
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={currentCategory}
                                    onChange={(e) => setCurrentCategory(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (currentCategory.trim()) {
                                                setDocumentCategories([...documentCategories, currentCategory.trim()]);
                                                setCurrentCategory('');
                                            }
                                        }
                                    }}
                                    placeholder="Add a category and press Enter"
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-gray-50"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (currentCategory.trim()) {
                                            setDocumentCategories([...documentCategories, currentCategory.trim()]);
                                            setCurrentCategory('');
                                        }
                                    }}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                    Add
                                </button>
                            </div>
                            {documentCategories.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {documentCategories.map((category, index) => (
                                        <span
                                            key={index}
                                            className="bg-indigo-100 px-3 py-1 rounded-full text-sm text-indigo-800 flex items-center gap-2"
                                        >
                                            {category}
                                            <button
                                                type="button"
                                                onClick={() => setDocumentCategories(categories => categories.filter((_, i) => i !== index))}
                                                className="text-indigo-600 hover:text-indigo-800"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description *
                        </label>
                        <ReactQuill
                            theme="snow"
                            value={description}
                            onChange={setDescription}
                            modules={{
                                toolbar: [
                                    [{ header: [1, 2, 3, 4, false] }],
                                    ["bold", "italic", "underline", "strike"],
                                    [{ color: [] }, { background: [] }],
                                    [{ list: "ordered" }, { list: "bullet" }],
                                    ["link", "image"],
                                    ["clean"],
                                ],
                            }}
                            placeholder="Describe your document..."
                            className="w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-gray-50"
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Upload Files *
                        </label>
                        <div
                            className={`border-2 border-dashed ${isDragging ? 'border-indigo-500' : 'border-gray-300'} rounded-2xl p-6 text-center hover:border-indigo-300 transition-colors cursor-pointer bg-gray-50`}
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <CloudUpload className="w-12 h-12 text-indigo-500 mx-auto mb-3 animate-pulse" />
                            <p className="text-gray-600 mb-1 font-medium">
                                Drag & Drop files here
                            </p>
                            <p className="text-gray-400 text-sm mb-4">
                                or click to browse
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                onChange={handleFileInputChange}
                                className="hidden"
                            />
                            <p className="text-gray-500 text-sm">
                                (max 200 MB per file)
                            </p>
                        </div>

                        {selectedFiles.length > 0 && (
                            <div className="mt-4 space-y-2">
                                {selectedFiles.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 shadow-sm transition-transform transform hover:scale-105">
                                        <div className="flex items-center space-x-2 min-w-0">
                                            <span
                                                className="text-gray-700 truncate"
                                                style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                                title={file.name}
                                            >
                                                {file.name}
                                            </span>
                                            <span className="text-gray-500 text-xs">({Math.round(file.size / 1024)} KB)</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeFile(index)}
                                            className="text-red-500 hover:text-red-700 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={handleDiscard}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            disabled={isSubmitting}
                        >
                            Discard
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isSubmitting || !title || !description || selectedFiles.length === 0 || documentCategories.length === 0}
                        >
                            {isSubmitting ? 'Uploading...' : 'Save Document'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddDocument;